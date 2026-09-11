let configured = false;
const adapters = new Map();
export class BackendNotConnectedError extends Error { constructor(operation) { super('This feature needs a connected backend. No information has been saved or sent.'); this.name = 'BackendNotConnectedError'; this.code = 'BACKEND_NOT_CONNECTED'; this.operation = operation; } }
export function configureServices(configuration) { configured = true; for (const [namespace, methods] of Object.entries(configuration)) for (const [name, implementation] of Object.entries(methods)) { if (typeof implementation !== 'function') throw new TypeError(`Expected a function for ${namespace}.${name}`); adapters.set(`${namespace}.${name}`, implementation); } }
export function getServiceAdapter(namespace, name) { return adapters.get(`${namespace}.${name}`); }
export function createService(namespace, methods) { return Object.freeze(Object.fromEntries(methods.map(method => [method, async (...args) => { const key = `${namespace}.${method}`; const fn = adapters.get(key); if (!fn) throw new BackendNotConnectedError(key); return await fn(...args); }]))); }
export function friendlyError(error) {
  if (error?.code === 'BACKEND_NOT_CONNECTED') return 'The backend is not connected yet. Nothing has been saved or sent.';
  if (error?.code === 'auth/invalid-credential') return 'Your email or password was not recognised. Please try again.';
  if (error?.code === 'auth/wrong-password') return 'Your email or password was not recognised. Please try again.';
  if (error?.code === 'auth/user-not-found') return 'No account was found with those sign-in details.';
  if (error?.code === 'auth/user-disabled') return 'This account has been disabled. Please contact support.';
  if (error?.code === 'auth/too-many-requests') return 'Too many sign-in attempts. Please wait a little and try again.';
  if (error?.code === 'auth/network-request-failed') return 'Check your internet connection and try again.';
  if (error?.code === 'auth/operation-not-allowed') return 'This sign-in method is currently disabled in Firebase Authentication.';
  if (error?.code === 'auth/unauthorized-domain') return 'Google sign-in is not authorized for this website domain in Firebase Authentication.';
  if (error?.code === 'auth/invalid-oauth-client-id') return 'Google sign-in has an invalid OAuth client configuration.';
  if (error?.code === 'auth/popup-blocked') return 'Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.';
  if (error?.code === 'auth/popup-operation-not-supported-in-this-environment') return 'Google sign-in pop-ups are not supported in this browser. Please try another browser.';
  if (error?.code === 'auth/cancelled-popup-request') return 'Another Google sign-in window is already open. Finish it or close it and try again.';
  if (error?.code === 'auth/popup-closed-by-user') return 'Google sign-in was closed before it finished.';
  if (error?.friendlyCode === 'auth/google-account-link-required' || error?.code === 'auth/account-exists-with-different-credential') return 'This Google email already has a CGPA+ account using another sign-in method. Sign in with that method first, then link Google from your account settings.';
  if (error?.code === 'auth/requires-recent-login') return 'For your security, sign in again before changing this account setting.';
  if (error?.code === 'auth/delete-reauth-required') return error.message || 'Please reauthenticate before permanently deleting your account.';
  if (error?.code === 'auth/invalid-login-credentials') return 'The current password is incorrect.';
  if (error?.code === 'auth/owner-account-protected') return error.message || 'The owner administrator account cannot be deleted from student settings.';
  if (error?.code === 'auth/email-already-in-use') return 'This email already has an account. Try signing in.';
  if (error?.code === 'auth/terms-required') return 'Please accept the Terms and Privacy Policy to create your account.';
  if (error?.code === 'permission-denied') return 'You do not have permission to complete this action.';
  if (error?.code === 'unauthorized') return 'Please sign in again before using this feature.';
  if (error?.code === 'not-found/student') return error.message || 'No student was found with that Firebase ID.';
  if (error?.code === 'not-found/report') return 'That saved report could not be found.';
  if (error?.code === 'validation/student-id') return 'Enter the student Firebase ID first.';
  if (error?.code === 'report/lookup-failed' || error?.code === 'report/results-failed') return error.message || 'The report data could not be loaded.';
  if (error?.code === 'support/rate-limited') return error.message || 'Please wait before sending another support request.';
  return 'We could not complete this request. Please try again.';
}
export function backendConfigured() { return configured; }
