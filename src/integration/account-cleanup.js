import { configureServices } from '../services/adapter.js';
import { getFirebase } from './firebase-client.js';

const OWNED_COLLECTIONS = ['results', 'notifications', 'supportTickets', 'reports', 'dataExportRequests'];

async function deleteOwnedDocs(db, collection, uid) {
  while (true) {
    const snap = await db.collection(collection).where('userId', '==', uid).limit(450).get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
}

export async function registerAccountCleanup() {
  const sdk = await getFirebase();
  if (!sdk) return;
  configureServices({
    auth: {
      async deleteAccount() {
        const user = sdk.auth.currentUser;
        if (!user) throw Object.assign(new Error('Authentication required.'), { code: 'unauthorized' });
        if (user.uid === 'lmUB6IdhuaOlHjzkqBEyoNkE7PH2') throw Object.assign(new Error('The administrator account cannot be deleted from this workflow.'), { code: 'permission-denied' });
        const uid = user.uid;
        for (const collection of OWNED_COLLECTIONS) await deleteOwnedDocs(sdk.db, collection, uid);
        await Promise.all([
          sdk.db.collection('academicProfiles').doc(uid).delete().catch(() => {}),
          sdk.db.collection('userPreferences').doc(uid).delete().catch(() => {}),
          sdk.db.collection('users').doc(uid).delete(),
        ]);
        await user.delete();
        return { ok: true };
      },
    },
  });
}
