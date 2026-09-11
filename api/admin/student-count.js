import admin from 'firebase-admin';

const OWNER_ADMIN_UID = 'lmUB6IdhuaOlHjzkqBEyoNkE7PH2';

function getAdminApp() {
  if (admin.apps.length) return admin.app();

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured on the server.');
  }

  return admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
  });
}

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(body));
}

async function requireAdmin(req) {
  const authorization = req.headers.authorization || '';
  if (!authorization.startsWith('Bearer ')) {
    const error = new Error('Authentication required.');
    error.code = 'unauthorized';
    throw error;
  }

  const app = getAdminApp();
  const auth = admin.auth(app);
  const db = admin.firestore(app);
  const token = await auth.verifyIdToken(authorization.slice(7));

  if (token.uid === OWNER_ADMIN_UID || token.admin === true || token.role === 'admin') {
    return { auth, db };
  }

  const account = await db.collection('users').doc(token.uid).get();
  if (account.exists && account.data()?.role === 'admin') return { auth, db };

  const error = new Error('Administrator access required.');
  error.code = 'permission-denied';
  throw error;
}

async function getAllAuthUsers(auth) {
  const users = [];
  let pageToken;

  do {
    const page = await auth.listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);

  return users;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  try {
    const { auth, db } = await requireAdmin(req);
    const [authUsers, firestoreUsersSnap] = await Promise.all([
      getAllAuthUsers(auth),
      db.collection('users').get(),
    ]);

    const firestoreStudents = firestoreUsersSnap.docs
      .filter(doc => doc.id !== OWNER_ADMIN_UID && (doc.data()?.role || 'student') === 'student')
      .map(doc => doc.id);
    const firestoreStudentIds = new Set(firestoreStudents);

    const authStudentUsers = authUsers.filter(user => user.uid !== OWNER_ADMIN_UID);
    const authStudentIds = new Set(authStudentUsers.map(user => user.uid));
    const matchedStudentIds = firestoreStudents.filter(uid => authStudentIds.has(uid));
    const firestoreOnlyIds = firestoreStudents.filter(uid => !authStudentIds.has(uid));
    const authOnlyIds = authStudentUsers
      .filter(user => !firestoreStudentIds.has(user.uid))
      .map(user => user.uid);

    return json(res, 200, {
      ok: true,
      totalAuthUsers: authStudentUsers.length,
      studentAuthCount: authStudentUsers.length,
      firestoreStudentCount: firestoreStudents.length,
      matchedStudentCount: matchedStudentIds.length,
      firestoreOnlyCount: firestoreOnlyIds.length,
      authOnlyCount: authOnlyIds.length,
    });
  } catch (error) {
    console.error('Student count failed:', error);
    const code = error?.code || 'server/student-count-failed';
    const status = code === 'unauthorized' ? 401 : code === 'permission-denied' ? 403 : 500;
    return json(res, status, {
      ok: false,
      code,
      error: error?.message || 'Student count could not be loaded.',
    });
  }
}
