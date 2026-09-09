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

function timestamp(row) {
  const value = row?.updatedAt || row?.createdAt;
  const time = Date.parse(String(value || ''));
  return Number.isFinite(time) ? time : 0;
}

// Keep every attempt in history, but only the latest attempt for a course is
// used for cumulative calculations. A carry-over therefore replaces the
// earlier attempt instead of being counted twice.
function effectiveAttempts(results) {
  const groups = new Map();
  results.forEach(row => {
    const key = String(row.originalCourseCode || row.code || row.id).trim().toUpperCase();
    const current = groups.get(key);
    if (!current || timestamp(row) >= timestamp(current)) groups.set(key, row);
  });
  return [...groups.values()];
}

function calculate(results, maxPoint = 5) {
  const totalCredits = results.reduce((sum, row) => sum + Number(row.credits || 0), 0);
  const qualityPoints = results.reduce((sum, row) => sum + Number(row.qualityPoints ?? Number(row.credits || 0) * Number(row.points || 0)), 0);
  const average = totalCredits ? qualityPoints / totalCredits : 0;
  return { gpa: average, cgpa: average, totalCourses: results.length, totalCredits, qualityPoints, maxPoint };
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
  return [...groups.values()]
    .sort((a, b) => timestamp(a[0]) - timestamp(b[0]))
    .map(rows => {
      const summary = calculate(rows);
      const cumulativeRows = effectiveAttempts(results.filter(row => timestamp(row) <= Math.max(...rows.map(timestamp))));
      const cumulative = calculate(cumulativeRows);
      cumulativeCredits = cumulative.totalCredits;
      cumulativeQuality = cumulative.qualityPoints;
      return { label: rows[0]?.semesterName || rows[0]?.semesterId || 'Semester', sessionName: rows[0]?.sessionName || rows[0]?.sessionId || '', levelName: rows[0]?.levelName || rows[0]?.levelId || '', gpa: summary.gpa, cgpa: cumulativeCredits ? cumulativeQuality / cumulativeCredits : 0, credits: summary.totalCredits, qualityPoints: summary.qualityPoints };
    });
}

async function getProfileSafe() {
  try { return await academicService.getProfile(); } catch { return null; }
}

function classification(cgpa) {
  if (!cgpa) return 'Awaiting result data';
  if (cgpa >= 4.5) return 'First Class';
  if (cgpa >= 3.5) return 'Second Class Upper';
  if (cgpa >= 2.4) return 'Second Class Lower';
  if (cgpa >= 1.5) return 'Third Class';
  if (cgpa >= 1) return 'Pass';
  return 'Awaiting result data';
}

async function catalogueCourses(profile) {
  if (!profile?.programmeId) return [];
  try { return await academicService.getCourses({ programmeId: profile.programmeId, academicVersionId: profile.academicVersionId }); } catch { return []; }
}

function courseKey(row) { return String(row.originalCourseCode || row.code || row.id).trim().toUpperCase(); }

function courseLists(results) {
  const effective = effectiveAttempts(results);
  const failed = effective.filter(row => Number(row.points) === 0).map(row => ({ ...row, status: 'failed', note: 'Latest recorded attempt has a failing grade.' }));
  const repeated = results.filter(row => row.attemptType === 'carryover' || row.originalCourseCode).map(row => ({ ...row, status: 'repeated', note: 'Carry-over / retake attempt.' }));
  return { effective, failed, repeated };
}

export async function registerStudentReadFix() {
  configureServices({ academic: {
    getResults: async filters => filterRows(await readResults(), filters),
    getResult: async resultId => (await readResults()).find(row => row.id === resultId) || null,
    getSummary: async filters => {
      const all = await readResults();
      const selected = filterRows(all, filters);
      return { ...calculate(effectiveAttempts(selected)), cgpa: calculate(effectiveAttempts(all)).cgpa };
    },
    getAnalytics: async ({ sessionId = '' } = {}) => {
      const allResults = await readResults();
      const results = sessionId ? filterRows(allResults, { sessionId }) : allResults;
      const effective = effectiveAttempts(results);
      const summary = calculate(effective);
      const series = semesterSeries(results);
      const grades = {};
      effective.forEach(row => { const grade = row.grade || 'Unknown'; grades[grade] = (grades[grade] || 0) + 1; });
      const gpas = series.map(row => row.gpa);
      const failed = effective.filter(row => Number(row.points) === 0).length;
      return { maxPoint: 5, stats: { cgpa: summary.cgpa, highestGpa: gpas.length ? Math.max(...gpas) : 0, lowestGpa: gpas.length ? Math.min(...gpas) : 0, averageGpa: gpas.length ? gpas.reduce((sum, value) => sum + value, 0) / gpas.length : 0, totalCredits: summary.totalCredits, failedCourses: failed, repeatedCourses: Math.max(0, results.length - effective.length), bestSemester: [...series].sort((a, b) => b.gpa - a.gpa)[0]?.label || '--', weakestSemester: [...series].sort((a, b) => a.gpa - b.gpa)[0]?.label || '--' }, series, grades: Object.entries(grades).map(([label, value]) => ({ label, value })), passed: effective.length - failed, failed };
    },
    getDashboard: async () => {
      const [profile, results, analytics] = await Promise.all([getProfileSafe(), readResults(), academicService.getAnalytics()]);
      const effective = effectiveAttempts(results);
      const summary = calculate(effective);
      const current = profile?.currentSessionId && profile?.currentSemesterId ? results.filter(row => row.sessionId === profile.currentSessionId && row.semesterId === profile.currentSemesterId && (!profile.currentLevelId || row.levelId === profile.currentLevelId)) : [];
      const currentSummary = calculate(current);
      let notifications = [];
      try { const sdk = await getFirebase(); const snap = await sdk.db.collection('notifications').where('userId', '==', sdk.auth.currentUser.uid).get(); notifications = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: dateValue(doc.data().createdAt) })).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))); } catch {}
      const courses = await catalogueCourses(profile);
      const requiredCredits = Number(profile?.requiredCredits || courses.reduce((sum, course) => sum + Number(course.credits || 0), 0)) || null;
      const remainingCredits = requiredCredits == null ? null : Math.max(0, requiredCredits - summary.totalCredits);
      return { summary: { ...summary, classification: classification(summary.cgpa) }, gpaTrend: analytics.series, cgpaProgressPercent: requiredCredits ? Math.min(100, summary.totalCredits / requiredCredits * 100) : (summary.cgpa / 5) * 100, academicProgress: { percent: requiredCredits ? Math.min(100, summary.totalCredits / requiredCredits * 100) : null, completedCredits: summary.totalCredits, remainingCredits }, currentSemester: profile ? { sessionName: profile.currentSessionName || '--', semesterName: profile.currentSemesterName || '--', levelName: profile.currentLevelName || '--', courseCount: current.length, gpa: currentSummary.gpa } : null, recentResults: [...results].sort((a, b) => timestamp(b) - timestamp(a)).slice(0, 5), notifications: notifications.slice(0, 5) };
    },
    getAcademicTimeline: async () => {
      const [profile, results] = await Promise.all([getProfileSafe(), readResults()]);
      const levels = profile?.programmeId ? await academicService.getLevels({ programmeId: profile.programmeId, academicVersionId: profile.academicVersionId }).catch(() => FALLBACK_LEVELS) : FALLBACK_LEVELS;
      const semesters = profile?.programmeId ? await academicService.getSemesters({ programmeId: profile.programmeId, academicVersionId: profile.academicVersionId }).catch(() => FALLBACK_SEMESTERS) : FALLBACK_SEMESTERS;
      const currentLevelIndex = levels.findIndex(level => level.id === profile?.currentLevelId);
      return { levels: levels.map((level, index) => { const levelRows = results.filter(row => row.levelId === level.id); const semesterRows = semesters.filter(s => !s.levelId || s.levelId === level.id); return { id: level.id, name: level.name, status: level.id === profile?.currentLevelId ? 'current' : currentLevelIndex >= 0 && index < currentLevelIndex ? 'completed' : 'upcoming', semesters: semesterRows.map(semester => { const rows = levelRows.filter(row => row.semesterId === semester.id); const current = semester.id === profile?.currentSemesterId && level.id === profile?.currentLevelId; return { id: semester.id, name: semester.name, sessionName: rows[0]?.sessionName || (current ? profile?.currentSessionName : ''), status: rows.length ? (current ? 'current' : 'completed') : current ? 'current' : 'upcoming' }; }) }; }) };
    },
    getGraduationProgress: async () => {
      const [profile, results] = await Promise.all([getProfileSafe(), readResults()]);
      const effective = effectiveAttempts(results);
      const summary = calculate(effective);
      const courses = await catalogueCourses(profile);
      const requiredCredits = Number(profile?.requiredCredits || courses.reduce((sum, course) => sum + Number(course.credits || 0), 0)) || null;
      const remainingCredits = requiredCredits == null ? null : Math.max(0, requiredCredits - summary.totalCredits);
      const { failed } = courseLists(results);
      const milestones = [
        { id: 'profile', title: 'Academic profile completed', completed: Boolean(profile?.programmeId && profile?.currentLevelId) },
        { id: 'first-result', title: 'First academic result recorded', completed: results.length > 0 },
        { id: 'credit-plan', title: 'Credit requirement mapped', completed: requiredCredits != null },
        { id: 'credits', title: 'All required credit units completed', completed: requiredCredits != null && remainingCredits === 0 },
      ];
      return { percent: requiredCredits ? Math.min(100, summary.totalCredits / requiredCredits * 100) : null, completedCredits: summary.totalCredits, remainingCredits, requiredCredits, cgpa: summary.cgpa, currentLevel: profile?.currentLevelName || lookup(FALLBACK_LEVELS, profile?.currentLevelId), outstandingCount: failed.length, failedCount: failed.length, milestones };
    },
    getFailedCourses: async () => courseLists(await readResults()).failed,
    getRepeatedCourses: async () => courseLists(await readResults()).repeated,
    getOutstandingCourses: async () => {
      const [profile, results] = await Promise.all([getProfileSafe(), readResults()]);
      const courses = await catalogueCourses(profile);
      const recorded = new Set(effectiveAttempts(results).map(courseKey));
      return courses.filter(course => !recorded.has(courseKey(course))).map(course => ({ ...course, status: 'outstanding', note: 'Course is in the available programme catalogue but has no recorded effective result.' }));
    },
    getAttentionCourses: async () => {
      const [failed, repeated, outstanding] = await Promise.all([courseLists(await readResults()).failed, courseLists(await readResults()).repeated, academicService.getOutstandingCourses()]);
      return [...failed, ...repeated, ...outstanding];
    },
  } });
}
