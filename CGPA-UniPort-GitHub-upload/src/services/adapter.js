let configured = false;
const adapters = new Map();

export class BackendNotConnectedError extends Error {
  constructor(operation) {
    super('This feature needs a connected backend. No information has been saved or sent.');
    this.name = 'BackendNotConnectedError';
    this.code = 'BACKEND_NOT_CONNECTED';
    this.operation = operation;
  }
}

// Integration seam: register real Firebase/server implementations once, at startup.
export function configureServices(configuration) {
  configured = true;
  for (const [namespace, methods] of Object.entries(configuration)) {
    for (const [name, implementation] of Object.entries(methods)) {
      if (typeof implementation !== 'function') throw new TypeError(`Expected a function for ${namespace}.${name}`);
      adapters.set(`${namespace}.${name}`, implementation);
    }
  }
}

export function createService(namespace, methods) {
  return Object.freeze(Object.fromEntries(methods.map(method => [method, async (...args) => {
    const key = `${namespace}.${method}`;
    const fn = adapters.get(key);
    if (!fn) throw new BackendNotConnectedError(key);
    return await fn(...args);
  }])));
}

export function friendlyError(error) {
  if (error?.code === 'BACKEND_NOT_CONNECTED') return 'The backend is not connected yet. Nothing has been saved, sent, or changed.';
  if (error?.code === 'auth/invalid-credential') return 'Your email or password was not recognised. Please try again.';
  if (error?.code === 'auth/email-already-in-use') return 'This email already has an account. Try signing in.';
  if (error?.code === 'auth/popup-closed-by-user') return 'Google sign-in was closed before it finished.';
  if (error?.code === 'auth/requires-recent-login') return 'For your security, sign in again before changing this account setting.';
  if (error?.code === 'auth/terms-required') return 'Please accept the Terms and Privacy Policy to create your account.';
  if (error?.code === 'permission-denied' || error?.code === 'unauthorized') return 'You do not have permission to access this information.';
  if (error?.code === 'network-request-failed') return 'Check your internet connection and try again.';
  return 'We could not complete this request. Please try again.';
}
export function backendConfigured() { return configured; }
