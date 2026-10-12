import admin from 'firebase-admin';

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  return res.end(JSON.stringify(body));
}

function getApp() {
  if (admin.apps.length) return admin.app();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured.');
  return admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  try {
    const authorization = req.headers.authorization || '';
    if (!authorization.startsWith('Bearer ')) {
      return json(res, 401, { ok: false, error: 'Please sign in to continue.' });
    }

    const app = getApp();
    const decoded = await admin.auth(app).verifyIdToken(authorization.slice(7));
    const type = String(req.body?.type || '');
    const message = typeof req.body?.message === 'string' ? req.body.message.trim().slice(0, 500) : '';
    const allowed = {
      academic: { title: 'Academic records updated', route: '/app/academic' },
      account: { title: 'Password changed', route: '/app/settings' },
    };
    if (!allowed[type] || !message) {
      return json(res, 400, { ok: false, error: 'Unsupported notification.' });
    }

    const db = admin.firestore(app);
    const limitRef = db.collection('notificationRateLimits').doc(decoded.uid);
    const now = Date.now();
    const windowMs = 10 * 60 * 1000;
    const maxCount = 10;
    const limit = await db.runTransaction(async transaction => {
      const snap = await transaction.get(limitRef);
      const previous = snap.exists ? snap.data() : {};
      const withinWindow = Number.isFinite(previous.windowStartMs) &&
        now >= previous.windowStartMs && now - previous.windowStartMs < windowMs;
      const count = withinWindow ? Number(previous.count || 0) : 0;
      if (count >= maxCount) return false;
      transaction.set(limitRef, {
        windowStartMs: withinWindow ? previous.windowStartMs : now,
        count: count + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return true;
    });
    if (!limit) {
      return json(res, 429, { ok: false, error: 'Too many notifications were requested. Try again later.' });
    }

    const ref = await db.collection('notifications').add({
      userId: decoded.uid,
      type,
      title: allowed[type].title,
      message,
      route: allowed[type].route,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return json(res, 201, { ok: true, id: ref.id });
  } catch (error) {
    if (['auth/argument-error', 'auth/id-token-expired', 'auth/invalid-id-token'].includes(error?.code)) {
      return json(res, 401, { ok: false, error: 'Your session expired. Please sign in again.' });
    }
    console.error('Self notification creation failed:', error);
    return json(res, 500, { ok: false, error: 'Notification could not be saved.' });
  }
}
