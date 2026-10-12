import admin from 'firebase-admin';

const OWNER_ADMIN_UID = 'lmUB6IdhuaOlHjzkqBEyoNkE7PH2';
const nowIso = () => new Date().toISOString();
const safeText = value => String(value ?? '').replace(/[\r\n\t]+/g, ' ').trim();

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(body));
}

function getAdminApp() {
  if (admin.apps.length) return admin.app();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw Object.assign(new Error('Report backend is not configured.'), { code: 'reports/not-configured' });
  return admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
}

async function authenticate(req) {
  const authorization = req.headers.authorization || '';
  if (!authorization.startsWith('Bearer ')) throw Object.assign(new Error('Please sign in again.'), { code: 'unauthorized' });
  const app = getAdminApp();
  const decoded = await admin.auth(app).verifyIdToken(authorization.slice(7));
  const db = admin.firestore(app);
  let isAdmin = decoded.uid === OWNER_ADMIN_UID || decoded.admin === true || decoded.role === 'admin';
  if (!isAdmin) {
    const account = await db.collection('users').doc(decoded.uid).get();
    isAdmin = account.exists && account.data()?.role === 'admin';
  }
  return { app, db, user: decoded, isAdmin };
}

function courseRows(snapshot) {
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

function summary(courses) {
  const totalCredits = courses.reduce((sum, row) => sum + Number(row.credits || 0), 0);
  const qualityPoints = courses.reduce((sum, row) => sum + Number(row.qualityPoints ?? Number(row.credits || 0) * Number(row.points || 0)), 0);
  const gpa = totalCredits ? qualityPoints / totalCredits : 0;
  return { gpa, cgpa: gpa, totalCredits, qualityPoints, maxPoint: 5 };
}

async function buildPreview(db, user, isAdmin, request) {
  if (request.scope === 'admin' && !isAdmin) throw Object.assign(new Error('Administrator access required.'), { code: 'permission-denied' });
  if (request.scope !== 'admin') {
    let query = db.collection('results').where('userId', '==', user.uid);
    const snap = await query.get();
    let courses = courseRows(snap);
    if (request.sessionId) courses = courses.filter(row => row.sessionId === request.sessionId);
    if (request.semesterId) courses = courses.filter(row => row.semesterId === request.semesterId);
    const account = await db.collection('users').doc(user.uid).get();
    const profile = await db.collection('academicProfiles').doc(user.uid).get();
    return {
      studentName: account.data()?.fullName || user.name || user.email || 'Student',
      university: 'University of Port Harcourt',
      sessionName: request.type === 'semester' ? 'Semester report' : (request.sessionId || 'All academic sessions'),
      createdAt: nowIso(),
      summary: summary(courses),
      courses,
    };
  }

  const type = request.type || 'academic';
  if (type === 'academic' || type === 'semester') {
    const studentId = safeText(request.studentId);
    if (!studentId) throw Object.assign(new Error('Enter the student Firebase ID.'), { code: 'validation/student-id' });
    const student = await db.collection('users').doc(studentId).get();
    if (!student.exists || student.data()?.accountStatus === 'deleted') throw Object.assign(new Error('No student was found with that Firebase ID.'), { code: 'not-found/student' });
    const profile = await db.collection('academicProfiles').doc(studentId).get();
    const snap = await db.collection('results').where('userId', '==', studentId).get();
    const courses = courseRows(snap);
    return {
      studentName: student.data()?.fullName || student.data()?.email || 'Student',
      firebaseStudentId: studentId,
      matriculationNumber: profile.data()?.matriculationNumber || profile.data()?.matricNo || '',
      university: 'University of Port Harcourt',
      sessionName: type === 'semester' ? 'Semester report' : 'Academic record',
      createdAt: nowIso(),
      summary: summary(courses),
      courses,
    };
  }

  const collection = type === 'support' ? 'supportTickets' : type === 'payment' ? 'transactions' : 'users';
  const snap = await db.collection(collection).limit(500).get();
  const items = courseRows(snap).filter(row => row.id !== OWNER_ADMIN_UID && row.role !== 'admin' && row.accountStatus !== 'deleted');
  const label = type === 'support' ? 'Support requests' : type === 'payment' ? 'Transactions' : 'Students';
  const courses = items.map(row => ({
    id: row.id,
    code: row.id,
    title: row.subject || row.fullName || row.email || row.name || label.slice(0, -1),
    credits: 0,
    grade: row.status || row.accountStatus || '--',
    points: 0,
    qualityPoints: 0,
  }));
  return {
    studentName: 'CGPA+ Platform',
    university: 'CGPA+',
    sessionName: type === 'support' ? 'Support report' : type === 'payment' ? 'Payment report' : 'Platform report',
    createdAt: nowIso(),
    summary: { gpa: 0, cgpa: 0, totalCredits: items.length, qualityPoints: 0, maxPoint: 5 },
    courses,
  };
}

function ascii(value) {
  return safeText(value).normalize('NFKD').replace(/[^\x20-\x7E]/g, '?');
}
function escapePdf(value) {
  return ascii(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}
function wrap(value, width = 94) {
  const words = ascii(value).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (!word) continue;
    if (word.length > width) {
      if (line) lines.push(line);
      line = '';
      for (let i = 0; i < word.length; i += width) lines.push(word.slice(i, i + width));
      continue;
    }
    if (line && (line + ' ' + word).length > width) { lines.push(line); line = word; }
    else line = line ? line + ' ' + word : word;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}
function makePdf(preview, type) {
  const s = preview.summary || {};
  const lines = [
    'CGPA+ ACADEMIC REPORT',
    'Independent academic planning document - not an official University of Port Harcourt transcript.',
    '',
    'Report type: ' + (type || 'Academic report'),
    'Student: ' + (preview.studentName || 'Student'),
    'University: ' + (preview.university || 'University of Port Harcourt'),
    'Academic session: ' + (preview.sessionName || 'All sessions'),
    'Generated: ' + (preview.createdAt || nowIso()),
    ...(preview.firebaseStudentId ? ['Student ID: ' + preview.firebaseStudentId] : []),
    ...(preview.matriculationNumber ? ['Matriculation number: ' + preview.matriculationNumber] : []),
    '',
    'CGPA: ' + Number(s.cgpa || 0).toFixed(2) + '    GPA: ' + Number(s.gpa || 0).toFixed(2),
    'Credit units / records: ' + Number(s.totalCredits || 0) + '    Quality points: ' + Number(s.qualityPoints || 0).toFixed(2),
    '',
    'COURSE DETAILS',
    'Code / ID | Course title | Credits | Grade | Points | Quality points',
    ...((preview.courses || []).length ? preview.courses.map(row =>
      [row.code || row.id || '--', row.title || row.courseTitle || row.courseName || '--', row.credits ?? 0, row.grade || '--', row.points ?? 0, row.qualityPoints ?? Number(row.credits || 0) * Number(row.points || 0)].join(' | ')
    ) : ['No academic records were available for this report.']),
    '',
    'This document is generated by CGPA+ for personal academic planning only. It is not an official transcript,',
    'does not certify results or clearance, and does not confirm graduation eligibility.',
  ].flatMap(line => wrap(line));
  const perPage = 52;
  const pages = [];
  for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
  const objects = [];
  const add = value => { objects.push(value); return objects.length; };
  add('<< /Type /Catalog /Pages 2 0 R >>'); // 1
  add(''); // 2 pages tree, filled after page objects are known
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'); // 3
  const pageIds = [];
  pages.forEach((pageLines, index) => {
    const pageId = objects.length + 1;
    const contentId = pageId + 1;
    pageIds.push(pageId);
    const commands = ['BT', '/F1 9 Tf', '48 760 Td', '13 TL'];
    pageLines.forEach((line, lineIndex) => {
      if (lineIndex) commands.push('T*');
      commands.push('(' + escapePdf(line) + ') Tj');
    });
    commands.push('T*', '(Page ' + (index + 1) + ' of ' + pages.length + ') Tj', 'ET');
    const stream = commands.join('\n');
    add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ' + contentId + ' 0 R >>');
    add('<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream');
  });
  objects[1] = '<< /Type /Pages /Kids [' + pageIds.map(id => id + ' 0 R').join(' ') + '] /Count ' + pageIds.length + ' >>';
  let pdf = '%PDF-1.4\n%CGPA+\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += (index + 1) + ' 0 obj\n' + object + '\nendobj\n';
  });
  const xref = pdf.length;
  pdf += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i += 1) pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  pdf += 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF';
  return Buffer.from(pdf, 'ascii');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'Method not allowed.' });
  }
  try {
    const { db, user, isAdmin } = await authenticate(req);
    const body = req.body || {};
    const action = body.action === 'download' ? 'download' : 'generate';
    const request = body.request && typeof body.request === 'object' ? body.request : {};
    let preview;
    let reportId = request.reportId || null;

    if (action === 'download' && reportId) {
      const saved = await db.collection('reports').doc(String(reportId)).get();
      if (!saved.exists) return json(res, 404, { ok: false, code: 'not-found/report', error: 'That saved report could not be found.' });
      const data = saved.data();
      if (data.userId !== user.uid && !isAdmin) return json(res, 403, { ok: false, code: 'permission-denied', error: 'You cannot download another user’s report.' });
      preview = data.preview || {};
      if (request.scope === 'admin' && !isAdmin) return json(res, 403, { ok: false, code: 'permission-denied', error: 'Administrator access required.' });
    } else {
      preview = await buildPreview(db, user, isAdmin, request);
      if (action === 'generate') {
        const ref = db.collection('reports').doc();
        reportId = ref.id;
        await ref.set({
          userId: user.uid,
          name: 'CGPA+ ' + (request.type || 'academic') + ' report',
          type: request.type || 'summary',
          status: 'generated',
          preview: { ...preview, id: reportId },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    if (action === 'generate') {
      return json(res, 201, { ok: true, id: reportId, status: 'generated', name: 'CGPA+ ' + (request.type || 'academic') + ' report', preview: { ...preview, id: reportId } });
    }

    const pdf = makePdf(preview, request.type || 'Academic report');
    res.status(200);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="CGPA-Plus-Academic-Report.pdf"');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Length', String(pdf.length));
    return res.end(pdf);
  } catch (error) {
    const code = error?.code || 'reports/generation-failed';
    const status = code === 'unauthorized' || code === 'auth/id-token-expired' || code === 'auth/invalid-id-token' ? 401 : code === 'permission-denied' ? 403 : code === 'not-found/student' || code === 'not-found/report' ? 404 : code === 'validation/student-id' ? 400 : code === 'reports/not-configured' ? 503 : 500;
    console.error('Report generation failed:', code, error?.message);
    return json(res, status, { ok: false, code, error: error?.message || 'The PDF could not be generated. Please try again.' });
  }
}
