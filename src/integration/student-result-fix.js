import { configureServices } from '../services/adapter.js';
import { academicService } from '../services/academic-service.js';
import { getFirebase } from './firebase-client.js';

function normalizeResult(payload) {
  const credits = Number(payload?.credits);
  const points = Number(payload?.points);
  const code = String(payload?.code || '').trim().toUpperCase();
  const title = String(payload?.title || '').trim();
  const grade = String(payload?.grade || '').trim().toUpperCase();
  const sessionId = String(payload?.sessionId || '').trim();
  const semesterId = String(payload?.semesterId || '').trim();
  const levelId = String(payload?.levelId || '').trim();

  if (!code || !title || !grade) throw Object.assign(new Error('Course code, course title and grade are required.'), { code: 'validation/invalid-result' });
  if (!Number.isFinite(credits) || credits <= 0) throw Object.assign(new Error('Credit units must be a valid number greater than 0.'), { code: 'validation/invalid-credits' });
  if (!Number.isFinite(points) || points < 0 || points > 5) throw Object.assign(new Error('Grade point must be a valid number from 0 to 5.'), { code: 'validation/invalid-grade-point' });
  if (!sessionId || !semesterId || !levelId) throw Object.assign(new Error('Academic session, semester and level are required.'), { code: 'validation/incomplete-academic-context' });

  return { code, title, grade, credits, points, sessionId, semesterId, levelId, qualityPoints: credits * points };
}

function friendlyFirestoreError(error) {
  if (error?.code === 'permission-denied') return new Error('Firebase denied this result. Please make sure you are signed in and that the latest Firestore rules are published.');
  if (error?.code === 'unavailable') return new Error('Firebase is temporarily offline. Check your internet connection and try again.');
  if (error?.code === 'failed-precondition') return new Error('Firebase needs a database/index setup before this result can be saved.');
  if (error?.code === 'invalid-argument') return new Error('One of the result fields contains an invalid value. Check the credit units and grade.');
  return error;
}

export async function registerStudentResultFix() {
  const originalSave = academicService.saveResult;
  const originalUpdate = academicService.updateResult;

  configureServices({
    academic: {
      saveResult: async payload => {
        const result = normalizeResult(payload);
        try {
          const sdk = await getFirebase();
          if (!sdk?.auth.currentUser) throw Object.assign(new Error('Your session has expired. Please sign in again.'), { code: 'unauthorized' });
          return await originalSave(result);
        } catch (error) {
          throw friendlyFirestoreError(error);
        }
      },
      updateResult: async (resultId, payload) => {
        const result = normalizeResult(payload);
        try {
          const sdk = await getFirebase();
          if (!sdk?.auth.currentUser) throw Object.assign(new Error('Your session has expired. Please sign in again.'), { code: 'unauthorized' });
          return await originalUpdate(resultId, result);
        } catch (error) {
          throw friendlyFirestoreError(error);
        }
      },
    },
  });
  return true;
}
