import { configureServices } from '../services/adapter.js';
import { getFirebase } from './firebase-client.js';

const OWNER_ADMIN_UID = 'lmUB6IdhuaOlHjzkqBEyoNkE7PH2';
const now = () => new Date().toISOString();
const rows = snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
const asDate = value => value?.toDate ? value.toDate().toISOString() : (value || null);
const clean = value => Object.fromEntries(Object.entries(value || {}).filter(([, v]) => v !== undefined));
const normalise = value => String(value || '').trim().toLowerCase().replace(/\s+/g, '');

async function sdk() {
  const value = await getFirebase();
  if (!value) throw Object.assign(new Error('Firebase is not configured.'), { code: 'BACKEND_NOT_CONNECTED' });
  return value;
}
async function requireUser() {
  const value = await sdk();
  if (!value.auth.currentUser) throw Object.assign(new Error('Authentication required.'), { code: 'unauthorized' });
  return value;
}
async function requireAdmin() {
  const value = await requireUser();
  const user = value.auth.currentUser;
  if (user.uid !== OWNER_ADMIN_UID) {
    const token = await user.getIdTokenResult(true);
    if (token.claims.admin !== true && token.claims.role !== 'admin') throw Object.assign(new Error('Administrator access required.'), { code: 'permission-denied' });
  }
  return value;
}
async function academicProfile(db, uid) {
  const snap = await db.collection('academicProfiles').doc(uid).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}
async function findStudent(db, matriculationNumber) {
  const wanted = normalise(matriculationNumber);
  if (!wanted) throw Object.assign(new Error('Enter the student matriculation number.'), { code: 'validation/student-id' });
  const profiles = rows(await db.collection('academicProfiles').get());
  const profile = profiles.find(item => normalise(item.matriculationNumber || item.matricNo || item.matNumber) === wanted);
  if (!profile) throw Object.assign(new Error(`No student was found with matriculation number “${matriculationNumber}”.`), { code: 'not-found/student' });
  const userSnap = await db.collection('users').doc(profile.id).get();
  if (!userSnap.exists || userSnap.data()?.accountStatus === 'deleted') throw Object.assign(new Error('The student account could not be found.'), { code: 'not-found/student' });
  return { user: { id: userSnap.id, ...userSnap.data() }, profile };
}
async function resultRows(db, uid, request = {}) {
  const snap = await db.collection('results').where('userId', '==', uid).get();
  const from = request.from ? new Date(`${request.from}T00:00:00`) : null;
  const to = request.to ? new Date(`${request.to}T23:59:59.999`) : null;
  return rows(snap).map(row => ({ ...row, createdAt: asDate(row.createdAt) })).filter(row => {
    const created = row.createdAt ? new Date(row.createdAt) : null;
    return (!from || !created || created >= from) && (!to || !created || created <= to);
  });
}
function summary(results) {
  const totalCredits = results.reduce((sum, row) => sum + Number(row.credits || 0), 0);
  const qualityPoints = results.reduce((sum, row) => sum + Number(row.qualityPoints ?? Number(row.credits || 0) * Number(row.points || 0)), 0);
  const gpa = totalCredits ? qualityPoints / totalCredits : 0;
  return { gpa, cgpa: gpa, totalCredits, qualityPoints, maxPoint: 5 };
}
function dateFiltered(items, request) {
  const from = request.from ? new Date(`${request.from}T00:00:00`) : null;
  const to = request.to ? new Date(`${request.to}T23:59:59.999`) : null;
  return items.filter(item => { const created = item.createdAt ? new Date(item.createdAt) : null; return (!from || !created || created >= from) && (!to || !created || created <= to); });
}
async function adminPreview(request) {
  const { db } = await requireAdmin();
  const type = request.type || 'academic';
  if (type === 'academic' || type === 'semester') {
    const { user, profile } = await findStudent(db, request.studentId);
    const courses = await resultRows(db, user.id, request);
    return { id: request.reportId || null, studentName: user.fullName || user.email || 'Student', sessionName: type === 'semester' ? 'Semester report' : 'Academic record', createdAt: now(), matriculationNumber: profile.matriculationNumber || '', summary: summary(courses), courses };
  }
  if (type === 'support') {
    const tickets = dateFiltered(rows(await db.collection('supportTickets').get()).map(row => ({ ...row, createdAt: asDate(row.createdAt) })), request);
    return { id: request.reportId || null, studentName: 'CGPA+ Support Centre', sessionName: 'Support report', createdAt: now(), summary: { gpa: 0, cgpa: 0, totalCredits: tickets.length, qualityPoints: 0 }, courses: tickets.slice(0, 100).map(ticket => ({ id: ticket.id, code: ticket.id, credits: 0, grade: ticket.status || 'open', qualityPoints: 0, title: ticket.subject || ticket.message || 'Support request' })) };
  }
  const users = dateFiltered(rows(await db.collection('users').get()).filter(user => user.id !== OWNER_ADMIN_UID && user.role !== 'admin' && user.accountStatus !== 'deleted').map(user => ({ ...user, createdAt: asDate(user.createdAt) })), request);
  return { id: request.reportId || null, studentName: 'CGPA+ Platform', sessionName: 'Platform report', createdAt: now(), summary: { gpa: 0, cgpa: 0, totalCredits: users.length, qualityPoints: 0 }, courses: users.slice(0, 100).map(user => ({ id: user.id, code: user.id, credits: 0, grade: user.accountStatus || 'active', qualityPoints: 0, title: user.fullName || user.email || 'Student' })) };
}
async function reportPreview(request = {}) {
  const { db, auth } = await requireUser();
  if (request.scope === 'admin') return adminPreview(request);
  const uid = auth.currentUser.uid;
  const results = await resultRows(db, uid, request);
  return { id: request.reportId || null, studentName: auth.currentUser.displayName || auth.currentUser.email || 'Student', sessionName: request.type === 'semester' ? 'Semester report' : 'Academic summary', createdAt: now(), summary: summary(results), courses: results };
}
async function generate(request = {}) {
  const { db, auth } = await requireUser();
  const preview = request.scope === 'admin' ? await adminPreview(request) : await reportPreview(request);
  const ref = await db.collection('reports').add({ userId: auth.currentUser.uid, name: request.scope === 'admin' ? `CGPA+ ${request.type || 'academic'} report` : 'CGPA+ Academic Report', type: request.type || 'academic', status: 'generated', preview, createdAt: window.firebase.firestore.FieldValue.serverTimestamp() });
  return { id: ref.id, status: 'generated', preview: { ...preview, id: ref.id } };
}
function reportText(preview, type) {
  return ['CGPA+ UniPort Report', 'Independent CGPA+ document — not an official University of Port Harcourt transcript.', '', `Report type: ${type || 'Academic report'}`, `Student: ${preview.studentName}`, `Matriculation number: ${preview.matriculationNumber || '--'}`, `CGPA: ${Number(preview.summary?.cgpa || 0).toFixed(2)}`, `GPA: ${Number(preview.summary?.gpa || 0).toFixed(2)}`, `Credit units: ${preview.summary?.totalCredits || 0}`, `Quality points: ${Number(preview.summary?.qualityPoints || 0).toFixed(2)}`, '', 'Course,Credits,Grade,Points,Quality points', ...(preview.courses || []).map(row => `${row.code || row.id || ''},${row.credits || 0},${row.grade || ''},${row.points || 0},${row.qualityPoints || 0}`)].join('\n');
}
export function registerReportAdminFix() {
  configureServices({ report: {
    async getReports(request = {}) { const { db, auth } = await requireUser(); if (request.scope === 'admin') { await requireAdmin(); return rows(await db.collection('reports').get()).map(row => ({ ...row, createdAt: asDate(row.createdAt) })).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))); } return rows(await db.collection('reports').where('userId', '==', auth.currentUser.uid).get()).map(row => ({ ...row, createdAt: asDate(row.createdAt) })).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))); },
    async getReportPreview(request = {}) { return reportPreview(request); },
    async generateReport(request = {}) { return generate(request); },
    async downloadReport(request = {}) { const preview = await reportPreview(request); return new Blob([reportText(preview, request.type)], { type: 'text/plain;charset=utf-8' }); },
    async printReport(request = {}) { return { preview: await reportPreview(request) }; },
  }});
}
