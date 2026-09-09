const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();
const auth = getAuth();
const bootstrapAdminSecret = defineSecret('CGPA_BOOTSTRAP_ADMIN_SECRET');
const OWNER_ADMIN_UID = 'lmUB6IdhuaOlHjzkqBEyoNkE7PH2';
const USER_COLLECTIONS = ['academicProfiles', 'results', 'notifications', 'supportTickets', 'reports', 'transactions', 'dataExportRequests', 'publicSupportRequests'];
const INACTIVE_MS = 365 * 24 * 60 * 60 * 1000;

function isAdmin(request) {
  return !!request.auth && (request.auth.uid === OWNER_ADMIN_UID || request.auth.token?.admin === true || request.auth.token?.role === 'admin');
}

async function enforceRateLimit(request, { name, limit, windowSeconds }) {
  const uid = request.auth?.uid || 'anonymous';
  const ip = request.rawRequest?.ip || request.rawRequest?.headers?.['x-forwarded-for'] || 'unknown';
  const identity = String(uid === 'anonymous' ? ip : uid).split(',')[0].trim().replace(/[^a-zA-Z0-9:_-]/g, '_').slice(0, 120);
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const ref = db.collection('_rateLimits').doc(`${name}:${identity}:${bucket}`);
  await db.runTransaction(async transaction => {
    const snap = await transaction.get(ref);
    const count = snap.exists ? Number(snap.data()?.count || 0) : 0;
    if (count >= limit) throw new HttpsError('resource-exhausted', 'Too many requests. Please try again later.');
    transaction.set(ref, { count: count + 1, name, identity, bucket, expiresAt: new Date((bucket + 1) * windowSeconds * 1000), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
}

async function deleteUserFirestoreData(uid) {
  for (const collection of USER_COLLECTIONS) {
    while (true) {
      const snap = await db.collection(collection).where('userId', '==', uid).limit(450).get();
      if (snap.empty) break;
      const batch = db.batch();
      snap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
  }
  for (const collection of ['users', 'academicProfiles', 'userPreferences', 'subscriptions']) {
    const ref = db.collection(collection).doc(uid);
    const snap = await ref.get();
    if (snap.exists) await ref.delete();
  }
}

exports.deleteStudentAccount = onCall(async request => {
  await enforceRateLimit(request, { name: 'deleteStudentAccount', limit: 20, windowSeconds: 15 * 60 });
  if (!isAdmin(request)) throw new HttpsError('permission-denied', 'Administrator access required.');
  const uid = String(request.data?.uid || '').trim();
  if (!uid || uid === OWNER_ADMIN_UID) throw new HttpsError('permission-denied', 'The administrator account is protected.');
  await deleteUserFirestoreData(uid);
  try { await auth.deleteUser(uid); } catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
  return { ok: true, uid };
});

exports.purgeInactiveStudents = onSchedule({ schedule: 'every day 03:00', timeZone: 'Africa/Lagos' }, async () => {
  const cutoff = Date.now() - INACTIVE_MS;
  const pageSize = 1000;
  let pageToken;
  let removed = 0;
  do {
    const page = await auth.listUsers(pageSize, pageToken);
    for (const user of page.users) {
      if (user.uid === OWNER_ADMIN_UID) continue;
      const lastSignIn = Date.parse(user.metadata?.lastSignInTime || user.metadata?.creationTime || '') || 0;
      if (lastSignIn && lastSignIn < cutoff) {
        await deleteUserFirestoreData(user.uid);
        try { await auth.deleteUser(user.uid); } catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
        removed += 1;
      }
    }
    pageToken = page.pageToken;
  } while (pageToken);
  console.log(`Inactive student cleanup removed ${removed} account(s).`);
  return null;
});

exports.grantAdminRole = onCall({ secrets: [bootstrapAdminSecret] }, async request => {
  await enforceRateLimit(request, { name: 'grantAdminRole', limit: 5, windowSeconds: 15 * 60 });
  const secret = bootstrapAdminSecret.value();
  if (!secret || request.data?.secret !== secret) throw new HttpsError('permission-denied', 'Invalid bootstrap credentials.');
  const email = String(request.data?.email || '').trim().toLowerCase();
  if (!email) throw new HttpsError('invalid-argument', 'An email address is required.');
  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, { admin: true, role: 'admin' });
  await db.collection('users').doc(user.uid).set({ role: 'admin', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { ok: true, uid: user.uid };
});

exports.auditAdminChanges = onDocumentWritten('{collection}/{documentId}', async event => {
  const collection = event.params.collection;
  if (collection === 'auditLogs') return null;
  const after = event.data?.after?.data() || null;
  const before = event.data?.before?.data() || null;
  const actorId = after?.updatedBy || after?.createdBy || before?.updatedBy || before?.createdBy || null;
  if (!actorId) return null;
  const action = !before && after ? 'create' : before && !after ? 'delete' : 'update';
  await db.collection('auditLogs').add({ actorId, action, resource: collection, resourceId: event.params.documentId, status: 'success', createdAt: FieldValue.serverTimestamp() });
  return null;
});

exports.processDataExportRequest = onDocumentWritten('dataExportRequests/{requestId}', async event => {
  const after = event.data?.after?.data();
  if (!after || after.status !== 'requested') return null;
  await event.data.after.ref.update({ status: 'queued', queuedAt: FieldValue.serverTimestamp() });
  return null;
});

exports.processNotificationCampaign = onDocumentWritten('notificationCampaigns/{campaignId}', async event => {
  const after = event.data?.after?.data();
  if (!after || after.status !== 'accepted') return null;
  const users = await db.collection('users').where('accountStatus', '==', 'active').get();
  const batch = db.batch();
  users.docs.slice(0, 500).forEach(user => {
    const ref = db.collection('notifications').doc();
    batch.set(ref, { userId: user.id, title: after.title, message: after.message, type: after.type || 'system', read: false, createdAt: FieldValue.serverTimestamp() });
  });
  await batch.commit();
  await event.data.after.ref.update({ status: 'sent', processedAt: FieldValue.serverTimestamp(), recipientCount: Math.min(users.size, 500) });
  return null;
});
