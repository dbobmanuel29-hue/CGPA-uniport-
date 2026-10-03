import admin from 'firebase-admin';

const OWNER_ADMIN_UID = 'lmUB6IdhuaOlHjzkqBEyoNkE7PH2';
const USER_ID_FIELDS = ['userId', 'studentId', 'ownerId', 'targetUserId', 'actorId'];

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

function asDate(value) {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isNonActive(authUser, profile) {
  if (authUser?.disabled === true) return true;
  return String(profile?.accountStatus || '').trim().toLowerCase() !== 'active';
}

async function deleteUserData(db, uid) {
  const collections = await db.listCollections();
  const deletedPaths = new Set();

  for (const collection of collections) {
    for (const field of USER_ID_FIELDS) {
      let snapshot;
      try {
        while (true) {
          snapshot = await collection.where(field, '==', uid).limit(450).get();
          if (snapshot.empty) break;
          for (const doc of snapshot.docs) {
            if (deletedPaths.has(doc.ref.path)) continue;
            deletedPaths.add(doc.ref.path);
            await db.recursiveDelete(doc.ref);
          }
        }
      } catch (error) {
        console.warn(`Could not query ${collection.id}.${field} for ${uid}:`, error?.message || error);
      }
    }

    const ownDocument = collection.doc(uid);
    if (!deletedPaths.has(ownDocument.path)) {
      const ownSnapshot = await ownDocument.get();
      if (ownSnapshot.exists) {
        deletedPaths.add(ownDocument.path);
        await db.recursiveDelete(ownDocument);
      }
    }
  }

  return deletedPaths.size;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return json(res, 401, { ok: false, error: 'Unauthorized.' });
  }

  try {
    const app = getAdminApp();
    const auth = admin.auth(app);
    const db = admin.firestore(app);
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);

    const authUsers = [];
    let pageToken;
    do {
      const page = await auth.listUsers(1000, pageToken);
      authUsers.push(...page.users);
      pageToken = page.pageToken;
    } while (pageToken);

    let deletedAccounts = 0;
    let skippedAccounts = 0;
    const deletedIds = [];

    for (const authUser of authUsers) {
      if (authUser.uid === OWNER_ADMIN_UID) continue;

      const profileSnap = await db.collection('users').doc(authUser.uid).get();
      const profile = profileSnap.exists ? profileSnap.data() || {} : {};

      if (!isNonActive(authUser, profile)) {
        skippedAccounts += 1;
        continue;
      }

      // Prefer an explicit inactive timestamp. For older records created before
      // this lifecycle field existed, fall back to the account's last stored
      // update/creation timestamp so genuinely old non-active accounts can still
      // be cleaned up.
      const inactiveSince =
        asDate(profile.inactiveSince) ||
        asDate(profile.statusChangedAt) ||
        asDate(profile.updatedAt) ||
        asDate(authUser.metadata?.lastSignInTime) ||
        asDate(authUser.metadata?.creationTime);

      if (!inactiveSince || inactiveSince > cutoff) {
        skippedAccounts += 1;
        continue;
      }

      try {
        await deleteUserData(db, authUser.uid);
        await auth.deleteUser(authUser.uid);
        deletedAccounts += 1;
        deletedIds.push(authUser.uid);
      } catch (error) {
        console.error(`Automatic deletion failed for ${authUser.uid}:`, error);
      }
    }

    return json(res, 200, {
      ok: true,
      deletedAccounts,
      skippedAccounts,
      deletedIds,
      cutoff: cutoff.toISOString(),
    });
  } catch (error) {
    console.error('Inactive student cleanup failed:', error);
    return json(res, 500, {
      ok: false,
      error: error?.message || 'Automatic inactive-account cleanup failed.',
    });
  }
}
