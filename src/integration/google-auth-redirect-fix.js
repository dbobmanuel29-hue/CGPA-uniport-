import { configureServices } from '../services/adapter.js';
import { getFirebase } from './firebase-client.js';
import { UNIVERSITY } from '../data/uniport.js';

const OWNER_ADMIN_UID = 'lmUB6IdhuaOlHjzkqBEyoNkE7PH2';

async function ensureGoogleUser(result, db) {
  if (!result?.user) return null;
  const ref = db.collection('users').doc(result.user.uid);
  const existing = await ref.get();
  if (!existing.exists) {
    await ref.set({
      fullName: result.user.displayName || '',
      email: result.user.email || '',
      accountStatus: 'active',
      onboardingComplete: false,
      role: result.user.uid === OWNER_ADMIN_UID ? 'admin' : 'student',
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      provider: 'google'
    });
    await db.collection('academicProfiles').doc(result.user.uid).set({
      universityId: UNIVERSITY.id,
      userId: result.user.uid,
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
    });
  }
}

export async function registerGoogleAuthRedirectFix() {
  const firebase = await getFirebase();
  if (!firebase?.auth) return false;

  const { auth, db } = firebase;

  // Complete a Google redirect fallback when the browser returns to CGPA+.
  try {
    const result = await auth.getRedirectResult();
    if (result?.user) await ensureGoogleUser(result, db);
  } catch (error) {
    console.error('Google redirect sign-in failed:', error);
    throw error;
  }

  configureServices({
    auth: {
      loginWithGoogle: async () => {
        const provider = new window.firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL);

        try {
          const result = await auth.signInWithPopup(provider);
          await ensureGoogleUser(result, db);
          return result.user;
        } catch (error) {
          // Popup failures fall back to redirect instead of showing the
          // misleading "closed before it finished" message.
          if (['auth/popup-closed-by-user', 'auth/popup-blocked'].includes(error?.code)) {
            await auth.signInWithRedirect(provider);
            return null;
          }
          throw error;
        }
      }
    }
  });

  return true;
}
