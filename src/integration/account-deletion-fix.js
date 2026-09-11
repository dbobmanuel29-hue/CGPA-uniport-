import { configureServices, getServiceAdapter } from '../services/adapter.js';
import { getFirebase } from './firebase-client.js';

const OWNER_ADMIN_UID = 'lmUB6IdhuaOlHjzkqBEyoNkE7PH2';

async function deleteOwnedCollection(db, collectionName, uid) {
  const snapshot = await db.collection(collectionName).where('userId', '==', uid).get();
  const refs = snapshot.docs.map(doc => doc.ref);
  for (let start = 0; start < refs.length; start += 450) {
    const batch = db.batch();
    refs.slice(start, start + 450).forEach(ref => batch.delete(ref));
    await batch.commit();
  }
}

async function deleteOwnedData(db, uid) {
  for (const collectionName of ['results', 'notifications', 'supportTickets', 'reports', 'dataExportRequests', 'userPreferences']) {
    await deleteOwnedCollection(db, collectionName, uid);
  }
  await db.collection('academicProfiles').doc(uid).delete().catch(error => {
    if (error?.code !== 'not-found') throw error;
  });
  await db.collection('users').doc(uid).delete().catch(error => {
    if (error?.code !== 'not-found') throw error;
  });
}

async function reauthenticate(user, currentPassword = '') {
  const providerIds = (user.providerData || []).map(provider => provider.providerId);

  if (providerIds.includes('password')) {
    if (!currentPassword) {
      throw Object.assign(new Error('Enter your current password to permanently delete your account.'), { code: 'auth/delete-reauth-required' });
    }
    const credential = window.firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
    await user.reauthenticateWithCredential(credential);
    return;
  }

  if (providerIds.includes('google.com')) {
    const provider = new window.firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await user.reauthenticateWithPopup(provider);
    return;
  }

  throw Object.assign(new Error('Please sign in again before permanently deleting your account.'), { code: 'auth/delete-reauth-required' });
}

export async function registerAccountDeletionFix() {
  const originalDeleteAccount = getServiceAdapter('auth', 'deleteAccount');
  if (typeof originalDeleteAccount !== 'function') return false;

  configureServices({
    auth: {
      deleteAccount: async ({ currentPassword = '' } = {}) => {
        const firebase = await getFirebase();
        const user = firebase?.auth?.currentUser;
        const db = firebase?.db;

        if (!user || !db) throw Object.assign(new Error('Authentication required.'), { code: 'unauthorized' });
        if (user.uid === OWNER_ADMIN_UID) {
          throw Object.assign(new Error('The owner administrator account cannot be deleted from student settings.'), { code: 'auth/owner-account-protected' });
        }

        // Reauthenticate before deleting Firestore data. This prevents a
        // requires-recent-login failure from leaving the user half-deleted.
        await reauthenticate(user, currentPassword);
        await deleteOwnedData(db, user.uid);
        await originalDeleteAccount();
        return { ok: true, deleted: true };
      },
    },
  });

  return true;
}
