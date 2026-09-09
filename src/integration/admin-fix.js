import { configureServices } from '../services/adapter.js';
import { getFirebase } from './firebase-client.js';

const cleanDate = value => value?.toDate ? value.toDate().toISOString() : (value || null);
const rows = snap => snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
const asNumber = value => Number(value || 0);

async function requireAdmin() {
  const sdk = await getFirebase();
  if (!sdk?.auth.currentUser) throw Object.assign(new Error('Authentication required.'), { code: 'unauthorized' });
  const token = await sdk.auth.currentUser.getIdTokenResult(true);
  if (token.claims.admin !== true && token.claims.role !== 'admin') {
    throw Object.assign(new Error('Administrator access required.'), { code: 'permission-denied' });
  }
  return { ...sdk, user: sdk.auth.currentUser };
}

function calculate(results) {
  const credits = results.reduce((sum, r) => sum + asNumber(r.credits), 0);
  const quality = results.reduce((sum, r) => sum + asNumber(r.qualityPoints ?? asNumber(r.credits) * asNumber(r.points)), 0);
  return { gpa: credits ? quality / credits : 0, cgpa: credits ? quality / credits : 0, totalCredits: credits, qualityPoints: quality, maxPoint: 5 };
}

function effectiveResults(results) {
  const grouped = new Map();
  for (const result of results) {
    const key = String(result.originalCourseCode || result.code || result.id).trim().toUpperCase();
    const current = grouped.get(key);
    const currentTime = Date.parse(cleanDate(current?.updatedAt) || cleanDate(current?.createdAt) || '') || 0;
    const resultTime = Date.parse(cleanDate(result.updatedAt) || cleanDate(result.createdAt) || '') || 0;
    if (!current || resultTime >= currentTime) grouped.set(key, result);
  }
  return [...grouped.values()];
}

async function enrichAcademic(db, profile) {
  if (!profile) return null;
  const relations = [
    ['facultyId', 'faculties', 'facultyName'],
    ['departmentId', 'departments', 'departmentName'],
    ['programmeId', 'programmes', 'programmeName'],
    ['currentLevelId', 'levels', 'currentLevelName'],
    ['currentSessionId', 'academicSessions', 'currentSessionName'],
    ['currentSemesterId', 'semesters', 'currentSemesterName'],
    ['admissionSessionId', 'academicSessions', 'admissionSessionName'],
  ];
  const output = { ...profile };
  await Promise.all(relations.map(async ([field, collection, target]) => {
    if (!profile[field]) return;
    const snap = await db.collection(collection).doc(profile[field]).get();
    if (snap.exists) output[target] = snap.data()?.name || snap.data()?.title || snap.data()?.label || '';
  }));
  return output;
}

export async function registerAdminFixes() {
  const methods = {
    async getStudents(filters = {}) {
      const { db } = await requireAdmin();
      const users = rows(await db.collection('users').get());
      const profilesSnap = await db.collection('academicProfiles').get();
      const profiles = new Map(profilesSnap.docs.map(doc => [doc.id, doc.data()]));
      const [faculties, departments, programmes, levels] = await Promise.all([
        rows(await db.collection('faculties').get()),
        rows(await db.collection('departments').get()),
        rows(await db.collection('programmes').get()),
        rows(await db.collection('levels').get()),
      ]);
      const facultyMap = new Map(faculties.map(x => [x.id, x.name || x.title || '']));
      const departmentMap = new Map(departments.map(x => [x.id, x.name || x.title || '']));
      const programmeMap = new Map(programmes.map(x => [x.id, x.name || x.title || '']));
      const levelMap = new Map(levels.map(x => [x.id, x.name || x.title || '']));
      let output = users.filter(user => user.role !== 'admin').map(user => {
        const profile = profiles.get(user.id) || {};
        return {
          ...user,
          createdAt: cleanDate(user.createdAt),
          facultyName: facultyMap.get(profile.facultyId) || '',
          departmentName: departmentMap.get(profile.departmentId) || '',
          programmeName: programmeMap.get(profile.programmeId) || '',
          levelName: levelMap.get(profile.currentLevelId) || '',
          facultyId: profile.facultyId || '',
          departmentId: profile.departmentId || '',
          programmeId: profile.programmeId || '',
          levelId: profile.currentLevelId || '',
        };
      });
      if (filters.status) output = output.filter(x => x.accountStatus === filters.status);
      if (filters.facultyId) output = output.filter(x => x.facultyId === filters.facultyId);
      return output;
    },

    async getStudent(studentId) {
      const { db } = await requireAdmin();
      const userSnap = await db.collection('users').doc(studentId).get();
      if (!userSnap.exists) throw Object.assign(new Error('Student not found.'), { code: 'not-found' });
      const profileSnap = await db.collection('academicProfiles').doc(studentId).get();
      const resultSnap = await db.collection('results').where('userId', '==', studentId).get();
      const ticketSnap = await db.collection('supportTickets').where('userId', '==', studentId).get();
      const profile = profileSnap.exists ? await enrichAcademic(db, profileSnap.data()) : null;
      const results = rows(resultSnap).map(r => ({ ...r, createdAt: cleanDate(r.createdAt), updatedAt: cleanDate(r.updatedAt) }));
      const effective = effectiveResults(results);
      const summary = calculate(effective);
      const semesterMap = new Map();
      for (const result of results) {
        const key = `${result.levelId || 'unknown'}:${result.semesterId || 'unknown'}`;
        const current = semesterMap.get(key) || [];
        current.push(result);
        semesterMap.set(key, current);
      }
      const gpaHistory = [...semesterMap.entries()].map(([key, items]) => ({ label: key, gpa: calculate(items).gpa })).sort((a, b) => a.label.localeCompare(b.label));
      return {
        id: userSnap.id,
        ...userSnap.data(),
        createdAt: cleanDate(userSnap.data().createdAt),
        academicProfile: profile,
        results,
        summary,
        gpaHistory,
        tickets: rows(ticketSnap).map(t => ({ ...t, createdAt: cleanDate(t.createdAt) })),
      };
    },
  };
  configureServices({ admin: methods });
}
