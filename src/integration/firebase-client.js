const SDK_VERSION = '12.3.0';
const CDN_BASE = `https://www.gstatic.com/firebasejs/${SDK_VERSION}`;

let sdkPromise;
let firebaseApp;
let firestore;
let firebaseAuth;

function configFromEnv() {
  const values = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
  return Object.values(values).every(Boolean) ? values : null;
}

export function firebaseConfigured() { return !!configFromEnv(); }

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-cgpa-firebase="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') resolve();
      else { existing.addEventListener('load', resolve, { once: true }); existing.addEventListener('error', reject, { once: true }); }
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.cgpaFirebase = src;
    script.addEventListener('load', () => { script.dataset.loaded = 'true'; resolve(); }, { once: true });
    script.addEventListener('error', () => reject(new Error(`Unable to load Firebase SDK: ${src}`)), { once: true });
    document.head.appendChild(script);
  });
}

async function configureAppCheck(app) {
  const siteKey = String(import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY || '').trim();
  if (!siteKey || !window.firebase.appCheck) return null;
  await loadScript(`${CDN_BASE}/firebase-app-check-compat.js`);
  const appCheck = window.firebase.appCheck(app);
  appCheck.activate(siteKey, true);
  return appCheck;
}

export async function getFirebase() {
  if (!firebaseConfigured()) return null;
  if (sdkPromise) return sdkPromise;
  sdkPromise = (async () => {
    await loadScript(`${CDN_BASE}/firebase-app-compat.js`);
    await loadScript(`${CDN_BASE}/firebase-auth-compat.js`);
    await loadScript(`${CDN_BASE}/firebase-firestore-compat.js`);
    const config = configFromEnv();
    firebaseApp = window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(config);
    firestore = window.firebase.firestore(firebaseApp);
    firebaseAuth = window.firebase.auth(firebaseApp);
    const appCheck = await configureAppCheck(firebaseApp);
    return { firebase: window.firebase, app: firebaseApp, db: firestore, auth: firebaseAuth, appCheck, functions: null };
  })();
  return sdkPromise;
}

export function clearFirebaseForTests() {
  sdkPromise = undefined;
  firebaseApp = undefined;
  firestore = undefined;
  firebaseAuth = undefined;
}
