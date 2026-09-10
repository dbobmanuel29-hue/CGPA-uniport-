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
const serverTimestamp = () => window.firebase.firestore.FieldValue.serverTimestamp();

async function createNotificationRecords(payload) {
  const { db, user } = await requireAdmin();
  const audience = payload.audience || 'all_students';
  const [usersSnap, profilesSnap] = await Promise.all([
    db.collection('users').get(),
    audience === 'faculty' ? db.collection('academicProfiles').get() : Promise.resolve(null)
  ]);

  let students = rows(usersSnap).filter(student => (student.role || 'student') === 'student');

  if (audience === 'faculty') {
    if (!payload.facultyId) throw Object.assign(new Error('Select a faculty before sending.'), { code: 'validation/faculty-required' });
    const profileByUser = new Map(rows(profilesSnap).map(profile => [profile.id, profile]));
    students = students.filter(student => profileByUser.get(student.id)?.facultyId === payload.facultyId);
  }

  const campaignRef = db.collection('notificationCampaigns').doc();
  const campaign = {
    title: String(payload.title || '').trim(),
    message: String(payload.message || '').trim(),
    type: payload.type || 'announcement',
    audience,
    facultyId: payload.facultyId || '',
    priority: payload.priority || 'normal',
    status: 'sent',
    recipientCount: students.length,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    sentAt: serverTimestamp()
  };

  const batchLimit = 450;
  let batch = db.batch();
  let operations = 0;
  const flush = async () => {
    if (!operations) return;
    await batch.commit();
    batch = db.batch();
    operations = 0;
  };

  batch.set(campaignRef, campaign);
  operations += 1;

  for (const student of students) {
    const notificationRef = db.collection('notifications').doc();
    batch.set(notificationRef, {
      userId: student.id,
      title: campaign.title,
      message: campaign.message,
      body: campaign.message,
      type: campaign.type,
      priority: campaign.priority,
      campaignId: campaignRef.id,
      read: false,
      createdAt: serverTimestamp()
    });
    operations += 1;
    if (operations >= batchLimit) await flush();
  }
  await flush();

  return { id: campaignRef.id, ...campaign, recipientCount: students.length };
}

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
  },
  async sendNotification(payload) {
    const title = String(payload?.title || '').trim();
    const message = String(payload?.message || '').trim();
    if (!title || message.length < 5) throw Object.assign(new Error('Enter a title and a message of at least 5 characters.'), { code: 'validation/notification' });
    return createNotificationRecords(payload);
  }
});
