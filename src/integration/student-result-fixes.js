import { configureServices } from '../services/adapter.js';
import { academicService } from '../services/academic-service.js';
import { getFirebase } from './firebase-client.js';
import { FALLBACK_LEVELS, FALLBACK_SEMESTERS, FALLBACK_SESSIONS } from '../data/uniport-catalogue.js';

const lookup = (rows, id) => rows.find(row => row.id === id)?.name || '';
const normalize = row => ({ ...row, sessionName: row.sessionName || lookup(FALLBACK_SESSIONS, row.sessionId), semesterName: row.semesterName || lookup(FALLBACK_SEMESTERS, row.semesterId), levelName: row.levelName || lookup(FALLBACK_LEVELS, row.levelId), attemptType: row.attemptType || 'regular', originalCourseCode: row.originalCourseCode || '' });

function normalizePayload(payload) {
  const credits = Number(payload?.credits); const points = Number(payload?.points); const code = String(payload?.code || '').trim().toUpperCase(); const title = String(payload?.title || '').trim(); const grade = String(payload?.grade || '').trim().toUpperCase(); const sessionId = String(payload?.sessionId || '').trim(); const semesterId = String(payload?.semesterId || '').trim(); const levelId = String(payload?.levelId || '').trim(); const attemptType = payload?.attemptType === 'carryover' ? 'carryover' : 'regular'; const originalCourseCode = attemptType === 'carryover' ? String(payload?.originalCourseCode || code).trim().toUpperCase() : '';
  if (!code || !title || !grade) throw Object.assign(new Error('Course code, course title and grade are required.'), { code: 'validation/invalid-result' });
  if (!Number.isFinite(credits) || credits <= 0) throw Object.assign(new Error('Credit units must be a valid number greater than 0.'), { code: 'validation/invalid-credits' });
  if (!Number.isFinite(points) || points < 0 || points > 5) throw Object.assign(new Error('Grade point must be a valid number from 0 to 5.'), { code: 'validation/invalid-grade-point' });
  if (!sessionId || !semesterId || !levelId) throw Object.assign(new Error('Academic session, semester and level are required.'), { code: 'validation/incomplete-academic-context' });
  return { code, title, grade, credits, points, sessionId, semesterId, levelId, attemptType, originalCourseCode, qualityPoints: credits * points };
}

function friendlyError(error) {
  if (error?.code === 'permission-denied') return Object.assign(new Error('Firebase denied this result. Please make sure you are signed in and the latest Firestore rules are published.'), { code: error.code });
  if (error?.code === 'unavailable') return Object.assign(new Error('Firebase is temporarily offline. Check your internet connection and try again.'), { code: error.code });
  if (error?.code === 'failed-precondition') return Object.assign(new Error('Firebase needs a database/index setup before this result can be saved.'), { code: error.code });
  if (error?.code === 'invalid-argument') return Object.assign(new Error('One of the result fields contains an invalid value. Check the credit units and grade.'), { code: error.code });
  return error;
}

export async function registerStudentResultFixes() {
  const originalGetResults = academicService.getResults; const originalGetResult = academicService.getResult;
  configureServices({ academic: {
    getResults: async filters => (await originalGetResults(filters)).map(normalize),
    getResult: async resultId => { const result = await originalGetResult(resultId); return result ? normalize(result) : result; },
    saveResult: async payload => { const result = normalizePayload(payload); try { const sdk = await getFirebase(); if (!sdk?.auth.currentUser) throw Object.assign(new Error('Your session has expired. Please sign in again.'), { code: 'unauthorized' }); const user = sdk.auth.currentUser; const ref = await sdk.db.collection('results').add({ ...result, userId: user.uid, status: result.points === 0 ? 'failed' : 'passed', createdAt: window.firebase.firestore.FieldValue.serverTimestamp(), updatedAt: window.firebase.firestore.FieldValue.serverTimestamp() }); return normalize({ id: ref.id, ...result, userId: user.uid, status: result.points === 0 ? 'failed' : 'passed' }); } catch (error) { throw friendlyError(error); } },
    updateResult: async (resultId, payload) => { const result = normalizePayload(payload); try { const sdk = await getFirebase(); if (!sdk?.auth.currentUser) throw Object.assign(new Error('Your session has expired. Please sign in again.'), { code: 'unauthorized' }); const user = sdk.auth.currentUser; const ref = sdk.db.collection('results').doc(resultId); const snap = await ref.get(); if (!snap.exists || snap.data().userId !== user.uid) throw Object.assign(new Error('Result not found.'), { code: 'not-found' }); const status = result.points === 0 ? 'failed' : 'passed'; await ref.set({ ...result, userId: user.uid, status, updatedAt: window.firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }); return normalize({ id: resultId, ...result, userId: user.uid, status }); } catch (error) { throw friendlyError(error); } },
    deleteResult: async resultId => { try { const sdk = await getFirebase(); if (!sdk?.auth.currentUser) throw Object.assign(new Error('Your session has expired. Please sign in again.'), { code: 'unauthorized' }); const user = sdk.auth.currentUser; const ref = sdk.db.collection('results').doc(resultId); const snap = await ref.get(); if (!snap.exists || snap.data().userId !== user.uid) throw Object.assign(new Error('Result not found.'), { code: 'not-found' }); await ref.delete(); return { id: resultId, deleted: true }; } catch (error) { throw friendlyError(error); } },
  } });
}
