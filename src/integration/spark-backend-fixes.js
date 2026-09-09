import { configureServices } from '../services/adapter.js';
import { getFirebase } from './firebase-client.js';

const OWNER_ADMIN_UID = 'lmUB6IdhuaOlHjzkqBEyoNkE7PH2';
const USER_DATA_COLLECTIONS = ['academicProfiles', 'results', 'notifications', 'supportTickets', 'reports', 'dataExportRequests', 'publicSupportRequests'];

async function requireUser() {
  const sdk = await getFirebase();
  if (!sdk?.auth?.currentUser) throw Object.assign(new Error('Authentication required.'), { code: 'unauthorized' });
  return sdk;
}
async function requireAdmin() {
  const sdk = await requireUser();
  const user = sdk.auth.currentUser;
  if (user.uid !== OWNER_ADMIN_UID) {
    const token = await user.getIdTokenResult(true);
    if (token.claims.admin !== true && token.claims.role !== 'admin') throw Object.assign(new Error('Administrator access required.'), { code: 'permission-denied' });
  }
  return sdk;
}
async function deleteDocs(db, collection, uid) {
  while (true) {
    const snap = await db.collection(collection).where('userId', '==', uid).limit(450).get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
}
function rows(snapshot) { return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); }

async function sendNotification(payload) {
  const { db, auth } = await requireAdmin();
  const title = String(payload.title || '').trim();
  const message = String(payload.message || '').trim();
  if (!title || message.length < 5) throw Object.assign(new Error('Enter a notification title and message.'), { code: 'validation/notification' });
  const audience = payload.audience || 'all_students';
  let recipients = [];
  if (audience === 'faculty') {
    if (!payload.facultyId) throw Object.assign(new Error('Select a faculty before sending.'), { code: 'validation/faculty' });
    const profiles = await db.collection('academicProfiles').where('facultyId', '==', payload.facultyId).get();
    recipients = profiles.docs.map(doc => doc.id);
  } else {
    const users = await db.collection('users').get();
    recipients = users.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(user => user.id !== OWNER_ADMIN_UID && user.role !== 'admin' && user.accountStatus !== 'deleted').map(user => user.id);
  }
  const campaignRef = db.collection('notificationCampaigns').doc();
  const batch = db.batch();
  batch.set(campaignRef, { title, message, type: payload.type || 'announcement', audience, facultyId: payload.facultyId || '', priority: payload.priority || 'normal', status: 'sent', recipientCount: recipients.length, sentAt: window.firebase.firestore.FieldValue.serverTimestamp(), createdBy: auth.currentUser.uid, createdAt: window.firebase.firestore.FieldValue.serverTimestamp() });
  let count = 0;
  for (const uid of recipients.slice(0, 450)) {
    const ref = db.collection('notifications').doc();
    batch.set(ref, { userId: uid, title, message, type: payload.type || 'announcement', priority: payload.priority || 'normal', read: false, campaignId: campaignRef.id, createdAt: window.firebase.firestore.FieldValue.serverTimestamp() });
    count += 1;
  }
  await batch.commit();
  if (recipients.length > 450) {
    for (let offset = 450; offset < recipients.length; offset += 450) {
      const nextBatch = db.batch();
      for (const uid of recipients.slice(offset, offset + 450)) {
        const ref = db.collection('notifications').doc();
        nextBatch.set(ref, { userId: uid, title, message, type: payload.type || 'announcement', priority: payload.priority || 'normal', read: false, campaignId: campaignRef.id, createdAt: window.firebase.firestore.FieldValue.serverTimestamp() });
      }
      await nextBatch.commit();
      count += Math.min(450, recipients.length - offset);
    }
  }
  return { id: campaignRef.id, status: 'sent', recipientCount: count };
}

export async function registerSparkBackendFixes() {
  configureServices({
    admin: {
      async getDashboard() {
        const { db } = await requireAdmin();
        const usersSnap = await db.collection('users').get();
        const users = rows(usersSnap).filter(user => user.id !== OWNER_ADMIN_UID && user.role !== 'admin' && user.accountStatus !== 'deleted');
        const ticketsSnap = await db.collection('supportTickets').get();
        const tickets = rows(ticketsSnap);
        const recentStudents = [...users].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 5);
        return {
          stats: {
            totalStudents: users.length,
            activeStudents: users.filter(user => (user.accountStatus || 'active') === 'active').length,
            newStudents: users.filter(user => { const time = user.createdAt?.toDate ? user.createdAt.toDate().getTime() : Date.parse(user.createdAt || ''); return time && Date.now() - time < 30 * 86400000; }).length,
            verifiedAccounts: users.filter(user => user.emailVerified === true).length,
            supportRequests: tickets.filter(ticket => !['resolved', 'closed'].includes(ticket.status)).length,
          },
          charts: { userGrowth: [], registrations: [], activeUsers: [] },
          recentStudents,
          recentTickets: tickets.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 5),
          activity: [],
        };
      },
      async getStudents(filters = {}) {
        const { db } = await requireAdmin();
        const usersSnap = await db.collection('users').get();
        const profilesSnap = await db.collection('academicProfiles').get();
        const profiles = new Map(profilesSnap.docs.map(doc => [doc.id, doc.data()]));
        const [faculties, departments, programmes, levels] = await Promise.all([db.collection('faculties').get(), db.collection('departments').get(), db.collection('programmes').get(), db.collection('levels').get()]);
        const names = snap => new Map(snap.docs.map(doc => [doc.id, doc.data()?.name || doc.data()?.title || '']));
        const facultyMap = names(faculties), departmentMap = names(departments), programmeMap = names(programmes), levelMap = names(levels);
        let output = usersSnap.docs.map(doc => { const user = { id: doc.id, ...doc.data() }; const profile = profiles.get(doc.id) || {}; return { ...user, facultyName: facultyMap.get(profile.facultyId) || '', departmentName: departmentMap.get(profile.departmentId) || '', programmeName: programmeMap.get(profile.programmeId) || '', levelName: levelMap.get(profile.currentLevelId) || '', facultyId: profile.facultyId || '', departmentId: profile.departmentId || '', programmeId: profile.programmeId || '', levelId: profile.currentLevelId || '' }; }).filter(user => user.role !== 'admin' && user.accountStatus !== 'deleted');
        if (filters.status) output = output.filter(user => user.accountStatus === filters.status);
        if (filters.facultyId) output = output.filter(user => user.facultyId === filters.facultyId);
        return output;
      },
      async deleteStudent(studentId) {
        const { db } = await requireAdmin();
        const uid = String(studentId || '').trim();
        if (!uid || uid === OWNER_ADMIN_UID) throw Object.assign(new Error('The administrator account cannot be deleted.'), { code: 'permission-denied' });
        for (const collection of USER_DATA_COLLECTIONS) await deleteDocs(db, collection, uid);
        await db.collection('academicProfiles').doc(uid).delete().catch(() => {});
        await db.collection('userPreferences').doc(uid).delete().catch(() => {});
        await db.collection('users').doc(uid).set({ accountStatus: 'deleted', deletedAt: window.firebase.firestore.FieldValue.serverTimestamp(), updatedAt: window.firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
        return { ok: true, uid, mode: 'deactivated' };
      },
      async sendNotification(payload) { return sendNotification(payload); },
    },
    notification: {
      async subscribeToNotifications(callback) {
        const { db, auth } = await requireUser();
        const unsubscribe = db.collection('notifications').where('userId', '==', auth.currentUser.uid).onSnapshot(() => callback(), error => console.warn('Notification listener stopped.', error));
        return unsubscribe;
      },
    },
  });
}
