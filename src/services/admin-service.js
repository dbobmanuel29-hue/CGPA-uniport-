import { createService } from './adapter.js';
import { getFirebase } from '../integration/firebase-client.js';
import { FALLBACK_FACULTIES } from '../data/uniport-catalogue.js';

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

const accountStatusReason = user => {
  const status = String(user?.accountStatus || '').trim().toLowerCase();
  if (user?.accountStatusReason) return String(user.accountStatusReason);
  if (status === 'suspended') return 'Account has been suspended by an administrator.';
  if (status === 'pending') return 'Account is pending activation or setup.';
  if (status === 'inactive') return 'Account has been marked inactive.';
  if (status === 'deletion_requested') return 'The student requested account deletion.';
  if (status === 'blocked') return 'Account access has been blocked.';
  if (!status) return 'No active account status is recorded for this account.';
  return `Account status is “${status}”.`;
};

async function getAuthoritativeStudentCount() {
  const sdk = await getFirebase();
  if (!sdk?.auth?.currentUser) throw Object.assign(new Error('Authentication required.'), { code: 'unauthorized' });

  const token = await sdk.auth.currentUser.getIdToken();
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

// Resolve the academic IDs stored on a student profile against the same
// catalogue collections used by the student directory. This keeps the
// admin "View academic" modal useful even when older profiles do not have
// denormalized *Name fields saved on the profile document.
async function getResolvedAcademicProfile(studentId) {
  const { db } = await requireAdmin();
  if (!studentId) throw Object.assign(new Error('Student ID is required.'), { code: 'validation/student-id' });

  const profileSnap = await db.collection('academicProfiles').doc(studentId).get();
  if (!profileSnap.exists) throw Object.assign(new Error('Academic profile not found.'), { code: 'not-found' });

  const profile = profileSnap.data() || {};
  const [facultiesSnap, departmentsSnap, programmesSnap, sessionsSnap, levelsSnap, semestersSnap] = await Promise.all([
    db.collection('faculties').get(),
    db.collection('departments').get(),
    db.collection('programmes').get(),
    db.collection('academicSessions').get(),
    db.collection('levels').get(),
    db.collection('semesters').get(),
  ]);

  const faculties = new Map(rows(facultiesSnap).map(row => [row.id, nameOf(row)]));
  const departments = new Map(rows(departmentsSnap).map(row => [row.id, nameOf(row)]));
  const programmes = new Map(rows(programmesSnap).map(row => [row.id, nameOf(row)]));
  const sessions = new Map(rows(sessionsSnap).map(row => [row.id, nameOf(row)]));
  const levels = new Map(rows(levelsSnap).map(row => [row.id, nameOf(row)]));
  const semesters = new Map(rows(semestersSnap).map(row => [row.id, nameOf(row)]));

  const resolve = (storedName, storedId, map) => storedName || (storedId ? map.get(storedId) : '') || '';

  return {
    id: studentId,
    universityId: profile.universityId || 'uniport',
    universityName: profile.universityName || 'University of Port Harcourt',
    ...profile,
    facultyName: resolve(profile.facultyName, profile.facultyId, faculties),
    departmentName: resolve(profile.departmentName, profile.departmentId, departments),
    programmeName: resolve(profile.programmeName, profile.programmeId, programmes),
    admissionSessionName: resolve(profile.admissionSessionName, profile.admissionSessionId, sessions),
    currentSessionName: resolve(profile.currentSessionName, profile.currentSessionId, sessions),
    currentLevelName: resolve(profile.currentLevelName, profile.currentLevelId, levels),
    currentSemesterName: resolve(profile.currentSemesterName, profile.currentSemesterId, semesters),
  };
}

export const adminService = Object.freeze({
  ...adminReadWriteService,

  async getDashboard() {
    const { db } = await requireAdmin();
    const [usersSnap, ticketsSnap, authCount, auditSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('supportTickets').get(),
      getAuthoritativeStudentCount(),
      db.collection('auditLogs').orderBy('createdAt', 'desc').limit(12).get(),
    ]);
    const users = rows(usersSnap).filter(user => user.id !== OWNER_ADMIN_UID && (user.role || 'student') === 'student');
    const tickets = rows(ticketsSnap);
    const authStudents = Array.isArray(authCount.authStudents) ? authCount.authStudents : [];
    const profileById = new Map(users.map(user => [user.id, user]));
    const students = authStudents.map(authUser => ({
      ...(profileById.get(authUser.id) || {}),
      ...authUser,
      accountStatus: authUser.disabled ? 'disabled' : (profileById.get(authUser.id)?.accountStatus || 'active'),
      statusReason: authUser.disabled
        ? 'Account is disabled in Firebase Authentication.'
        : (profileById.get(authUser.id)?.accountStatusReason || ''),
    }));
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);
    const activeStudents = students.filter(student => student.accountStatus === 'active');
    const nonActiveStudents = students.filter(student => student.accountStatus !== 'active');
    const newStudents = students.filter(student => {
      const created = new Date(student.createdAt || 0);
      return !Number.isNaN(created.getTime()) && created >= cutoff;
    });
    const verifiedAccounts = students.filter(student => student.emailVerified === true).length;
    const recentStudents = [...students].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 8);
    const recentTickets = [...tickets].sort((a, b) => String(b.createdAt?.toMillis?.() || b.createdAt || '').localeCompare(String(a.createdAt?.toMillis?.() || a.createdAt || ''))).slice(0, 8);
    const activity = rows(auditSnap).map(row => ({
      ...row,
      fullName: row.actorName || row.actorEmail || 'Administrator',
      email: row.actorEmail || '',
      action: row.description || row.action || 'System activity',
    }));
    return {
      stats: {
        totalStudents: authCount.studentAuthCount,
        activeStudents: activeStudents.length,
        nonActiveStudents: nonActiveStudents.length,
        newStudents: newStudents.length,
        verifiedAccounts,
        supportRequests: tickets.filter(ticket => ['open', 'in_progress'].includes(ticket.status)).length,
        firestoreStudentCount: authCount.firestoreStudentCount,
        matchedStudentCount: authCount.matchedStudentCount,
        firestoreOnlyCount: authCount.firestoreOnlyCount,
        authOnlyCount: authCount.authOnlyCount,
      },
      charts: { userGrowth: [], registrations: [], activeUsers: [] },
      recentStudents, recentTickets, activity,
      supportRequests: tickets.filter(ticket => ['open', 'in_progress'].includes(ticket.status)).sort((a, b) => String(b.createdAt?.toMillis?.() || b.createdAt || '').localeCompare(String(a.createdAt?.toMillis?.() || a.createdAt || ''))),
      students,
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
      return { ...user, facultyName: profile.facultyName || faculties.get(profile.facultyId) || '', departmentName: profile.departmentName || departments.get(profile.departmentId) || '', programmeName: profile.programmeName || programmes.get(profile.programmeId) || '', levelName: profile.currentLevelName || levels.get(profile.currentLevelId) || '', facultyId: profile.facultyId || '', departmentId: profile.departmentId || '', programmeId: profile.programmeId || '', currentLevelId: profile.currentLevelId || '', statusReason: accountStatusReason(user), isActive: user.accountStatus === 'active' };
    });
    if (filters.status === 'non-active') result = result.filter(row => row.accountStatus !== 'active');
    else if (filters.status) result = result.filter(row => row.accountStatus === filters.status);
    if (filters.facultyId) result = result.filter(row => row.facultyId === filters.facultyId);
    return result;
  },

  async getAcademicProfile(studentId) {
    return getResolvedAcademicProfile(studentId);
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

  async getFaculties(filters = {}) {
    const { db } = await requireAdmin();
    let faculties = rows(await db.collection('faculties').get());
    if (filters?.status) faculties = faculties.filter(row => row.status === filters.status);
    if (!faculties.length) {
      faculties = FALLBACK_FACULTIES.map(row => ({ ...row }));
      if (filters?.status) faculties = faculties.filter(row => row.status === filters.status);
    }
    return faculties;
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
