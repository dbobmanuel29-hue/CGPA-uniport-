import { configureServices, getServiceAdapter } from '../services/adapter.js';
import { getFirebase } from './firebase-client.js';

const OWNER_ADMIN_UID = 'lmUB6IdhuaOlHjzkqBEyoNkE7PH2';

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

async function deleteOwnAccountThroughTrustedBackend(user) {
  const token = await user.getIdToken(true);
  const response = await fetch('/api/admin/delete-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ studentId: user.uid }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) {
    throw Object.assign(new Error(payload.error || 'Your account could not be completely deleted.'), {
      code: payload.code || `server/delete-user-${response.status}`,
    });
  }
  return payload;
}

export async function registerAccountDeletionFix() {
  const originalDeleteAccount = getServiceAdapter('auth', 'deleteAccount');
  if (typeof originalDeleteAccount !== 'function') return false;

  configureServices({
    auth: {
      deleteAccount: async ({ currentPassword = '' } = {}) => {
        const firebase = await getFirebase();
        const user = firebase?.auth?.currentUser;

        if (!user) throw Object.assign(new Error('Authentication required.'), { code: 'unauthorized' });
        if (user.uid === OWNER_ADMIN_UID) {
          throw Object.assign(new Error('The owner administrator account cannot be deleted from student settings.'), { code: 'auth/owner-account-protected' });
        }

        // Reauthenticate first, then let the trusted Vercel endpoint delete
        // the user's Firestore data and Firebase Authentication identity.
        // This avoids client-side Firestore permission failures and ensures
        // Authentication deletion happens with Admin SDK privileges.
        await reauthenticate(user, currentPassword);
        const result = await deleteOwnAccountThroughTrustedBackend(user);

        // The Admin SDK has already deleted the Auth identity, so the browser
        // must only clear its local session; calling user.delete() again would
        // incorrectly produce a second Auth deletion error.
        await firebase.auth.signOut();
        return result;
      },
    },
  });

  return true;
}
