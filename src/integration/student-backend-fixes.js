import { configureServices } from '../services/adapter.js';
import { academicService } from '../services/academic-service.js';
import { FALLBACK_FACULTIES, FALLBACK_DEPARTMENTS, FALLBACK_PROGRAMMES, FALLBACK_LEVELS, FALLBACK_SEMESTERS, FALLBACK_SESSIONS } from '../data/uniport-catalogue.js';
import { getFirebase } from './firebase-client.js';
import { UNIVERSITY } from '../data/uniport.js';

const fallback = (rows, predicate = () => true) => rows.filter(predicate);
const clean = value => Object.fromEntries(Object.entries(value || {}).filter(([, v]) => v !== undefined));
const toDate = value => value?.toDate ? value.toDate().toISOString() : (value || null);
const sum = (rows, key) => rows.reduce((total, row) => total + Number(row[key] || 0), 0);

function gradeClassification(cgpa) {
  if (cgpa == null || !Number.isFinite(Number(cgpa))) return 'Awaiting result data';
  const value = Number(cgpa);
  if (value >= 4.5) return 'First Class';
  if (value >= 3.5) return 'Second Class Upper';
  if (value >= 2.4) return 'Second Class Lower';
  if (value >= 1.5) return 'Third Class';
  if (value >= 1) return 'Pass';
  return 'Fail';
}

function namesForProfile(profile) {
  if (!profile) return null;
  const faculty = FALLBACK_FACULTIES.find(x => x.id === profile.facultyId);
  const department = FALLBACK_DEPARTMENTS.find(x => x.id === profile.departmentId);
  const programme = FALLBACK_PROGRAMMES.find(x => x.id === profile.programmeId);
  const level = FALLBACK_LEVELS.find(x => x.id === profile.currentLevelId);
  const currentSemester = FALLBACK_SEMESTERS.find(x => x.id === profile.currentSemesterId);
  const currentSession = FALLBACK_SESSIONS.find(x => x.id === profile.currentSessionId);
  const admissionSession = FALLBACK_SESSIONS.find(x => x.id === profile.admissionSessionId);
  return clean({
    universityId: UNIVERSITY.id,
    ...profile,
    facultyName: profile.facultyName || faculty?.name,
    departmentName: profile.departmentName || department?.name,
    programmeName: profile.programmeName || programme?.name,
    currentLevelName: profile.currentLevelName || level?.name,
    currentSemesterName: profile.currentSemesterName || currentSemester?.name,
    currentSessionName: profile.currentSessionName || currentSession?.name,
    admissionSessionName: profile.admissionSessionName || admissionSession?.name,
  });
}

async function ensureProfile() {
  const sdk = await getFirebase();
  if (!sdk?.auth.currentUser) return null;
  const uid = sdk.auth.currentUser.uid;
  const ref = sdk.db.collection('academicProfiles').doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({ userId: uid, universityId: UNIVERSITY.id, createdAt: sdk.firebase.firestore.FieldValue.serverTimestamp() });
    return { userId: uid, universityId: UNIVERSITY.id };
  }
  return snap.data();
}

function semesterRows(results) {
  const groups = new Map();
  results.forEach(row => {
    const key = `${row.sessionId || 'session'}::${row.semesterId || row.semesterName || 'semester'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });
  return [...groups.values()].map(rows => {
    const credits = sum(rows, 'credits');
    const qualityPoints = rows.reduce((n, row) => n + Number(row.qualityPoints ?? Number(row.credits || 0) * Number(row.points || 0)), 0);
    return {
      rows,
      label: rows[0]?.semesterName || rows[0]?.semesterId || 'Semester',
      sessionName: rows[0]?.sessionName || rows[0]?.sessionId || '',
      credits,
      qualityPoints,
      gpa: credits ? qualityPoints / credits : 0,
    };
  }).sort((a, b) => `${a.sessionName}${a.label}`.localeCompare(`${b.sessionName}${b.label}`));
}

export async function registerStudentBackendFixes() {
  const original = {};
  const methods = ['getProfile','updateProfile','getFaculties','getDepartments','getProgrammes','getAcademicVersions','getLevels','getSemesters','getAcademicSessions','getGradingRules','getCourses','getResults','getResult','saveResult','updateResult','deleteResult','saveSemester','getDashboard','getSummary','getAnalytics','getAcademicTimeline','getGraduationProgress','getFailedCourses','getRepeatedCourses','getOutstandingCourses','getAttentionCourses'];
  for (const method of methods) original[method] = academicService[method];

  const academic = {
    ...Object.fromEntries(methods.map(method => [method, (...args) => original[method](...args)])),

    async getProfile() {
      const profile = await ensureProfile();
      return namesForProfile(profile);
    },

    async updateProfile(payload) {
      const result = await original.updateProfile({ ...payload, universityId: UNIVERSITY.id });
      return namesForProfile(result);
    },

    async getFaculties() {
      try { const rows = await original.getFaculties(); return rows.length ? rows : FALLBACK_FACULTIES; }
      catch { return FALLBACK_FACULTIES; }
    },

    async getDepartments({ facultyId } = {}) {
      try { const rows = await original.getDepartments({ facultyId }); return rows.length ? rows : fallback(FALLBACK_DEPARTMENTS, x => !facultyId || x.facultyId === facultyId); }
      catch { return fallback(FALLBACK_DEPARTMENTS, x => !facultyId || x.facultyId === facultyId); }
    },

    async getProgrammes({ departmentId } = {}) {
      try { const rows = await original.getProgrammes({ departmentId }); return rows.length ? rows : fallback(FALLBACK_PROGRAMMES, x => !departmentId || x.departmentId === departmentId); }
      catch { return fallback(FALLBACK_PROGRAMMES, x => !departmentId || x.departmentId === departmentId); }
    },

    async getAcademicVersions({ programmeId } = {}) {
      try { return await original.getAcademicVersions({ programmeId }); } catch { return []; }
    },

    async getLevels(filters = {}) {
      try { const rows = await original.getLevels(filters); return rows.length ? rows : FALLBACK_LEVELS; }
      catch { return FALLBACK_LEVELS; }
    },

    async getSemesters(filters = {}) {
      try { const rows = await original.getSemesters(filters); return rows.length ? rows : FALLBACK_SEMESTERS; }
      catch { return FALLBACK_SEMESTERS; }
    },

    async getAcademicSessions() {
      try { const rows = await original.getAcademicSessions(); return rows.length ? rows : FALLBACK_SESSIONS; }
      catch { return FALLBACK_SESSIONS; }
    },

    async getGradingRules() {
      try {
        const rules = await original.getGradingRules();
        return rules?.maxPoint ? rules : { maxPoint: 5, source: 'University of Port Harcourt 5-point grading system', classifications: [
          { min: 4.5, label: 'First Class' }, { min: 3.5, label: 'Second Class Upper' },
          { min: 2.4, label: 'Second Class Lower' }, { min: 1.5, label: 'Third Class' }, { min: 1, label: 'Pass' },
        ] };
      } catch {
        return { maxPoint: 5, source: 'University of Port Harcourt 5-point grading system', classifications: [
          { min: 4.5, label: 'First Class' }, { min: 3.5, label: 'Second Class Upper' },
          { min: 2.4, label: 'Second Class Lower' }, { min: 1.5, label: 'Third Class' }, { min: 1, label: 'Pass' },
        ] };
      }
    },

    async getCourses(filters = {}) {
      try { return await original.getCourses(filters); } catch { return []; }
    },

    async getSummary(filters = {}) {
      const filtered = await original.getSummary(filters);
      if (!filters || !Object.values(filters).some(Boolean)) return filtered;
      const overall = await original.getSummary({});
      return { ...filtered, cgpa: overall.cgpa, maxPoint: overall.maxPoint };
    },

    async getAnalytics(filters = {}) {
      const all = await original.getResults({});
      const results = filters.sessionId ? all.filter(r => r.sessionId === filters.sessionId) : all;
      const policy = await academic.getGradingRules();
      const maxPoint = policy.maxPoint || 5;
      const groups = semesterRows(results);
      let cumulativeCredits = 0;
      let cumulativeQuality = 0;
      const series = groups.map(group => {
        cumulativeCredits += group.credits;
        cumulativeQuality += group.qualityPoints;
        return { label: group.label, sessionName: group.sessionName, gpa: group.gpa, cgpa: cumulativeCredits ? cumulativeQuality / cumulativeCredits : 0, credits: group.credits, qualityPoints: group.qualityPoints };
      });
      const gradeMap = {};
      results.forEach(r => { const grade = r.grade || 'Unknown'; gradeMap[grade] = (gradeMap[grade] || 0) + 1; });
      const gpas = series.map(x => x.gpa);
      const totalCredits = sum(results, 'credits');
      const qualityPoints = results.reduce((n, r) => n + Number(r.qualityPoints ?? Number(r.credits || 0) * Number(r.points || 0)), 0);
      const failed = results.filter(r => Number(r.points) === 0).length;
      return { maxPoint, stats: { cgpa: totalCredits ? qualityPoints / totalCredits : 0, highestGpa: gpas.length ? Math.max(...gpas) : 0, lowestGpa: gpas.length ? Math.min(...gpas) : 0, averageGpa: gpas.length ? gpas.reduce((n, x) => n + x, 0) / gpas.length : 0, totalCredits, failedCourses: failed, repeatedCourses: countRepeated(results), bestSemester: [...series].sort((a,b) => b.gpa-a.gpa)[0]?.label || '--', weakestSemester: [...series].sort((a,b) => a.gpa-b.gpa)[0]?.label || '--' }, series, grades: Object.entries(gradeMap).map(([label, value]) => ({ label, value })), passed: results.length - failed, failed };
    },

    async getDashboard() {
      const [profile, results, summary, analytics] = await Promise.all([academic.getProfile(), original.getResults({}), original.getSummary({}), academic.getAnalytics({})]);
      let notifications = [];
      try { const sdk = await getFirebase(); if (sdk?.auth.currentUser) { const snap = await sdk.db.collection('notifications').where('userId', '==', sdk.auth.currentUser.uid).get(); notifications = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: toDate(doc.data().createdAt) })).sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt))); } } catch {}
      const current = profile?.currentSessionId && profile?.currentSemesterId ? results.filter(r => r.sessionId === profile.currentSessionId && r.semesterId === profile.currentSemesterId && (!profile.currentLevelId || r.levelId === profile.currentLevelId)) : [];
      const currentCredits = sum(current, 'credits');
      const currentQP = current.reduce((n, r) => n + Number(r.qualityPoints || 0), 0);
      return { summary: { ...summary, classification: gradeClassification(summary.cgpa) }, gpaTrend: analytics.series, cgpaProgressPercent: summary.maxPoint ? Math.min(100, (summary.cgpa / summary.maxPoint) * 100) : null, academicProgress: { percent: null, completedCredits: summary.totalCredits, remainingCredits: null }, currentSemester: profile ? { sessionName: profile.currentSessionName || '--', semesterName: profile.currentSemesterName || '--', levelName: profile.currentLevelName || '--', courseCount: current.length, gpa: currentCredits ? currentQP / currentCredits : 0 } : null, recentResults: results.slice(-5).reverse(), notifications: notifications.slice(0, 5) };
    },

    async getAcademicTimeline() {
      const profile = await academic.getProfile();
      const results = await original.getResults({});
      const levels = await academic.getLevels({ programmeId: profile?.programmeId, academicVersionId: profile?.academicVersionId });
      const semesters = await academic.getSemesters({ programmeId: profile?.programmeId, academicVersionId: profile?.academicVersionId });
      return { levels: levels.map(level => {
        const levelResults = results.filter(r => r.levelId === level.id);
        const status = level.id === profile?.currentLevelId ? 'current' : levelResults.length ? 'completed' : 'upcoming';
        return { id: level.id, name: level.name, status, semesters: semesters.map(semester => {
          const semesterResults = levelResults.filter(r => r.semesterId === semester.id);
          return { id: semester.id, name: semester.name, sessionName: semesterResults[0]?.sessionName || (semester.id === profile?.currentSemesterId ? profile?.currentSessionName : ''), status: semesterResults.length ? 'completed' : (level.id === profile?.currentLevelId && semester.id === profile?.currentSemesterId ? 'current' : 'upcoming') };
        }) };
      }) };
    },

    async getGraduationProgress() {
      const [profile, results, summary, courses] = await Promise.all([academic.getProfile(), original.getResults({}), original.getSummary({}), academic.getCourses({})]);
      const failed = results.filter(r => Number(r.points) === 0);
      const outstanding = courses.filter(course => !results.some(r => r.code === course.code));
      const milestones = [
        { id: 'profile', title: 'Complete academic profile', completed: !!(profile?.programmeId && profile?.currentLevelId && profile?.currentSessionId && profile?.currentSemesterId) },
        { id: 'results', title: 'Record your academic results', completed: results.length > 0 },
        { id: 'no-fails', title: 'Clear failed courses', completed: results.length > 0 && failed.length === 0 },
      ];
      return { percent: null, completedCredits: summary.totalCredits, remainingCredits: null, requiredCredits: null, cgpa: summary.cgpa, currentLevel: profile?.currentLevelName || '--', outstandingCount: outstanding.length, failedCount: failed.length, milestones };
    },

    async getFailedCourses() { return (await original.getResults({})).filter(r => Number(r.points) === 0).map(r => ({ ...r, status: 'failed', note: 'This course has a zero grade point.' })); },
    async getRepeatedCourses() {
      const results = await original.getResults({}); const counts = {}; results.forEach(r => { counts[r.code] = (counts[r.code] || 0) + 1; });
      return results.filter(r => counts[r.code] > 1).map(r => ({ ...r, status: 'repeated', note: 'This course code appears more than once in your records.' }));
    },
    async getOutstandingCourses() { const courses = await academic.getCourses({}); const results = await original.getResults({}); return courses.filter(c => !results.some(r => r.code === c.code)).map(c => ({ ...c, status: 'outstanding', note: 'This course exists in the connected catalogue but has no recorded result.' })); },
    async getAttentionCourses() { const failed = await academic.getFailedCourses(); const repeated = await academic.getRepeatedCourses(); return [...new Map([...failed, ...repeated].map(r => [r.id, r])).values()]; },
  };

  configureServices({ academic });
  return true;
}

function countRepeated(results) {
  const counts = {};
  results.forEach(r => { counts[r.code] = (counts[r.code] || 0) + 1; });
  return Object.values(counts).filter(count => count > 1).reduce((n, count) => n + count, 0);
}
