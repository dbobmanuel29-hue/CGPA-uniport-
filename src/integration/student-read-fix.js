import { configureServices } from '../services/adapter.js';
import { academicService } from '../services/academic-service.js';
import { getFirebase } from './firebase-client.js';
import { FALLBACK_LEVELS, FALLBACK_SEMESTERS, FALLBACK_SESSIONS } from '../data/uniport-catalogue.js';

const lookup = (rows, id) => rows.find(row => row.id === id)?.name || '';
const clean = value => Object.fromEntries(Object.entries(value || {}).filter(([, v]) => v !== undefined));
const dateValue = value => value?.toDate ? value.toDate().toISOString() : (value || null);

function normalizeResult(row) {
  return clean({
    ...row,
    sessionName: row.sessionName || lookup(FALLBACK_SESSIONS, row.sessionId),
    semesterName: row.semesterName || lookup(FALLBACK_SEMESTERS, row.semesterId),
    levelName: row.levelName || lookup(FALLBACK_LEVELS, row.levelId),
    createdAt: dateValue(row.createdAt),
    updatedAt: dateValue(row.updatedAt),
  });
}

function filterRows(rows, filters = {}) {
  return rows.filter(row => (!filters.sessionId || row.sessionId === filters.sessionId) && (!filters.semesterId || row.semesterId === filters.semesterId) && (!filters.levelId || row.levelId === filters.levelId));
}

// Keep every attempt in academic history, but use only the latest attempt for
// the same course when calculating cumulative CGPA. A carry-over therefore
// replaces the failed attempt in the cumulative calculation instead of being
// counted as an additional course.
function effectiveAttempts(results) {
  const groups = new Map();
  results.forEach(row => {
    const key = String(row.originalCourseCode || row.code || row.id).trim().toUpperCase();
    const current = groups.get(key);
    const currentTime = String(current?.updatedAt || current?.createdAt || '');
    const rowTime = String(row.updatedAt || row.createdAt || '');
    if (!current || rowTime >= currentTime) groups.set(key, row);
  });
  return [...groups.values()];
}

function calculate(results, maxPoint = 5) {
  const totalCredits = results.reduce((sum, row) => sum + Number(row.credits || 0), 0);
  const qualityPoints = results.reduce((sum, row) => sum + Number(row.qualityPoints ?? Number(row.credits || 0) * Number(row.points || 0)), 0);
  return { gpa: totalCredits ? qualityPoints / totalCredits : 0, cgpa: totalCredits ? qualityPoints / totalCredits : 0, totalCredits, qualityPoints, maxPoint };
}

async function readResults() {
  const sdk = await getFirebase();
  if (!sdk?.auth.currentUser) throw Object.assign(new Error('Your session has expired. Please sign in again.'), { code: 'unauthorized' });
  const snap = await sdk.db.collection('results').where('userId', '==', sdk.auth.currentUser.uid).get();
  return snap.docs.map(doc => normalizeResult({ id: doc.id, ...doc.data() }));
}

function semesterSeries(results) {
  const groups = new Map();
  results.forEach(row => {
    const key = `${row.sessionId || ''}::${row.semesterId || ''}::${row.levelId || ''}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });
  let cumulativeCredits = 0;
  let cumulativeQuality = 0;
  return [...groups.values()].map(rows => {
    const summary = calculate(rows);
    cumulativeCredits += summary.totalCredits;
    cumulativeQuality += summary.qualityPoints;
    return { label: rows[0]?.semesterName || rows[0]?.semesterId || 'Semester', sessionName: rows[0]?.sessionName || rows[0]?.sessionId || '', levelName: rows[0]?.levelName || rows[0]?.levelId || '', gpa: summary.gpa, cgpa: cumulativeCredits ? cumulativeQuality / cumulativeCredits : 0, credits: summary.totalCredits, qualityPoints: summary.qualityPoints };
  });
}

export async function registerStudentReadFix() {
  configureServices({ academic: {
    getResults: async filters => filterRows(await readResults(), filters),
    getResult: async resultId => (await readResults()).find(row => row.id === resultId) || null,
    getSummary: async filters => { const results = filterRows(await readResults(), filters); const all = await readResults(); return { ...calculate(effectiveAttempts(results)), cgpa: calculate(effectiveAttempts(all)).cgpa }; },
    getAnalytics: async () => {
      const results = await readResults();
      const effective = effectiveAttempts(results);
      const summary = calculate(effective);
      const series = semesterSeries(results);
      const grades = {};
      effective.forEach(row => { const grade = row.grade || 'Unknown'; grades[grade] = (grades[grade] || 0) + 1; });
      const gpas = series.map(row => row.gpa);
      const failed = effective.filter(row => Number(row.points) === 0).length;
      return { maxPoint: 5, stats: { cgpa: summary.cgpa, highestGpa: gpas.length ? Math.max(...gpas) : 0, lowestGpa: gpas.length ? Math.min(...gpas) : 0, averageGpa: gpas.length ? gpas.reduce((sum, value) => sum + value, 0) / gpas.length : 0, totalCredits: summary.totalCredits, failedCourses: failed, repeatedCourses: results.length - effective.length, bestSemester: [...series].sort((a, b) => b.gpa - a.gpa)[0]?.label || '--', weakestSemester: [...series].sort((a, b) => a.gpa - b.gpa)[0]?.label || '--' }, series, grades: Object.entries(grades).map(([label, value]) => ({ label, value })), passed: effective.length - failed, failed };
    },
    getDashboard: async () => {
      const [profile, results, analytics] = await Promise.all([academicService.getProfile(), readResults(), academicService.getAnalytics()]);
      const effective = effectiveAttempts(results);
      const summary = calculate(effective);
      const current = profile?.currentSessionId && profile?.currentSemesterId ? results.filter(row => row.sessionId === profile.currentSessionId && row.semesterId === profile.currentSemesterId && (!profile.currentLevelId || row.levelId === profile.currentLevelId)) : [];
      const currentSummary = calculate(current);
      let notifications = [];
      try { const sdk = await getFirebase(); const snap = await sdk.db.collection('notifications').where('userId', '==', sdk.auth.currentUser.uid).get(); notifications = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: dateValue(doc.data().createdAt) })).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))); } catch {}
      return { summary: { ...summary, classification: summary.cgpa >= 4.5 ? 'First Class' : summary.cgpa >= 3.5 ? 'Second Class Upper' : summary.cgpa >= 2.4 ? 'Second Class Lower' : summary.cgpa >= 1.5 ? 'Third Class' : summary.cgpa >= 1 ? 'Pass' : 'Awaiting result data' }, gpaTrend: analytics.series, cgpaProgressPercent: (summary.cgpa / 5) * 100, academicProgress: { percent: null, completedCredits: summary.totalCredits, remainingCredits: null }, currentSemester: profile ? { sessionName: profile.currentSessionName || '--', semesterName: profile.currentSemesterName || '--', levelName: profile.currentLevelName || '--', courseCount: current.length, gpa: currentSummary.gpa } : null, recentResults: [...results].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 5), notifications: notifications.slice(0, 5) };
    },
  } });
}
