import { configureServices } from '../services/adapter.js';
import { getFirebase } from './firebase-client.js';

const OWNER_ADMIN_UID = 'lmUB6IdhuaOlHjzkqBEyoNkE7PH2';
const now = () => new Date().toISOString();
const rows = snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
const asDate = value => value?.toDate ? value.toDate().toISOString() : (value || null);
const fail = (message, code) => Object.assign(new Error(message), { code });

async function sdk() { const value = await getFirebase(); if (!value) throw fail('Firebase is not configured.', 'BACKEND_NOT_CONNECTED'); return value; }
async function requireUser() { const value = await sdk(); if (!value.auth.currentUser) throw fail('Authentication required.', 'unauthorized'); return value; }
async function requireAdmin() { const value = await requireUser(); const user = value.auth.currentUser; if (user.uid !== OWNER_ADMIN_UID) { const token = await user.getIdTokenResult(true); if (token.claims.admin !== true && token.claims.role !== 'admin') throw fail('Administrator access required.', 'permission-denied'); } return value; }

async function findStudent(db, studentId) {
  const uid = String(studentId || '').trim();
  if (!uid) throw fail('Enter the student Firebase ID.', 'validation/student-id');
  try {
    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists || userSnap.data()?.accountStatus === 'deleted') throw fail(`No student was found with Firebase ID “${uid}”.`, 'not-found/student');
    const profileSnap = await db.collection('academicProfiles').doc(uid).get();
    const profile = profileSnap.exists ? { id: profileSnap.id, ...profileSnap.data() } : { id: uid };
    return { user: { id: userSnap.id, ...userSnap.data() }, profile };
  } catch (error) {
    if (error?.code?.startsWith('not-found/') || error?.code?.startsWith('validation/')) throw error;
    throw fail(`The student lookup could not be completed. Firebase reported: ${error?.message || 'unknown error'}`, 'report/lookup-failed');
  }
}

async function resultRows(db, uid) {
  try { const snap = await db.collection('results').where('userId', '==', uid).get(); return rows(snap).map(row => ({ ...row, createdAt: asDate(row.createdAt) })); }
  catch (error) { throw fail(`The student's results could not be loaded. Firebase reported: ${error?.message || 'unknown error'}`, 'report/results-failed'); }
}
function summary(results) { const totalCredits = results.reduce((sum, row) => sum + Number(row.credits || 0), 0); const qualityPoints = results.reduce((sum, row) => sum + Number(row.qualityPoints ?? Number(row.credits || 0) * Number(row.points || 0)), 0); const gpa = totalCredits ? qualityPoints / totalCredits : 0; return { gpa, cgpa: gpa, totalCredits, qualityPoints, maxPoint: 5 }; }
function dateFiltered(items, request) { return items; }

async function adminPreview(request) {
  const { db } = await requireAdmin();
  if (request.reportId) { const snap = await db.collection('reports').doc(request.reportId).get(); if (!snap.exists) throw fail('Report not found.', 'not-found/report'); return { ...(snap.data().preview || {}), id: snap.id }; }
  const type = request.type || 'academic';
  if (type === 'academic' || type === 'semester') {
    const { user, profile } = await findStudent(db, request.studentId);
    const courses = await resultRows(db, user.id);
    return { id: null, studentName: user.fullName || user.email || 'Student', sessionName: type === 'semester' ? 'Semester report' : 'Academic record', createdAt: now(), firebaseStudentId: user.id, matriculationNumber: profile.matriculationNumber || profile.matricNo || profile.matNumber || '', summary: summary(courses), courses };
  }
  if (type === 'support') { const tickets = dateFiltered(rows(await db.collection('supportTickets').get()).map(row => ({ ...row, createdAt: asDate(row.createdAt) })), request); return { id: null, studentName: 'CGPA+ Support Centre', sessionName: 'Support report', createdAt: now(), summary: { gpa: 0, cgpa: 0, totalCredits: tickets.length, qualityPoints: 0 }, courses: tickets.slice(0, 100).map(ticket => ({ id: ticket.id, code: ticket.id, credits: 0, grade: ticket.status || 'open', qualityPoints: 0, title: ticket.subject || ticket.message || 'Support request' })) }; }
  const users = dateFiltered(rows(await db.collection('users').get()).filter(user => user.id !== OWNER_ADMIN_UID && user.role !== 'admin' && user.accountStatus !== 'deleted').map(user => ({ ...user, createdAt: asDate(user.createdAt) })), request);
  return { id: null, studentName: 'CGPA+ Platform', sessionName: 'Platform report', createdAt: now(), summary: { gpa: 0, cgpa: 0, totalCredits: users.length, qualityPoints: 0 }, courses: users.slice(0, 100).map(user => ({ id: user.id, code: user.id, credits: 0, grade: user.accountStatus || 'active', qualityPoints: 0, title: user.fullName || user.email || 'Student' })) };
}
async function reportPreview(request = {}) { const { db, auth } = await requireUser(); if (request.scope === 'admin') return adminPreview(request); const results = await resultRows(db, auth.currentUser.uid); return { id: request.reportId || null, studentName: auth.currentUser.displayName || auth.currentUser.email || 'Student', sessionName: request.type === 'semester' ? 'Semester report' : 'Academic summary', createdAt: now(), summary: summary(results), courses: results }; }
async function generate(request = {}) { const { db, auth } = await requireUser(); const preview = request.scope === 'admin' ? await adminPreview(request) : await reportPreview(request); const ref = await db.collection('reports').add({ userId: auth.currentUser.uid, name: request.scope === 'admin' ? `CGPA+ ${request.type || 'academic'} report` : 'CGPA+ Academic Report', type: request.type || 'academic', status: 'generated', preview, createdAt: window.firebase.firestore.FieldValue.serverTimestamp() }); return { id: ref.id, status: 'generated', preview: { ...preview, id: ref.id } }; }
function reportText(preview, type) { return ['CGPA+ UniPort Report', 'Independent CGPA+ document — not an official University of Port Harcourt transcript.', '', `Report type: ${type || 'Academic report'}`, `Student: ${preview.studentName}`, `Firebase student ID: ${preview.firebaseStudentId || '--'}`, `Matriculation number: ${preview.matriculationNumber || '--'}`, `CGPA: ${Number(preview.summary?.cgpa || 0).toFixed(2)}`, `GPA: ${Number(preview.summary?.gpa || 0).toFixed(2)}`, `Credit units: ${preview.summary?.totalCredits || 0}`, `Quality points: ${Number(preview.summary?.qualityPoints || 0).toFixed(2)}`, '', 'Course,Credits,Grade,Points,Quality points', ...(preview.courses || []).map(row => `${row.code || row.id || ''},${row.credits || 0},${row.grade || ''},${row.points || 0},${row.qualityPoints || 0}`)].join('\n'); }
export function registerReportAdminFix() { configureServices({ report: { async getReports(request = {}) { const { db, auth } = await requireUser(); if (request.scope === 'admin') { await requireAdmin(); return rows(await db.collection('reports').get()).map(row => ({ ...row, createdAt: asDate(row.createdAt) })).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))); } return rows(await db.collection('reports').where('userId', '==', auth.currentUser.uid).get()).map(row => ({ ...row, createdAt: asDate(row.createdAt) })).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))); }, async getReportPreview(request = {}) { return reportPreview(request); }, async generateReport(request = {}) { return generate(request); }, async downloadReport(request = {}) { const preview = await reportPreview(request); return new Blob([reportText(preview, request.type)], { type: 'text/plain;charset=utf-8' }); }, async printReport(request = {}) { return { preview: await reportPreview(request) }; } }}); }
