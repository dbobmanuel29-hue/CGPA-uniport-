import { configureServices } from '../services/adapter.js';
import { authService } from '../services/auth-service.js';
import { getFirebase } from './firebase-client.js';

const hasCompletedProfile = profile => !!(
  profile?.facultyId &&
  profile?.departmentId &&
  profile?.programmeId &&
  profile?.admissionSessionId &&
  profile?.currentLevelId &&
  profile?.currentSessionId &&
  profile?.currentSemesterId
);

async function normalizeUser(user) {
  if (!user?.id) return user;
  try {
    const sdk = await getFirebase();
    if (!sdk?.auth.currentUser) return user;
    const ref = sdk.db.collection('academicProfiles').doc(user.id);
    const snap = await ref.get();
    if (!snap.exists || !hasCompletedProfile(snap.data())) return user;

    const userRef = sdk.db.collection('users').doc(user.id);
    const userSnap = await userRef.get();
    if (!userSnap.exists || userSnap.data()?.onboardingComplete !== true) {
      await userRef.set({ onboardingComplete: true }, { merge: true });
    }
    return { ...user, onboardingComplete: true };
  } catch {
    return user;
  }
}

export async function registerOnboardingRoutingFix() {
  const originalLogin = authService.login;
  const originalGoogle = authService.loginWithGoogle;
  const originalCurrentUser = authService.getCurrentUser;
  const originalSubscribe = authService.subscribeToAuthState;

  configureServices({
    auth: {
      login: async payload => normalizeUser(await originalLogin(payload)),
      loginWithGoogle: async payload => normalizeUser(await originalGoogle(payload)),
      getCurrentUser: async () => normalizeUser(await originalCurrentUser()),
      subscribeToAuthState: async callback => originalSubscribe(async user => callback(await normalizeUser(user))),
    },
  });
}
