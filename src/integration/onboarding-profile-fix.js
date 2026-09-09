import { configureServices } from '../services/adapter.js';
import { getFirebase } from './firebase-client.js';
import { UNIVERSITY } from '../data/uniport.js';

// Keep onboarding profile persistence independent from the larger academic read pipeline.
// The profile write must succeed before the user can move to result history.
export async function registerOnboardingProfileFix() {
  configureServices({
    academic: {
      async updateProfile(payload = {}) {
        const sdk = await getFirebase();
        if (!sdk?.auth.currentUser) {
          throw Object.assign(new Error('Authentication required.'), { code: 'unauthorized' });
        }
        if (payload.universityId !== UNIVERSITY.id) {
          throw Object.assign(new Error('Only UniPort profiles are accepted.'), { code: 'validation/invalid-university' });
        }

        const uid = sdk.auth.currentUser.uid;
        const markComplete = payload.markOnboardingComplete === true;
        const profile = Object.fromEntries(
          Object.entries({ ...payload, userId: uid, universityId: UNIVERSITY.id }).filter(([, value]) => value !== undefined)
        );

        await sdk.db.collection('academicProfiles').doc(uid).set(
          {
            ...profile,
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        await sdk.db.collection('users').doc(uid).set(
          {
            onboardingComplete: markComplete,
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        // Do not perform catalogue lookups here. Those reads are not part of saving
        // the onboarding form and must never prevent the user from moving forward.
        return { ...profile, markOnboardingComplete: markComplete };
      },
    },
  });
}
