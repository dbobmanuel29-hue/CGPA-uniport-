import { configureServices, getServiceAdapter } from '../services/adapter.js';
import { getFirebase } from './firebase-client.js';

const OWNER_ADMIN_UID = 'lmUB6IdhuaOlHjzkqBEyoNkE7PH2';

export async function deleteCurrentUserAccount() {
  const firebase = await getFirebase();
  const user = firebase?.auth?.currentUser;

  if (!user) throw Object.assign(new Error('Authentication required.'), { code: 'unauthorized' });
  if (user.uid === OWNER_ADMIN_UID) {
    throw Object.assign(new Error('The owner administrator account cannot be deleted from student settings.'), { code: 'auth/owner-account-protected' });
  }

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

  await firebase.auth.signOut();
  return payload;
}

export async function registerAccountDeletionFix() {
  const originalDeleteAccount = getServiceAdapter('auth', 'deleteAccount');
  if (typeof originalDeleteAccount !== 'function') return false;

  configureServices({
    auth: {
      // Keep the service-level method safe for any other caller, but the
      // Settings page also calls deleteCurrentUserAccount directly so the
      // destructive action cannot fall back to the old client-side method.
      deleteAccount: deleteCurrentUserAccount,
    },
  });

  return true;
}
