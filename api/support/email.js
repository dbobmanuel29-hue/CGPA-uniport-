import admin from 'firebase-admin';

const OWNER_ADMIN_UID = 'lmUB6IdhuaOlHjzkqBEyoNkE7PH2';

function getAdminApp() {
  if (admin.apps.length) return admin.app();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured.');
  return admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
}

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(body));
}

async function verify(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) throw Object.assign(new Error('Authentication required.'), { code: 'unauthorized' });
  const app = getAdminApp();
  const token = await admin.auth(app).verifyIdToken(header.slice(7));
  const db = admin.firestore(app);
  if (token.uid !== OWNER_ADMIN_UID && token.admin !== true && token.role !== 'admin') {
    const account = await db.collection('users').doc(token.uid).get();
    if (!account.exists || account.data()?.role !== 'admin') {
      // Students are allowed to trigger support email notifications for their own
      // authenticated support request; the endpoint never exposes the destination.
    }
  }
  return { token, db };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  try {
    const { token, db } = await verify(req);
    const body = req.body || {};
    const supportSnap = await db.collection('adminSettings').doc('support').get();
    const settings = supportSnap.exists ? (supportSnap.data()?.settings || supportSnap.data() || {}) : {};
    const to = String(settings.supportEmail || '').trim();
    if (!to) return json(res, 200, { ok: true, emailSent: false, reason: 'support-email-not-configured' });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return json(res, 200, { ok: true, emailSent: false, reason: 'RESEND_API_KEY-not-configured' });

    const event = body.event === 'support_reply' ? 'Support reply' : 'New support request';
    const subject = String(body.subject || 'CGPA+ Support request').slice(0, 180);
    const message = String(body.message || '').slice(0, 5000);
    const ticketId = String(body.ticketId || '');
    const sender = token.email || 'Authenticated CGPA+ user';
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2>CGPA+ ${event}</h2>
        <p><strong>Ticket:</strong> ${ticketId || 'N/A'}</p>
        <p><strong>From:</strong> ${sender}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <div style="white-space:pre-wrap;border:1px solid #ddd;padding:16px;border-radius:8px">${message.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
      </div>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: process.env.SUPPORT_EMAIL_FROM || 'CGPA+ Support <onboarding@resend.dev>',
        to: [to],
        subject: `[CGPA+] ${event}: ${subject}`,
        html,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Support email delivery failed:', detail);
      return json(res, 502, { ok: false, emailSent: false, error: 'Support email delivery failed.' });
    }

    return json(res, 200, { ok: true, emailSent: true });
  } catch (error) {
    console.error('Support email handler failed:', error);
    const status = error?.code === 'unauthorized' ? 401 : 500;
    return json(res, status, { ok: false, error: error?.message || 'Support email could not be sent.' });
  }
}
