import { configureServices } from '../services/adapter.js';
import { getFirebase } from './firebase-client.js';

const OWNER_ADMIN_UID = 'lmUB6IdhuaOlHjzkqBEyoNkE7PH2';

function clean(value) {
  return Object.fromEntries(Object.entries(value || {}).filter(([, v]) => v !== undefined));
}

async function buildAccount(user, db) {
  const snap = await db.collection('users').doc(user.uid).get();
  const data = snap.exists ? snap.data() : {};
  return clean({
    id: user.uid,
    fullName: data.fullName || user.displayName || '',
    email: user.email || data.email || '',
    phone: data.phone || user.phoneNumber || '',
    photoUrl: data.photoUrl || user.photoURL || '',
    accountStatus: data.accountStatus || 'active',
    emailVerified: !!user.emailVerified,
    onboardingComplete: !!data.onboardingComplete,
    role: user.uid === OWNER_ADMIN_UID ? 'admin' : (data.role || 'student'),
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || user.metadata?.creationTime || new Date().toISOString()),
  });
}

export async function registerGoogleAuthFix() {
  const sdk = await getFirebase();
  if (!sdk?.auth || !sdk?.db) return;

  configureServices({
    auth: {
      async loginWithGoogle() {
        const persistence = window.firebase.auth.Auth.Persistence;
        await sdk.auth.setPersistence(persistence.LOCAL);
        const provider = new window.firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });

        try {
          const result = await sdk.auth.signInWithPopup(provider);
          const ref = sdk.db.collection('users').doc(result.user.uid);
          const existing = await ref.get();
          if (!existing.exists) {
            await ref.set({
              fullName: result.user.displayName || '',
              email: result.user.email || '',
              accountStatus: 'active',
              onboardingComplete: false,
              role: result.user.uid === OWNER_ADMIN_UID ? 'admin' : 'student',
              createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
              provider: 'google',
            });
          }
          return buildAccount(result.user, sdk.db);
        } catch (error) {
          if (error?.code === 'auth/account-exists-with-different-credential') {
            error.friendlyCode = 'auth/google-account-link-required';
          }
          throw error;
        }
      },
    },
  });
}
