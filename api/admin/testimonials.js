import admin from 'firebase-admin';

const OWNER_ADMIN_UID = 'lmUB6IdhuaOlHjzkqBEyoNkE7PH2';
const SAMPLE_TESTIMONIALS = [
  { id: 'sample-1', name: 'Sample UniPort Student', rating: 5, text: 'The calculator preview shows how GPA and CGPA calculations can be organized in one place. This is an illustrative example, not a real student review.', photoUrl: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=160&h=160&fit=crop', isSample: true, status: 'approved' },
  { id: 'sample-2', name: 'Sample CGPA+ User', rating: 5, text: 'A clear dashboard can make it easier to follow semester records and plan academic targets. This is sample content until real student feedback is approved.', photoUrl: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=160&h=160&fit=crop', isSample: true, status: 'approved' },
  { id: 'sample-3', name: 'Sample Student', rating: 4, text: 'Having GPA tools, academic records and planning features together is the kind of experience CGPA+ aims to provide. Illustrative sample only.', photoUrl: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=160&h=160&fit=crop', isSample: true, status: 'approved' },
];
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
      const [reviews, controls] = await Promise.all([db.collection('testimonials').get(), db.collection('testimonialSampleControls').get()]);
      const hidden = new Set(controls.docs.filter(doc => doc.data()?.hidden === true).map(doc => doc.id));
      const stored = reviews.docs.map(row);
      const defaults = SAMPLE_TESTIMONIALS.filter(item => !hidden.has(item.id)).map(item => ({ ...item, isHidden: false }));
      const all = [...stored, ...defaults].sort((a,b) => {
        const rank = item => item.isSample ? 0 : item.status === 'pending' ? 1 : item.status === 'approved' ? 2 : 3;
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
      if (name.length < 2 || text.length < 10 || !Number.isInteger(rating) || rating < 1 || rating > 5) return json(res, 400, { ok: false, error: 'Enter a name, review of at least 10 characters and rating from 1–5.' });
      if (photoUrl && !/^https:\/\//i.test(photoUrl)) return json(res, 400, { ok: false, error: 'Photo URL must start with https://.' });
      const ref = await db.collection('testimonials').add({ name, text, rating, photoUrl, isSample: true, status: 'approved', createdBy: token.uid, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return json(res, 201, { ok: true, id: ref.id });
    }
    if (!id) return json(res, 400, { ok: false, error: 'A testimonial ID is required.' });
    if (action === 'delete') {
      if (SAMPLE_TESTIMONIALS.some(item => item.id === id)) {
        await db.collection('testimonialSampleControls').doc(id).set({ hidden: true, updatedBy: token.uid, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      } else {
        const ref = db.collection('testimonials').doc(id);
        const snap = await ref.get();
        if (!snap.exists) return json(res, 404, { ok: false, error: 'That testimonial no longer exists.' });
        await ref.delete();
      }
      return json(res, 200, { ok: true });
    }
    if (action === 'approve' || action === 'reject') {
      if (id.startsWith('sample-')) return json(res, 400, { ok: false, error: 'Sample testimonials do not need moderation.' });
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
