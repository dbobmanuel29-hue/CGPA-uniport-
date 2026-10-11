let configured = false;
const adapters = new Map();
export class BackendNotConnectedError extends Error { constructor(operation) { super('This feature needs a connected backend. No information has been saved or sent.'); this.name = 'BackendNotConnectedError'; this.code = 'BACKEND_NOT_CONNECTED'; this.operation = operation; } }
export function configureServices(configuration) { configured = true; for (const [namespace, methods] of Object.entries(configuration)) for (const [name, implementation] of Object.entries(methods)) { if (typeof implementation !== 'function') throw new TypeError(`Expected a function for ${namespace}.${name}`); adapters.set(`${namespace}.${name}`, implementation); } }
export function getServiceAdapter(namespace, name) { return adapters.get(`${namespace}.${name}`); }
export function createService(namespace, methods) { return Object.freeze(Object.fromEntries(methods.map(method => [method, async (...args) => { const key = `${namespace}.${method}`; const fn = adapters.get(key); if (!fn) throw new BackendNotConnectedError(key); return await fn(...args); }]))); }
export function friendlyError(error) {
  // Keep onboarding and academic-profile errors specific so students know
  // exactly what needs fixing instead of seeing a generic failure message.
  if (error?.code === 'auth/matriculation-already-used') return error.message || 'This matriculation number is already linked to another CGPA+ account. Sign in to the original account or contact support if you believe this is a mistake.';
  if (error?.code === 'auth/matriculation-required') return error.message || 'Enter your UniPort matriculation number to continue.';
  if (error?.code === 'auth/matriculation-invalid') return error.message || 'The matriculation number format is invalid. Check the letters, numbers, and separators, then try again.';
  if (error?.code === 'auth/matriculation-claim-failed') return error.message || 'We could not verify that this matriculation number is available. Check your connection and try again.';
  if (error?.code === 'validation/invalid-university') return error.message || 'This profile must use the University of Port Harcourt.';
  if (error?.code === 'validation/missing-history') return error.message || 'Add the required previous academic results before finishing setup.';
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
  if (error?.code === 'academic/result-permission-denied') return error.message || 'Firebase rejected this result. Please check the academic and security settings.';
  if (error?.code === 'permission-denied') return 'You do not have permission to complete this action.';
  if (error?.code === 'unauthorized') return 'Please sign in again before using this feature.';
  if (error?.code === 'not-found/student') return error.message || 'No student was found with that Firebase ID.';
  if (error?.code === 'not-found/report') return 'That saved report could not be found.';
  if (error?.code === 'validation/student-id') return 'Enter the student Firebase ID first.';
  if (error?.code === 'report/lookup-failed' || error?.code === 'report/results-failed') return error.message || 'The report data could not be loaded.';
  if (error?.code === 'support/rate-limited') return error.message || 'Please wait before sending another support request.';
  if (error?.code === 'support/disabled') return 'Support requests are temporarily disabled by the administrator.';
  if (error?.code === 'academic/result-entry-disabled') return 'Student result entry is currently disabled by the administrator.';
  if (error?.code === 'academic/server-validation') return 'This result did not pass the configured validation rules.';
  if (error?.code === 'reports/disabled') return 'Student report requests are currently disabled by the administrator.';
  if (error?.code === 'not-found/support') return 'That support request could not be found.';
  if (error?.code === 'validation/support-request' || error?.code === 'validation/support-reply') return error.message || 'Please check your support message and try again.';
  // Common browser, Firebase, upload, validation and network failures.
  const code = String(error?.code || '').toLowerCase();
  if (['auth/invalid-email'].includes(code)) return 'Enter a valid email address, for example name@example.com.';
  if (['auth/weak-password'].includes(code)) return 'Your password is too weak. Use at least 8 characters and choose a stronger password.';
  if (['auth/missing-password'].includes(code)) return 'Enter your password to continue.';
  if (['auth/missing-email'].includes(code)) return 'Enter the email address for this account.';
  if (['auth/email-already-in-use'].includes(code)) return 'This email already has an account. Sign in instead, or reset your password if needed.';
  if (['auth/user-token-expired', 'auth/id-token-expired', 'auth/invalid-user-token'].includes(code)) return 'Your session has expired. Sign in again and repeat your action.';
  if (['auth/network-request-failed', 'unavailable', 'network-error', 'failed-precondition/network'].includes(code)) return 'The connection was interrupted. Check your internet connection and try again.';
  if (['storage/unauthorized', 'storage/unauthenticated'].includes(code)) return 'You are not allowed to upload this file. Sign in again or contact support if the problem continues.';
  if (['storage/canceled'].includes(code)) return 'The upload was cancelled before it finished. Choose the file again to retry.';
  if (['storage/retry-limit-exceeded'].includes(code)) return 'The upload could not finish because the connection kept failing. Check your network and try again.';
  if (['storage/invalid-format', 'file/invalid-type'].includes(code)) return 'This file type is not supported. Choose a supported file format and try again.';
  if (['storage/invalid-checksum', 'storage/server-file-wrong-size'].includes(code)) return 'The uploaded file did not pass its integrity check. Choose the file again and retry.';
  if (['storage/quota-exceeded'].includes(code)) return 'File storage is currently full. Please contact support.';
  if (['deadline-exceeded', 'timeout', 'request-timeout'].includes(code)) return 'The request took too long to finish. Check your connection and try again.';
  if (['already-exists', 'conflict'].includes(code)) return 'This record already exists. Check for a duplicate before trying again.';
  if (['not-found', 'resource-not-found'].includes(code)) return 'The item you requested could not be found. It may have been removed or moved.';
  if (['failed-precondition'].includes(code)) return 'This action cannot be completed yet. Check that the required setup or previous step is complete.';
  if (['invalid-argument', 'validation/invalid-input'].includes(code)) return 'Some information is missing or invalid. Review the highlighted fields and correct them.';
  if (['resource-exhausted', 'quota-exceeded'].includes(code)) return 'This feature has reached a temporary usage limit. Wait a little and try again.';
  if (['internal', 'unknown', 'server-error'].includes(code)) return 'The service encountered an unexpected problem. Try again shortly; if it continues, contact support.';
  if (error?.name === 'TypeError' && /fetch|network|load failed/i.test(String(error?.message || ''))) return 'CGPA+ could not reach the service. Check your internet connection and try again.';
  // Preserve clear, user-facing messages authored by the app, but do not expose
  // raw SDK/HTTP internals, stack traces, URLs or server implementation details.
  const message = String(error?.message || '').trim();
  const looksTechnical = /^(Firebase:|FirebaseError:|TypeError:|NetworkError|Request failed with status|HTTP \d{3}|\w+Error:)|stack trace| at \w+ \(/i.test(message);
  if (message && !looksTechnical && message.length <= 240 && !/https?:\/\/|Bearer\s|token=|api[_-]?key/i.test(message)) return message;
  return 'CGPA+ could not complete this action because the cause could not be identified. Check your connection, review the information you entered, and try again. If it continues, contact support.';
}
export function backendConfigured() { return configured; }
