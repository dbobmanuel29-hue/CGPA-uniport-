import { configureServices, getServiceAdapter } from '../services/adapter.js';
import { getFirebase } from './firebase-client.js';

const OWNER_ADMIN_UID = 'lmUB6IdhuaOlHjzkqBEyoNkE7PH2';

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
      deleteAccount: async () => {
        const firebase = await getFirebase();
        const user = firebase?.auth?.currentUser;

        if (!user) throw Object.assign(new Error('Authentication required.'), { code: 'unauthorized' });
        if (user.uid === OWNER_ADMIN_UID) {
          throw Object.assign(new Error('The owner administrator account cannot be deleted from student settings.'), { code: 'auth/owner-account-protected' });
        }

        // No password or second Google prompt. The trusted backend verifies
        // the current Firebase ID token and performs the privileged deletion.
        const result = await deleteOwnAccountThroughTrustedBackend(user);
        await firebase.auth.signOut();
        return result;
      },
    },
  });

  return true;
}
