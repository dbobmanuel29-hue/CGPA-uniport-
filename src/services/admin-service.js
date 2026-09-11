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

async function writeAudit({ action, resource, resourceId, status, description, user }) {
  try {
    const { db } = await requireAdmin();
    await db.collection('auditLogs').add({
      actorId: user.uid,
      actorName: user.displayName || user.email || 'Administrator',
      actorEmail: user.email || '',
      action,
      resource,
      resourceType: resource,
      resourceId: resourceId || '',
      status,
      description,
      ipAddress: 'Not collected',
      device: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 240) : 'Unknown browser',
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (auditError) {
    console.warn('Audit event could not be recorded:', auditError?.message || auditError);
  }
}

const rows = snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
const nameOf = row => row?.name || row?.title || row?.label || '';
const serverTimestamp = () => window.firebase.firestore.FieldValue.serverTimestamp();

async function getAuthoritativeStudentCount() {
  const sdk = await getFirebase();
  if (!sdk?.auth?.currentUser) throw Object.assign(new Error('Authentication required.'), { code: 'unauthorized' });

  const token = await sdk.auth.currentUser.getIdToken(true);
  const response = await fetch('/api/admin/student-count', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) {
    throw Object.assign(new Error(payload.error || 'The Firebase Authentication student count could not be loaded.'), {
      code: payload.code || `server/student-count-${response.status}`,
    });
  }
  return payload;
}

async function createNotificationRecords(payload) {
  const { db, user } = await requireAdmin();
  const audience = payload.audience || 'all_students';
  const [usersSnap, profilesSnap] = await Promise.all([
    db.collection('users').get(),
    audience === 'faculty' ? db.collection('academicProfiles').get() : Promise.resolve(null)
  ]);

  let students = rows(usersSnap).filter(student =>
    (student.role || 'student') === 'student' && student.accountStatus === 'active'
  );

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

async function deleteStudentThroughTrustedBackend(studentId) {
  const sdk = await getFirebase();
  if (!sdk?.auth?.currentUser) throw Object.assign(new Error('Authentication required.'), { code: 'unauthorized' });
  if (!studentId || studentId === OWNER_ADMIN_UID) throw Object.assign(new Error('That account cannot be deleted.'), { code: 'validation/student-delete' });

  const token = await sdk.auth.currentUser.getIdToken(true);
  const response = await fetch('/api/admin/delete-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ studentId }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) {
    throw Object.assign(new Error(payload.error || 'The student account could not be completely deleted.'), {
      code: payload.code || `server/delete-user-${response.status}`,
    });
  }
  return payload;
}

export const adminService = Object.freeze({
  ...adminReadWriteService,

  async getDashboard() {
    const { db } = await requireAdmin();
    const [usersSnap, ticketsSnap, authCount] = await Promise.all([
      db.collection('users').get(),
      db.collection('supportTickets').get(),
      getAuthoritativeStudentCount(),
    ]);
    const users = rows(usersSnap).filter(user => user.id !== OWNER_ADMIN_UID && (user.role || 'student') === 'student');
    const tickets = rows(ticketsSnap);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const activeStudents = users.filter(user => user.accountStatus === 'active');
    const newStudents = users.filter(user => {
      const created = user.createdAt?.toDate ? user.createdAt.toDate() : new Date(user.createdAt || 0);
      return !Number.isNaN(created.getTime()) && created >= cutoff;
    });
    const recentStudents = [...users].sort((a, b) => String(b.createdAt?.toMillis?.() || b.createdAt || '').localeCompare(String(a.createdAt?.toMillis?.() || a.createdAt || ''))).slice(0, 8);
    const recentTickets = [...tickets].sort((a, b) => String(b.createdAt?.toMillis?.() || b.createdAt || '').localeCompare(String(a.createdAt?.toMillis?.() || a.createdAt || ''))).slice(0, 8);
    return {
      stats: {
        totalStudents: authCount.studentAuthCount,
        activeStudents: activeStudents.length,
        newStudents: newStudents.length,
        verifiedAccounts: users.filter(user => user.emailVerified === true).length,
        supportRequests: tickets.filter(ticket => ['open', 'in_progress'].includes(ticket.status)).length,
        firestoreStudentCount: authCount.firestoreStudentCount,
        matchedStudentCount: authCount.matchedStudentCount,
        firestoreOnlyCount: authCount.firestoreOnlyCount,
        authOnlyCount: authCount.authOnlyCount,
      },
      charts: { userGrowth: [], registrations: [], activeUsers: [] },
      recentStudents, recentTickets, activity: []
    };
  },

  async getStudents(filters = {}) {
    const { db } = await requireAdmin();
    const [usersSnap, profilesSnap, facultiesSnap, departmentsSnap, programmesSnap, levelsSnap] = await Promise.all([
      db.collection('users').get(), db.collection('academicProfiles').get(), db.collection('faculties').get(), db.collection('departments').get(), db.collection('programmes').get(), db.collection('levels').get()
    ]);
    const users = rows(usersSnap).filter(user => user.id !== OWNER_ADMIN_UID && (user.role || 'student') === 'student');
    const profiles = new Map(rows(profilesSnap).map(profile => [profile.id, profile]));
    const faculties = new Map(rows(facultiesSnap).map(row => [row.id, nameOf(row)]));
    const departments = new Map(rows(departmentsSnap).map(row => [row.id, nameOf(row)]));
    const programmes = new Map(rows(programmesSnap).map(row => [row.id, nameOf(row)]));
    const levels = new Map(rows(levelsSnap).map(row => [row.id, nameOf(row)]));
    let result = users.map(user => {
      const profile = profiles.get(user.id) || {};
      return { ...user, facultyName: profile.facultyName || faculties.get(profile.facultyId) || '', departmentName: profile.departmentName || departments.get(profile.departmentId) || '', programmeName: profile.programmeName || programmes.get(profile.programmeId) || '', levelName: profile.currentLevelName || levels.get(profile.currentLevelId) || '', facultyId: profile.facultyId || '', departmentId: profile.departmentId || '', programmeId: profile.programmeId || '', currentLevelId: profile.currentLevelId || '' };
    });
    if (filters.status) result = result.filter(row => row.accountStatus === filters.status);
    if (filters.facultyId) result = result.filter(row => row.facultyId === filters.facultyId);
    return result;
  },

  async deleteStudent(studentId) {
    const { user, db } = await requireAdmin();
    if (!studentId || studentId === OWNER_ADMIN_UID) throw Object.assign(new Error('That account cannot be deleted.'), { code: 'validation/student-delete' });
    const userSnap = await db.collection('users').doc(studentId).get();
    if (!userSnap.exists) throw Object.assign(new Error('Student account not found.'), { code: 'not-found/student' });
    if ((userSnap.data()?.role || 'student') !== 'student') throw Object.assign(new Error('Only student accounts can be deleted here.'), { code: 'validation/student-delete' });

    try {
      const result = await deleteStudentThroughTrustedBackend(studentId);
      return result;
    } catch (error) {
      await writeAudit({ action: 'deleteStudent', resource: 'student', resourceId: studentId, status: 'failed', description: error?.message || 'Student account deletion failed.', user });
      throw error;
    }
  },

  async sendNotification(payload) {
    const title = String(payload?.title || '').trim();
    const message = String(payload?.message || '').trim();
    if (!title || message.length < 5) throw Object.assign(new Error('Enter a title and a message of at least 5 characters.'), { code: 'validation/notification' });
    const { user } = await requireAdmin();
    try {
      const result = await createNotificationRecords(payload);
      await writeAudit({ action: 'sendNotification', resource: 'notification', resourceId: result.id, status: 'success', description: `Notification \"${title}\" sent to ${result.recipientCount} student(s).`, user });
      return result;
    } catch (error) {
      await writeAudit({ action: 'sendNotification', resource: 'notification', resourceId: '', status: 'failed', description: error?.message || 'Notification send failed.', user });
      throw error;
    }
  }
});
