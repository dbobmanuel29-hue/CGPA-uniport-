import { configureServices } from '../services/adapter.js';
import { getFirebase } from './firebase-client.js';
import { UNIVERSITY } from '../data/uniport.js';

export async function registerOnboardingSaveFix() {
  configureServices({
    academic: {
      updateProfile: async payload => {
        const sdk = await getFirebase();
        if (!sdk?.auth.currentUser) throw Object.assign(new Error('Your session has expired. Please sign in again.'), { code: 'unauthorized' });
        const user = sdk.auth.currentUser;
        const profile = {
          ...Object.fromEntries(Object.entries(payload || {}).filter(([, value]) => value !== undefined)),
          userId: user.uid,
          universityId: UNIVERSITY.id,
          updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        };
        delete profile.markOnboardingComplete;
        await sdk.db.collection('academicProfiles').doc(user.uid).set(profile, { merge: true });
        const userRef = sdk.db.collection('users').doc(user.uid);
        const userSnap = await userRef.get();
        const onboardingComplete = payload?.markOnboardingComplete === true;
        if (userSnap.exists) {
          await userRef.set({ onboardingComplete, updatedAt: window.firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
        } else {
          await userRef.set({ fullName: user.displayName || '', email: user.email || '', accountStatus: 'active', onboardingComplete, role: 'student', createdAt: window.firebase.firestore.FieldValue.serverTimestamp() });
        }
        return { ...profile, onboardingComplete };
      },
    },
  });
}
