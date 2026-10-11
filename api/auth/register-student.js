import admin from 'firebase-admin';

const OWNER_ADMIN_UID = 'lmUB6IdhuaOlHjzkqBEyoNkE7PH2';

function getAdminApp() {
  if (admin.apps.length) return admin.app();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured on the server.');
  return admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
}

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(body));
}

function normalizeMatriculationNumber(value) {
  const normalized = typeof value === 'string' ? value.toUpperCase().replace(/\s+/g, '') : '';
  if (!normalized) throw Object.assign(new Error('A UniPort matriculation number is required.'), { code: 'auth/matriculation-required' });
  if (normalized.length < 5 || normalized.length > 32 || !/[0-9]/.test(normalized) || !/^[A-Z0-9/.-]+$/.test(normalized)) {
    throw Object.assign(new Error('Enter a valid UniPort matriculation number.'), { code: 'auth/matriculation-invalid' });
  }
  return normalized;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, code: 'method-not-allowed', error: 'Method not allowed.' });
  }

  try {
    const authorization = req.headers.authorization || '';
    if (!authorization.startsWith('Bearer ')) {
      return json(res, 401, { ok: false, code: 'unauthorized', error: 'Please sign in to finish creating your account.' });
    }

    const app = getAdminApp();
    const auth = admin.auth(app);
    const db = admin.firestore(app);
    const decoded = await auth.verifyIdToken(authorization.slice(7));
    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim().slice(0, 100) : '';
    const email = typeof decoded.email === 'string' ? decoded.email : '';
    const acceptedTerms = req.body?.acceptedTerms === true;
    if (!acceptedTerms) {
      return json(res, 400, { ok: false, code: 'auth/terms-required', error: 'Accept the Terms and Privacy Policy before creating an account.' });
    }
    if (fullName.length < 2) {
      return json(res, 400, { ok: false, code: 'validation/invalid-name', error: 'Enter your full name.' });
    }

    const matriculationNumber = normalizeMatriculationNumber(req.body?.matriculationNumber);
    const matriculationNumberKey = matriculationNumber.replace(/\//g, '__');
    const claimRef = db.collection('matriculationClaims').doc(matriculationNumberKey);
    const userRef = db.collection('users').doc(decoded.uid);
    const profileRef = db.collection('academicProfiles').doc(decoded.uid);
    const stamp = admin.firestore.FieldValue.serverTimestamp();

    const result = await db.runTransaction(async transaction => {
      const [claimSnap, userSnap] = await Promise.all([
        transaction.get(claimRef),
        transaction.get(userRef),
      ]);

      if (userSnap.exists) {
        return { existingAccount: true };
      }
      if (claimSnap.exists && claimSnap.data()?.uid !== decoded.uid) {
        return { duplicate: true };
      }

      if (!claimSnap.exists) {
        transaction.create(claimRef, { uid: decoded.uid, createdAt: stamp });
      }
      transaction.create(userRef, {
        fullName,
        email,
        matriculationNumber,
        matriculationNumberKey,
        accountStatus: 'active',
        onboardingComplete: false,
        role: decoded.uid === OWNER_ADMIN_UID ? 'admin' : 'student',
        acceptedTermsAt: stamp,
        createdAt: stamp,
        provider: decoded.firebase?.sign_in_provider || 'password',
      });
      transaction.set(profileRef, {
        universityId: 'UNIPORT',
        userId: decoded.uid,
        createdAt: stamp,
      }, { merge: true });
      return { created: true };
    });

    if (result.duplicate) {
      return json(res, 409, {
        ok: false,
        code: 'auth/matriculation-already-used',
        error: 'That matriculation number is already linked to a CGPA+ account. Check the number or contact support if you believe this is a mistake.',
      });
    }
    if (result.existingAccount) {
      return json(res, 409, { ok: false, code: 'auth/student-profile-exists', error: 'A CGPA+ profile already exists for this account. Please sign in instead.' });
    }

    return json(res, 201, { ok: true, matriculationNumber });
  } catch (error) {
    if (['auth/argument-error', 'auth/id-token-expired', 'auth/invalid-id-token'].includes(error?.code)) {
      return json(res, 401, { ok: false, code: 'unauthorized', error: 'Your sign-in session expired. Please try again.' });
    }
    if (['auth/matriculation-required', 'auth/matriculation-invalid', 'auth/terms-required'].includes(error?.code)) {
      return json(res, 400, { ok: false, code: error.code, error: error.message });
    }
    console.error('Student registration failed:', error);
    return json(res, 500, { ok: false, code: error?.code || 'auth/matriculation-registration-failed', error: 'Your account could not be created. Please try again.' });
  }
}
