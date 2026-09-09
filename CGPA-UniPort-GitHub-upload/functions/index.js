const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

function isAdmin(request) {
  return !!request.auth && (request.auth.token?.admin === true || request.auth.token?.role === 'admin');
}

/**
 * Firestore-backed fixed-window limiter for callable functions.
 * The transaction makes the counter safe under concurrent requests.
 */
async function enforceRateLimit(request, { name, limit, windowSeconds }) {
  const uid = request.auth?.uid || 'anonymous';
  const ip = request.rawRequest?.ip || request.rawRequest?.headers?.['x-forwarded-for'] || 'unknown';
  const identity = String(uid === 'anonymous' ? ip : uid).split(',')[0].trim().replace(/[^a-zA-Z0-9:_-]/g, '_').slice(0, 120);
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const ref = db.collection('_rateLimits').doc(`${name}:${identity}:${bucket}`);

  await db.runTransaction(async transaction => {
    const snap = await transaction.get(ref);
    const count = snap.exists ? Number(snap.data()?.count || 0) : 0;
    if (count >= limit) {
      throw new HttpsError('resource-exhausted', 'Too many requests. Please try again later.');
    }
    transaction.set(ref, {
      count: count + 1,
      name,
      identity,
      bucket,
      expiresAt: new Date((bucket + 1) * windowSeconds * 1000),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
}

exports.grantAdminRole = onCall(async request => {
  await enforceRateLimit(request, { name: 'grantAdminRole', limit: 5, windowSeconds: 15 * 60 });
  const bootstrapSecret = process.env.CGPA_BOOTSTRAP_ADMIN_SECRET;
  if (!bootstrapSecret || request.data?.secret !== bootstrapSecret) throw new HttpsError('permission-denied', 'Invalid bootstrap credentials.');
  const email = String(request.data?.email || '').trim().toLowerCase();
  if (!email) throw new HttpsError('invalid-argument', 'An email address is required.');
  const user = await getAuth().getUserByEmail(email);
  await getAuth().setCustomUserClaims(user.uid, { admin: true, role: 'admin' });
  await db.collection('users').doc(user.uid).set({ role: 'admin', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { ok: true, uid: user.uid };
});

exports.auditAdminChanges = onDocumentWritten('{collection}/{documentId}', async event => {
  const collection = event.params.collection;
  const ignored = new Set(['auditLogs']);
  if (ignored.has(collection)) return null;
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
