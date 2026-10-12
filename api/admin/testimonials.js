import admin from 'firebase-admin';

const OWNER_ADMIN_UID = 'lmUB6IdhuaOlHjzkqBEyoNkE7PH2';
function json(res, status, body) { res.status(status).setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); return res.end(JSON.stringify(body)); }
function getApp() {
  if (admin.apps.length) return admin.app();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured on the server.');
  return admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
}
function cleanText(value, max = 1000) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
async function requireAdmin(req) {
  const authorization = req.headers.authorization || '';
  if (!authorization.startsWith('Bearer ')) throw Object.assign(new Error('Please sign in as an administrator.'), { status: 401 });
  const app = getApp();
  const token = await admin.auth(app).verifyIdToken(authorization.slice(7));
  const db = admin.firestore(app);
  let allowed = token.uid === OWNER_ADMIN_UID || token.admin === true || token.role === 'admin';
  if (!allowed) {
    const user = await db.collection('users').doc(token.uid).get();
    allowed = user.exists && user.data()?.role === 'admin';
  }
  if (!allowed) throw Object.assign(new Error('Administrator access required.'), { status: 403 });
  return { db, token };
}
function row(doc) {
  const data = doc.data();
  return { id: doc.id, name: data.name || 'CGPA+ student', email: data.email || '', text: data.text || '', rating: Number(data.rating) || 5, photoUrl: data.photoUrl || '', isSample: data.isSample === true, status: data.status || 'pending', createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null };
}
export default async function handler(req, res) {
  try {
    const { db, token } = await requireAdmin(req);
    if (req.method === 'GET') {
      const reviews = await db.collection('testimonials').get();
      const all = reviews.docs.map(row).sort((a,b) => {
        const rank = item => item.status === 'pending' ? 0 : item.status === 'approved' ? 1 : 2;
        return rank(a) - rank(b) || String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
      });
      return json(res, 200, { ok: true, testimonials: all });
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return json(res, 405, { ok: false, error: 'Method not allowed.' }); }
    const action = cleanText(req.body?.action, 20);
    const id = cleanText(req.body?.id, 160);
    if (action === 'create') {
      const name = cleanText(req.body?.name, 80);
      const text = cleanText(req.body?.text, 1000);
      const rating = Number(req.body?.rating);
      const photoUrl = cleanText(req.body?.photoUrl, 1000);
      if (name.length < 2 || text.length < 10 || !Number.isInteger(rating) || rating < 1 || rating > 5 || req.body?.genuineConsent !== true) return json(res, 400, { ok: false, error: 'Enter the student details, a review of at least 10 characters, a 1–5 rating, and confirm that the feedback is genuine and you have permission to publish it.' });
      if (photoUrl && !/^https:\/\//i.test(photoUrl)) return json(res, 400, { ok: false, error: 'Photo URL must start with https://.' });
      const ref = await db.collection('testimonials').add({ name, text, rating, photoUrl, isSample: false, status: 'approved', createdBy: token.uid, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return json(res, 201, { ok: true, id: ref.id });
    }
    if (!id) return json(res, 400, { ok: false, error: 'A testimonial ID is required.' });
    if (action === 'delete') {
      const ref = db.collection('testimonials').doc(id);
      const snap = await ref.get();
      if (!snap.exists) return json(res, 404, { ok: false, error: 'That testimonial no longer exists.' });
      await ref.delete();
      return json(res, 200, { ok: true });
    }
    if (action === 'approve' || action === 'reject') {
      const ref = db.collection('testimonials').doc(id);
      const snap = await ref.get();
      if (!snap.exists || snap.data()?.isSample === true) return json(res, 404, { ok: false, error: 'Student review not found.' });
      await ref.update({ status: action === 'approve' ? 'approved' : 'rejected', moderatedBy: token.uid, moderatedAt: admin.firestore.FieldValue.serverTimestamp() });
      return json(res, 200, { ok: true });
    }
    return json(res, 400, { ok: false, error: 'Unsupported testimonial action.' });
  } catch (error) {
    if (['auth/argument-error','auth/id-token-expired','auth/invalid-id-token'].includes(error?.code)) return json(res, 401, { ok: false, error: 'Your session expired. Please sign in again.' });
    const status = error.status || (error?.code === 'permission-denied' ? 403 : 500);
    if (status >= 500) console.error('Admin testimonial operation failed:', error);
    return json(res, status, { ok: false, error: error.message || 'Testimonial management failed.' });
  }
}
