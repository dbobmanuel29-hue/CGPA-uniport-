import { configureServices } from '../services/adapter.js';
import { getFirebase } from './firebase-client.js';

const OWNER_ADMIN_UID = 'lmUB6IdhuaOlHjzkqBEyoNkE7PH2';
const cleanDate = value => value?.toDate ? value.toDate().toISOString() : (value || null);
const rows = snap => snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
const asNumber = value => Number(value || 0);
const USER_DATA_COLLECTIONS = ['academicProfiles', 'results', 'notifications', 'supportTickets', 'reports', 'transactions', 'dataExportRequests'];

async function requireAdmin() {
  const sdk = await getFirebase();
  if (!sdk?.auth.currentUser) throw Object.assign(new Error('Authentication required.'), { code: 'unauthorized' });
  const user = sdk.auth.currentUser;
  if (user.uid !== OWNER_ADMIN_UID) {
    const token = await user.getIdTokenResult(true);
    if (token.claims.admin !== true && token.claims.role !== 'admin') throw Object.assign(new Error('Administrator access required.'), { code: 'permission-denied' });
  }
  return { ...sdk, user };
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

async function lookupName(db, collection, id) {
  if (!id) return '';
  const snap = await db.collection(collection).doc(id).get();
  return snap.exists ? (snap.data()?.name || snap.data()?.title || snap.data()?.label || '') : '';
}

async function enrichAcademic(db, profile) {
  if (!profile) return null;
  const relations = [['facultyId','faculties','facultyName'],['departmentId','departments','departmentName'],['programmeId','programmes','programmeName'],['currentLevelId','levels','currentLevelName'],['currentSessionId','academicSessions','currentSessionName'],['currentSemesterId','semesters','currentSemesterName'],['admissionSessionId','academicSessions','admissionSessionName']];
  const output = { ...profile };
  await Promise.all(relations.map(async ([field,collection,target]) => { if (!profile[field]) return; output[target] = await lookupName(db, collection, profile[field]); }));
  return output;
}

async function enrichResults(db, results) {
  const [sessions, semesters, levels] = await Promise.all([
    rows(await db.collection('academicSessions').get()),
    rows(await db.collection('semesters').get()),
    rows(await db.collection('levels').get()),
  ]);
  const sessionMap = new Map(sessions.map(x => [x.id, x.name || x.title || '']));
  const semesterMap = new Map(semesters.map(x => [x.id, x.name || x.title || '']));
  const levelMap = new Map(levels.map(x => [x.id, x.name || x.title || '']));
  return results.map(r => ({ ...r, createdAt: cleanDate(r.createdAt), updatedAt: cleanDate(r.updatedAt), sessionName: r.sessionName || sessionMap.get(r.sessionId) || '', semesterName: r.semesterName || semesterMap.get(r.semesterId) || '', levelName: r.levelName || levelMap.get(r.levelId) || '' }));
}

async function deleteStudentData(db, uid) {
  if (uid === OWNER_ADMIN_UID) throw Object.assign(new Error('The administrator account is protected.'), { code: 'permission-denied' });
  for (const collection of USER_DATA_COLLECTIONS) {
    const snap = await db.collection(collection).where('userId', '==', uid).get();
    while (snap.size) {
      const batch = db.batch();
      snap.docs.slice(0, 450).forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      if (snap.size <= 450) break;
      const next = await db.collection(collection).where('userId', '==', uid).get();
      if (!next.size) break;
    }
  }
  for (const collection of ['users', 'academicProfiles', 'userPreferences', 'subscriptions']) {
    const ref = db.collection(collection).doc(uid);
    const snap = await ref.get();
    if (snap.exists) await ref.delete();
  }
  try { await db.collection('publicSupportRequests').where('userId', '==', uid).get().then(async snap => { if (!snap.size) return; const batch = db.batch(); snap.docs.forEach(doc => batch.delete(doc.ref)); await batch.commit(); }); } catch {}
  return { ok: true, uid };
}

export async function registerAdminFixes() {
  const methods = {
    async getDashboard() {
      const { db, functions } = await requireAdmin();
      const users = rows(await db.collection('users').get()).filter(user => user.id !== OWNER_ADMIN_UID && user.role !== 'admin');
      let authStats = null;
      try {
        const callable = functions.httpsCallable('getAdminUserStats');
        const response = await callable({});
        authStats = response.data || null;
      } catch (error) {
        console.warn('Admin Auth stats unavailable; using Firestore student records.', error?.code || error?.message || error);
      }
      const activeStudents = users.filter(user => (user.accountStatus || 'active') === 'active');
      const verifiedAccounts = users.filter(user => user.emailVerified === true).length;
      const premiumStudents = users.filter(user => user.subscriptionStatus === 'active' || user.plan === 'premium').length;
      const recentStudents = [...users].sort((a,b) => (Date.parse(cleanDate(b.createdAt)) || 0) - (Date.parse(cleanDate(a.createdAt)) || 0)).slice(0, 5);
      const tickets = rows(await db.collection('supportTickets').get());
      return {
        stats: {
          totalStudents: authStats?.totalAuthUsers ?? users.length,
          activeStudents: authStats?.activeStudents ?? activeStudents.length,
          newStudents: users.filter(user => { const t = Date.parse(cleanDate(user.createdAt)); return t && Date.now() - t < 30 * 86400000; }).length,
          verifiedAccounts: authStats?.verifiedAccounts ?? verifiedAccounts,
          premiumStudents: authStats?.premiumStudents ?? premiumStudents,
          supportRequests: tickets.filter(t => !['resolved','closed'].includes(t.status)).length,
        },
        charts: { userGrowth: [], registrations: [], activeUsers: [], subscriptions: [] },
        recentStudents,
        recentTickets: tickets.sort((a,b) => (Date.parse(cleanDate(b.createdAt)) || 0) - (Date.parse(cleanDate(a.createdAt)) || 0)).slice(0, 5),
        activity: [],
      };
    },

    async getStudents(filters = {}) {
      const { db } = await requireAdmin();
      const users = rows(await db.collection('users').get());
      const profilesSnap = await db.collection('academicProfiles').get();
      const profiles = new Map(profilesSnap.docs.map(doc => [doc.id, doc.data()]));
      const [faculties, departments, programmes, levels] = await Promise.all([rows(await db.collection('faculties').get()), rows(await db.collection('departments').get()), rows(await db.collection('programmes').get()), rows(await db.collection('levels').get())]);
      const facultyMap = new Map(faculties.map(x => [x.id, x.name || x.title || '']));
      const departmentMap = new Map(departments.map(x => [x.id, x.name || x.title || '']));
      const programmeMap = new Map(programmes.map(x => [x.id, x.name || x.title || '']));
      const levelMap = new Map(levels.map(x => [x.id, x.name || x.title || '']));
      let output = users.filter(user => user.role !== 'admin').map(user => { const profile=profiles.get(user.id)||{}; return {...user,createdAt:cleanDate(user.createdAt),facultyName:facultyMap.get(profile.facultyId)||'',departmentName:departmentMap.get(profile.departmentId)||'',programmeName:programmeMap.get(profile.programmeId)||'',levelName:levelMap.get(profile.currentLevelId)||'',facultyId:profile.facultyId||'',departmentId:profile.departmentId||'',programmeId:profile.programmeId||'',levelId:profile.currentLevelId||''}; });
      if(filters.status) output=output.filter(x=>x.accountStatus===filters.status);
      if(filters.facultyId) output=output.filter(x=>x.facultyId===filters.facultyId);
      return output;
    },

    async deleteStudent(studentId) {
      const { db } = await requireAdmin();
      if (!studentId || studentId === OWNER_ADMIN_UID) throw Object.assign(new Error('The administrator account cannot be deleted.'), { code: 'permission-denied' });
      await deleteStudentData(db, studentId);
      return { ok: true };
    },

    async getAcademicProfile(studentId) {
      const { db } = await requireAdmin();
      const userSnap = await db.collection('users').doc(studentId).get();
      if (!userSnap.exists) throw Object.assign(new Error('Student not found.'), { code: 'not-found' });
      const profileSnap = await db.collection('academicProfiles').doc(studentId).get();
      if (!profileSnap.exists) return null;
      return enrichAcademic(db, profileSnap.data());
    },

    async getStudent(studentId) {
      const { db } = await requireAdmin();
      const userSnap=await db.collection('users').doc(studentId).get();
      if(!userSnap.exists) throw Object.assign(new Error('Student not found.'),{code:'not-found'});
      const profileSnap=await db.collection('academicProfiles').doc(studentId).get();
      const resultSnap=await db.collection('results').where('userId','==',studentId).get();
      const ticketSnap=await db.collection('supportTickets').where('userId','==',studentId).get();
      const profile=profileSnap.exists?await enrichAcademic(db,profileSnap.data()):null;
      const results=await enrichResults(db,rows(resultSnap));
      const effective=effectiveResults(results);
      const summary=calculate(effective);
      const semesterMap=new Map();
      for(const result of results){ const key=`${result.levelName || result.levelId || 'Level'}:${result.semesterName || result.semesterId || 'Semester'}`; const current=semesterMap.get(key)||[]; current.push(result); semesterMap.set(key,current); }
      const gpaHistory=[...semesterMap.entries()].map(([label,items])=>({label,gpa:calculate(items).gpa}));
      return {id:userSnap.id,...userSnap.data(),createdAt:cleanDate(userSnap.data().createdAt),academicProfile:profile,results,gpaHistory,tickets:rows(ticketSnap).map(t=>({...t,createdAt:cleanDate(t.createdAt),updatedAt:cleanDate(t.updatedAt)})),summary};
    },
  };
  configureServices({ admin: methods });
}
