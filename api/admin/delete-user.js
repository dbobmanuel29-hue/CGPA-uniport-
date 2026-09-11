import admin from 'firebase-admin';

const OWNER_ADMIN_UID = 'lmUB6IdhuaOlHjzkqBEyoNkE7PH2';

function getAdminApp() {
  if (admin.apps.length) return admin.app();

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured on the server.');
  }

  const serviceAccount = JSON.parse(serviceAccountJson);
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
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
  const token = await auth.verifyIdToken(authorization.slice(7));

  if (token.uid === OWNER_ADMIN_UID || token.admin === true || token.role === 'admin') {
    return { app, auth, db: admin.firestore(app), token };
  }

  const error = new Error('Administrator access required.');
  error.code = 'permission-denied';
  throw error;
}

async function deleteUserFirestoreData(db, uid) {
  // Discover every top-level collection so this endpoint is not limited to
  // today's known CGPA+ collections. A user's document/subcollections and
  // documents carrying userId are recursively removed.
  const collections = await db.listCollections();
  let deletedDocuments = 0;

  for (const collection of collections) {
    const matchingByUserId = await collection.where('userId', '==', uid).get();
    for (const doc of matchingByUserId.docs) {
      await db.recursiveDelete(doc.ref);
      deletedDocuments += 1;
    }

    const ownDocument = collection.doc(uid);
    const ownSnapshot = await ownDocument.get();
    if (ownSnapshot.exists) {
      await db.recursiveDelete(ownDocument);
      deletedDocuments += 1;
    }
  }

  return deletedDocuments;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  try {
    const { auth, db, token } = await requireAdmin(req);
    const studentId = String(req.body?.studentId || '').trim();

    if (!studentId || studentId === OWNER_ADMIN_UID) {
      return json(res, 400, { ok: false, code: 'validation/student-delete', error: 'That account cannot be deleted.' });
    }

    const userRecord = await auth.getUser(studentId);
    if (userRecord.uid === OWNER_ADMIN_UID) {
      return json(res, 400, { ok: false, code: 'validation/student-delete', error: 'The owner administrator account is protected.' });
    }

    const userDoc = await db.collection('users').doc(studentId).get();
    const role = userDoc.exists ? userDoc.data()?.role : 'student';
    if (role !== 'student') {
      return json(res, 400, { ok: false, code: 'validation/student-delete', error: 'Only student accounts can be deleted here.' });
    }

    const deletedDocuments = await deleteUserFirestoreData(db, studentId);

    // This is the privileged operation that the browser Firebase SDK cannot
    // perform for another user.
    await auth.deleteUser(studentId);

    await db.collection('auditLogs').add({
      actorId: token.uid,
      actorName: token.name || token.email || 'Administrator',
      actorEmail: token.email || '',
      action: 'deleteStudent',
      resource: 'student',
      resourceType: 'student',
      resourceId: studentId,
      status: 'success',
      description: `Student account, Firebase Authentication identity, and ${deletedDocuments} Firestore document(s) were deleted.`,
      ipAddress: 'Not collected',
      device: 'Server-side admin deletion',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return json(res, 200, {
      ok: true,
      deleted: true,
      id: studentId,
      deletedDocuments,
      authenticationDeleted: true,
    });
  } catch (error) {
    console.error('Admin user deletion failed:', error);
    const code = error?.code || 'server/delete-user-failed';
    const status = code === 'unauthorized' ? 401 : code === 'permission-denied' ? 403 : code === 'auth/user-not-found' ? 404 : 500;
    return json(res, status, {
      ok: false,
      code,
      error: error?.message || 'The user could not be completely deleted.',
    });
  }
}
