import admin from 'firebase-admin';

const SAMPLE_TESTIMONIALS = [
  { id: 'sample-1', name: 'Sample UniPort Student', rating: 5, text: 'The calculator preview shows how GPA and CGPA calculations can be organized in one place. This is an illustrative example, not a real student review.', photoUrl: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=160&h=160&fit=crop', isSample: true, status: 'approved' },
  { id: 'sample-2', name: 'Sample CGPA+ User', rating: 5, text: 'A clear dashboard can make it easier to follow semester records and plan academic targets. This is sample content until real student feedback is approved.', photoUrl: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=160&h=160&fit=crop', isSample: true, status: 'approved' },
  { id: 'sample-3', name: 'Sample Student', rating: 4, text: 'Having GPA tools, academic records and planning features together is the kind of experience CGPA+ aims to provide. Illustrative sample only.', photoUrl: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=160&h=160&fit=crop', isSample: true, status: 'approved' },
];

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  return res.end(JSON.stringify(body));
}
function getApp() {
  if (admin.apps.length) return admin.app();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured on the server.');
  return admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
}
function publicRow(doc) {
  const data = doc.data();
  return { id: doc.id, name: data.name || 'CGPA+ student', text: data.text || '', rating: Number(data.rating) || 5, photoUrl: data.photoUrl || '', isSample: data.isSample === true, status: data.status || 'pending', createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null };
}
function cleanText(value, max = 1000) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const db = admin.firestore(getApp());
      const snap = await db.collection('testimonials').where('status', '==', 'approved').get();
      const real = snap.docs.map(publicRow).filter(item => !item.isSample).sort((a,b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      const sampleControls = await db.collection('testimonialSampleControls').get();
      const hidden = new Set(sampleControls.docs.filter(doc => doc.data()?.hidden === true).map(doc => doc.id));
      const storedSamples = snap.docs.map(publicRow).filter(item => item.isSample);
      const builtIn = SAMPLE_TESTIMONIALS.filter(item => !hidden.has(item.id));
      const samples = [...storedSamples, ...builtIn.filter(item => !storedSamples.some(row => row.id === item.id))];
      const result = [...real, ...samples.slice(0, Math.max(0, 3 - real.length))].slice(0, 6);
      return json(res, 200, { ok: true, testimonials: result });
    } catch (error) {
      console.error('Public testimonials load failed:', error);
      return json(res, 500, { ok: false, error: 'Testimonials could not be loaded right now.' });
    }
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { ok: false, error: 'Method not allowed.' });
  }
  try {
    const authorization = req.headers.authorization || '';
    if (!authorization.startsWith('Bearer ')) return json(res, 401, { ok: false, error: 'Please sign in to submit a review.' });
    const app = getApp();
    const decoded = await admin.auth(app).verifyIdToken(authorization.slice(7));
    const db = admin.firestore(app);
    const text = cleanText(req.body?.text, 1000);
    const rating = Number(req.body?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || text.length < 10) {
      return json(res, 400, { ok: false, error: 'Choose 1–5 stars and write at least 10 characters (up to 1,000).'});
    }
    const rateRef = db.collection('testimonialRateLimits').doc(decoded.uid);
    const now = Date.now();
    const result = await db.runTransaction(async transaction => {
      const rateSnap = await transaction.get(rateRef);
      const rate = rateSnap.exists ? rateSnap.data() : {};
      const inWindow = Number.isFinite(rate.windowStartMs) && now >= rate.windowStartMs && now - rate.windowStartMs < 10 * 60 * 1000;
      const count = inWindow ? Number(rate.count || 0) : 0;
      if (count >= 3) return { limited: true };
      const ref = db.collection('testimonials').doc();
      transaction.create(ref, {
        userId: decoded.uid,
        name: cleanText(decoded.name || decoded.email?.split('@')[0] || 'CGPA+ student', 80),
        email: cleanText(decoded.email || '', 254),
        photoUrl: typeof decoded.picture === 'string' && decoded.picture.startsWith('https://') ? decoded.picture.slice(0, 1000) : '',
        rating, text, isSample: false, status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      transaction.set(rateRef, { windowStartMs: inWindow ? rate.windowStartMs : now, count: count + 1, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      return { submitted: true };
    });
    if (result.limited) return json(res, 429, { ok: false, error: 'You have submitted several reviews recently. Please wait a few minutes before trying again.' });
    return json(res, 201, { ok: true, message: 'Your review is pending admin approval.' });
  } catch (error) {
    if (['auth/argument-error','auth/id-token-expired','auth/invalid-id-token'].includes(error?.code)) return json(res, 401, { ok: false, error: 'Your session expired. Please sign in again.' });
    console.error('Review submission failed:', error);
    return json(res, 500, { ok: false, error: 'Your review could not be submitted. Please try again.' });
  }
}
