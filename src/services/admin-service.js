import { createService } from './adapter.js';
import { getFirebase } from '../integration/firebase-client.js';

const OWNER_ADMIN_UID = 'lmUB6IdhuaOlHjzkqBEyoNkE7PH2';

const adminReadWriteService = createService('admin', [
  'getDashboard', 'getStudents', 'getStudent', 'deleteStudent', 'getAcademicProfile', 'getAuditLogs', 'getSettings', 'updateSettings',
  'getFaculties', 'createFaculty', 'updateFaculty', 'deleteFaculty',
  'getDepartments', 'createDepartment', 'updateDepartment', 'deleteDepartment',
  'getProgrammes', 'createProgramme', 'updateProgramme', 'deleteProgramme',
  'getCourses', 'createCourse', 'updateCourse', 'deleteCourse',
  'getAcademicVersions', 'createAcademicVersion', 'updateAcademicVersion', 'deleteAcademicVersion',
  'getLevels', 'createLevel', 'updateLevel', 'deleteLevel',
  'getSemesters', 'createSemester', 'updateSemester', 'deleteSemester',
  'getAcademicSessions', 'createAcademicSession', 'updateAcademicSession', 'deleteAcademicSession',
  'getGradingRules', 'createGradingRule', 'updateGradingRule', 'deleteGradingRule',
  'getNotifications', 'saveNotificationDraft', 'sendNotification', 'scheduleNotification', 'updateNotification', 'deleteNotification',
]);

async function requireAdmin() {
  const sdk = await getFirebase();
  if (!sdk) throw Object.assign(new Error('Firebase is not configured.'), { code: 'BACKEND_NOT_CONNECTED' });
  const { auth, db } = sdk;
  const user = auth.currentUser;
  if (!user) throw Object.assign(new Error('Authentication required.'), { code: 'unauthorized' });
  if (user.uid === OWNER_ADMIN_UID) return { ...sdk, user };
  const account = await db.collection('users').doc(user.uid).get();
  const role = account.exists ? account.data()?.role : null;
  if (role === 'admin') return { ...sdk, user };
  const token = await user.getIdTokenResult(true);
  if (token.claims.admin === true || token.claims.role === 'admin') return { ...sdk, user };
  throw Object.assign(new Error('Administrator access required.'), { code: 'permission-denied' });
}

const rows = snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
const nameOf = row => row?.name || row?.title || row?.label || '';

export const adminService = Object.freeze({
  ...adminReadWriteService,
  async getStudents(filters = {}) {
    const { db } = await requireAdmin();
    const [usersSnap, profilesSnap, facultiesSnap, departmentsSnap, programmesSnap, levelsSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('academicProfiles').get(),
      db.collection('faculties').get(),
      db.collection('departments').get(),
      db.collection('programmes').get(),
      db.collection('levels').get()
    ]);
    const users = rows(usersSnap);
    const profiles = new Map(rows(profilesSnap).map(profile => [profile.id, profile]));
    const faculties = new Map(rows(facultiesSnap).map(row => [row.id, nameOf(row)]));
    const departments = new Map(rows(departmentsSnap).map(row => [row.id, nameOf(row)]));
    const programmes = new Map(rows(programmesSnap).map(row => [row.id, nameOf(row)]));
    const levels = new Map(rows(levelsSnap).map(row => [row.id, nameOf(row)]));

    let result = users.map(user => {
      const profile = profiles.get(user.id) || {};
      return {
        ...user,
        facultyName: profile.facultyName || faculties.get(profile.facultyId) || '',
        departmentName: profile.departmentName || departments.get(profile.departmentId) || '',
        programmeName: profile.programmeName || programmes.get(profile.programmeId) || '',
        levelName: profile.currentLevelName || levels.get(profile.currentLevelId) || '',
        facultyId: profile.facultyId || '',
        departmentId: profile.departmentId || '',
        programmeId: profile.programmeId || '',
        currentLevelId: profile.currentLevelId || ''
      };
    });
    if (filters.status) result = result.filter(row => row.accountStatus === filters.status);
    if (filters.facultyId) result = result.filter(row => row.facultyId === filters.facultyId);
    return result;
  }
});
