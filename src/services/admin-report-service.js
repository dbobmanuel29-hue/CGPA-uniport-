import { getFirebase } from '../integration/firebase-client.js';

const OWNER_ADMIN_UID = 'lmUB6IdhuaOlHjzkqBEyoNkE7PH2';

async function requireAdmin() {
  const sdk = await getFirebase();
  if (!sdk) throw Object.assign(new Error('Firebase is not configured.'), { code: 'BACKEND_NOT_CONNECTED' });
  const { auth, db } = sdk;
  const user = auth.currentUser;
  if (!user) throw Object.assign(new Error('Authentication required.'), { code: 'unauthorized' });
  if (user.uid === OWNER_ADMIN_UID) return { db, user };
  const account = await db.collection('users').doc(user.uid).get();
  if (account.exists && account.data()?.role === 'admin') return { db, user };
  const token = await user.getIdTokenResult(true);
  if (token.claims.admin === true || token.claims.role === 'admin') return { db, user };
  throw Object.assign(new Error('Administrator access required.'), { code: 'permission-denied' });
}

export const adminReportService = Object.freeze({
  async deleteReport(reportId) {
    if (!reportId) throw Object.assign(new Error('Report ID is required.'), { code: 'validation/report-delete' });
    const { db } = await requireAdmin();
    const ref = db.collection('reports').doc(reportId);
    const snap = await ref.get();
    if (!snap.exists) throw Object.assign(new Error('Report not found.'), { code: 'not-found/report' });
    await ref.delete();
    return { ok: true, id: reportId };
  }
});
