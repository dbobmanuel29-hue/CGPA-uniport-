import admin from 'firebase-admin';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_TICKETS_PER_WINDOW = 3;

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(body));
}

function getAdminApp() {
  if (admin.apps.length) return admin.app();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured.');
  return admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validEmail(value) {
  return value.length >= 5 && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  try {
    const authorization = req.headers.authorization || '';
    if (!authorization.startsWith('Bearer ')) {
      return json(res, 401, { ok: false, code: 'unauthorized', error: 'Please sign in to submit a support request.' });
    }

    const app = getAdminApp();
    const decoded = await admin.auth(app).verifyIdToken(authorization.slice(7));
    const db = admin.firestore(app);
    const body = req.body || {};
    const fullName = text(body.fullName);
    const email = text(body.email).toLowerCase();
    const category = text(body.category);
    const subject = text(body.subject);
    const description = text(body.description);
    const priority = ['low', 'normal', 'high', 'urgent'].includes(body.priority) ? body.priority : 'normal';

    if (fullName.length < 2 || fullName.length > 100 ||
        !validEmail(email) ||
        category.length < 1 || category.length > 40 ||
        subject.length < 2 || subject.length > 180 ||
        description.length < 10 || description.length > 5000) {
      return json(res, 400, { ok: false, code: 'validation/invalid-request', error: 'Please check the name, email, category, subject and message lengths.' });
    }

    const supportRef = db.collection('adminSettings').doc('support');
    const securityRef = db.collection('adminSettings').doc('security');
    const rateRef = db.collection('supportRateLimits').doc(decoded.uid);
    const ticketRef = db.collection('supportTickets').doc();
    const nowMs = Date.now();

    const result = await db.runTransaction(async transaction => {
      const [supportSnap, securitySnap, rateSnap] = await Promise.all([
        transaction.get(supportRef),
        transaction.get(securityRef),
        transaction.get(rateRef),
      ]);
      const supportData = supportSnap.exists ? (supportSnap.data()?.settings || supportSnap.data() || {}) : {};
      const securityData = securitySnap.exists ? (securitySnap.data()?.settings || securitySnap.data() || {}) : {};

      if (supportData.requestsEnabled === false) return { disabled: true };
      if (securityData.requireVerifiedEmail === true && decoded.email_verified !== true) return { unverified: true };

      const rate = rateSnap.exists ? rateSnap.data() : {};
      const withinWindow = Number.isFinite(rate.windowStartMs) && nowMs - rate.windowStartMs < WINDOW_MS && nowMs >= rate.windowStartMs;
      const count = withinWindow ? Number(rate.count || 0) : 0;
      if (count >= MAX_TICKETS_PER_WINDOW) {
        return { limited: true, retryAfterSeconds: Math.max(1, Math.ceil((rate.windowStartMs + WINDOW_MS - nowMs) / 1000)) };
      }

      transaction.create(ticketRef, {
        userId: decoded.uid,
        fullName,
        email,
        category,
        subject,
        description,
        priority,
        studentName: fullName,
        status: 'open',
        messages: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      transaction.set(rateRef, {
        windowStartMs: withinWindow ? rate.windowStartMs : nowMs,
        count: count + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { ticketId: ticketRef.id };
    });

    if (result.disabled) return json(res, 403, { ok: false, code: 'support/disabled', error: 'Support requests are temporarily disabled.' });
    if (result.unverified) return json(res, 403, { ok: false, code: 'auth/email-not-verified', error: 'Please verify your email before submitting a support request.' });
    if (result.limited) {
      res.setHeader('Retry-After', String(result.retryAfterSeconds));
      return json(res, 429, { ok: false, code: 'support/rate-limited', error: 'You have sent several support requests recently. Please wait a few minutes and try again.', retryAfterSeconds: result.retryAfterSeconds });
    }

    return json(res, 201, { ok: true, ticketId: result.ticketId });
  } catch (error) {
    if (error?.code === 'auth/argument-error' || error?.code === 'auth/id-token-expired' || error?.code === 'auth/invalid-id-token') {
      return json(res, 401, { ok: false, code: 'unauthorized', error: 'Your sign-in session expired. Please sign in again.' });
    }
    console.error('Support ticket creation failed:', error);
    return json(res, 500, { ok: false, code: 'support/create-failed', error: 'Support request could not be created. Please try again.' });
  }
}
