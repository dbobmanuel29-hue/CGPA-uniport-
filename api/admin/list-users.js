import admin from 'firebase-admin';

const OWNER_ADMIN_UID = 'lmUB6IdhuaOlHjzkqBEyoNkE7PH2';

function getAdminApp() {
  if (admin.apps.length) return admin.app();

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured on the server.');

  return admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(raw)),
  });
}

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(body));
}

async function requireAdmin(req) {
  const authorization = req.headers.authorization || '';
  if (!authorization.startsWith('Bearer ')) {
    throw Object.assign(new Error('Authentication required.'), { code: 'unauthorized' });
  }

  const app = getAdminApp();
  const auth = admin.auth(app);
  const db = admin.firestore(app);
  const token = await auth.verifyIdToken(authorization.slice(7));

  let isAdmin = token.uid === OWNER_ADMIN_UID || token.admin === true || token.role === 'admin';
  if (!isAdmin) {
    const account = await db.collection('users').doc(token.uid).get();
    isAdmin = account.exists && account.data()?.role === 'admin';
  }

  if (!isAdmin) {
    throw Object.assign(new Error('Administrator access required.'), { code: 'permission-denied' });
  }

  return { auth, db };
}

function mapAuthUser(record) {
  return {
    id: record.uid,
    fullName: record.displayName || '',
    email: record.email || '',
    phone: record.phoneNumber || '',
    photoUrl: record.photoURL || '',
    emailVerified: record.emailVerified === true,
    accountStatus: record.disabled ? 'suspended' : 'active',
    role: record.uid === OWNER_ADMIN_UID ? 'admin' : 'student',
    createdAt: record.metadata?.creationTime || null,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  try {
    const { auth } = await requireAdmin(req);
    const users = [];
    let pageToken;

    do {
      const page = await auth.listUsers(1000, pageToken);
      users.push(...page.users.map(mapAuthUser));
      pageToken = page.pageToken;
    } while (pageToken);

    return json(res, 200, { ok: true, users });
  } catch (error) {
    console.error('Admin Auth user listing failed:', error);
    const code = error?.code || 'server/list-users-failed';
    const status = code === 'unauthorized' ? 401 : code === 'permission-denied' ? 403 : 500;
    return json(res, status, { ok: false, code, error: error?.message || 'The registered users could not be loaded.' });
  }
}
