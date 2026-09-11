import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const getAdmin = () => {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured.');
    const serviceAccount = JSON.parse(raw);
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
};

function isAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.authorization === `Bearer ${secret}`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  if (!isAuthorized(req)) return res.status(401).json({ ok: false, error: 'Unauthorized.' });

  try {
    const db = getAdmin();
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 1);
    const snapshot = await db.collection('reports')
      .where('createdAt', '<=', cutoff)
      .limit(450)
      .get();

    if (snapshot.empty) return res.status(200).json({ ok: true, deleted: 0 });

    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    return res.status(200).json({ ok: true, deleted: snapshot.size });
  } catch (error) {
    console.error('Report cleanup failed:', error);
    return res.status(500).json({ ok: false, error: 'Report cleanup failed.' });
  }
}
