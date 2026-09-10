import { createService } from './adapter.js';
import { getFirebase } from '../integration/firebase-client.js';

const backendAuthService = createService('auth', ['login', 'loginWithGoogle', 'register', 'sendPasswordReset', 'logout', 'getCurrentUser', 'subscribeToAuthState', 'getIdToken', 'sendEmailVerification', 'updatePassword', 'updateAccount', 'changePhoto', 'deleteAccount', 'getSignInMethods', 'getPreferences', 'updatePreferences', 'requestDataExport']);

function detectDevice() {
  const ua = navigator?.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'Apple mobile device';
  if (/Android/i.test(ua)) return 'Android device';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows PC';
  if (/Linux/i.test(ua)) return 'Linux device';
  return 'Current device';
}

function detectBrowser() {
  const ua = navigator?.userAgent || '';
  if (/Edg\//i.test(ua)) return 'Microsoft Edge';
  if (/OPR\//i.test(ua)) return 'Opera';
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return 'Google Chrome';
  if (/Firefox\//i.test(ua)) return 'Mozilla Firefox';
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return 'Safari';
  return 'Web browser';
}

export const authService = Object.freeze({
  ...backendAuthService,
  async getSessions() {
    const firebase = await getFirebase();
    const user = firebase?.auth?.currentUser;
    if (!user) return [];
    return [{
      id: 'current',
      device: detectDevice(),
      browser: detectBrowser(),
      location: 'Not available',
      lastActiveAt: new Date().toISOString(),
      current: true,
    }];
  },
  async revokeSession(sessionId) {
    if (sessionId !== 'current') {
      throw Object.assign(new Error('Other-device session revocation requires a trusted backend.'), { code: 'auth/session-revocation-unavailable' });
    }
    const firebase = await getFirebase();
    if (!firebase?.auth?.currentUser) return { success: true };
    await firebase.auth().signOut();
    return { success: true };
  },
});
