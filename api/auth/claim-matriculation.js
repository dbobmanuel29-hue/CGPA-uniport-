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
  if (!normalized) throw Object.assign(new Error('Enter your UniPort matriculation number.'), { code: 'auth/matriculation-required' });
  if (normalized.length < 5 || normalized.length > 32 || !/[0-9]/.test(normalized) || !/^[A-Z0-9/.-]+$/.test(normalized)) {
    throw Object.assign(new Error('Enter a valid matriculation number using letters, numbers, and the usual slash or hyphen.'), { code: 'auth/matriculation-invalid' });
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
    if (!authorization.startsWith('Bearer ')) return json(res, 401, { ok: false, code: 'unauthorized', error: 'Please sign in to save your academic profile.' });

    const app = getAdminApp();
    const decoded = await admin.auth(app).verifyIdToken(authorization.slice(7));
    const matriculationNumber = normalizeMatriculationNumber(req.body?.matriculationNumber);
    const matriculationNumberKey = matriculationNumber.replace(/\//g, '__');
    const db = admin.firestore(app);

    // Older CGPA+ accounts may already have a matriculation number saved
    // without a matching matriculationClaims document. Check those legacy
    // records before creating a claim, so the claim collection is not the
    // only source of truth for uniqueness.
    const rawMatriculationNumber = String(req.body?.matriculationNumber || '').trim();
    const legacyCandidates = [...new Set([
      matriculationNumber,
      rawMatriculationNumber,
      rawMatriculationNumber.replace(/\\s+/g, ''),
      rawMatriculationNumber.toUpperCase(),
      rawMatriculationNumber.toLowerCase(),
    ].filter(Boolean))];

    const legacyChecks = legacyCandidates.flatMap(candidate => [
      db.collection('users').where('matriculationNumber', '==', candidate).limit(10).get(),
      db.collection('academicProfiles').where('matriculationNumber', '==', candidate).limit(10).get(),
    ]);
    const legacySnapshots = await Promise.all(legacyChecks);
    const legacyOwnerUids = new Set();
    for (const snapshot of legacySnapshots) {
      for (const doc of snapshot.docs) {
        const ownerUid = doc.id;
        if (ownerUid && ownerUid !== decoded.uid) legacyOwnerUids.add(ownerUid);
      }
    }
    if (legacyOwnerUids.size) {
      return json(res, 409, {
        ok: false,
        code: 'auth/matriculation-already-used',
        error: 'That matriculation number is already linked to an existing CGPA+ account. Use the account that already has this number, or contact support if you believe this is a mistake.',
      });
    }

    const userRef = db.collection('users').doc(decoded.uid);
    const profileRef = db.collection('academicProfiles').doc(decoded.uid);
    const claimRef = db.collection('matriculationClaims').doc(matriculationNumberKey);
    const stamp = admin.firestore.FieldValue.serverTimestamp();

    const result = await db.runTransaction(async transaction => {
      const [userSnap, claimSnap] = await Promise.all([transaction.get(userRef), transaction.get(claimRef)]);
      if (claimSnap.exists && claimSnap.data()?.uid !== decoded.uid) return { duplicate: true };
      const previousNumber = userSnap.exists ? String(userSnap.data()?.matriculationNumber || '') : '';
      const previousKey = userSnap.exists ? String(userSnap.data()?.matriculationNumberKey || '') : '';
      if (previousKey && previousKey !== matriculationNumberKey) {
        const previousClaimRef = db.collection('matriculationClaims').doc(previousKey);
        const previousClaim = await transaction.get(previousClaimRef);
        if (previousClaim.exists && previousClaim.data()?.uid === decoded.uid) transaction.delete(previousClaimRef);
      }
      if (!claimSnap.exists) transaction.create(claimRef, { uid: decoded.uid, createdAt: stamp });
      transaction.set(userRef, {
        fullName: userSnap.data()?.fullName || decoded.name || '',
        email: decoded.email || userSnap.data()?.email || '',
        matriculationNumber,
        matriculationNumberKey,
        accountStatus: userSnap.data()?.accountStatus || 'active',
        onboardingComplete: userSnap.data()?.onboardingComplete === true,
        role: decoded.uid === OWNER_ADMIN_UID ? 'admin' : (userSnap.data()?.role || 'student'),
        updatedAt: stamp,
      }, { merge: true });
      transaction.set(profileRef, { universityId: 'UNIPORT', userId: decoded.uid, matriculationNumber, updatedAt: stamp }, { merge: true });
      return { saved: true, unchanged: previousNumber === matriculationNumber };
    });

    if (result.duplicate) return json(res, 409, { ok: false, code: 'auth/matriculation-already-used', error: 'That matriculation number is already linked to another CGPA+ account. Check the number or contact support if you believe this is a mistake.' });
    return json(res, 200, { ok: true });
  } catch (error) {
    if (['auth/argument-error', 'auth/id-token-expired', 'auth/invalid-id-token'].includes(error?.code)) return json(res, 401, { ok: false, code: 'unauthorized', error: 'Your sign-in session expired. Please sign in again.' });
    if (['auth/matriculation-required', 'auth/matriculation-invalid'].includes(error?.code)) return json(res, 400, { ok: false, code: error.code, error: error.message });
    console.error('Matriculation claim failed:', error);
    return json(res, 500, { ok: false, code: error?.code || 'auth/matriculation-claim-failed', error: 'Your matriculation number could not be saved. Please try again.' });
  }
}
