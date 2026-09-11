import { configureServices, getServiceAdapter } from '../services/adapter.js';
import { getFirebase } from './firebase-client.js';

const OWNER_ADMIN_UID = 'lmUB6IdhuaOlHjzkqBEyoNkE7PH2';
const READ_ONLY = new Set(['getDashboard','getStudents','getStudent','getAcademicProfile','getAuditLogs','getSettings','getFaculties','getDepartments','getProgrammes','getCourses','getAcademicVersions','getLevels','getSemesters','getAcademicSessions','getGradingRules','getNotifications']);
const now = () => window.firebase.firestore.FieldValue.serverTimestamp();
const asDate = value => value?.toDate ? value.toDate().toISOString() : (value || null);

async function requireAdmin() {
  const sdk = await getFirebase();
  if (!sdk) throw Object.assign(new Error('Firebase is not configured.'), { code: 'BACKEND_NOT_CONNECTED' });
  const { auth, db } = sdk;
  const user = auth.currentUser;
  if (!user) throw Object.assign(new Error('Authentication required.'), { code: 'unauthorized' });
  if (user.uid === OWNER_ADMIN_UID) return { ...sdk, user };
  const account = await db.collection('users').doc(user.uid).get();
  if (account.exists && account.data()?.role === 'admin') return { ...sdk, user };
  const token = await user.getIdTokenResult(true);
  if (token.claims.admin === true || token.claims.role === 'admin') return { ...sdk, user };
  throw Object.assign(new Error('Administrator access required.'), { code: 'permission-denied' });
}

function resourceTypeFor(action) {
  if (/student/i.test(action)) return 'student';
  if (/faculty|department|programme|course|academic|level|semester|grading|session/i.test(action)) return 'academic';
  if (/support/i.test(action)) return 'support';
  if (/notification/i.test(action)) return 'notification';
  if (/setting/i.test(action)) return 'settings';
  return 'admin';
}

async function writeAudit({ action, resource, resourceId, status, description, actor }) {
  try {
    const { db } = await requireAdmin();
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    await db.collection('auditLogs').add({
      actorId: actor.uid,
      actorName: actor.displayName || actor.email || 'Administrator',
      actorEmail: actor.email || '',
      action,
      resource: resource || resourceTypeFor(action),
      resourceType: resource || resourceTypeFor(action),
      resourceId: resourceId || '',
      status,
      description: description || `${action} ${status}`,
      ipAddress: 'Not collected',
      device: ua ? ua.slice(0, 240) : 'Unknown browser',
      createdAt: now()
    });
  } catch (error) {
    console.warn('Audit event could not be recorded:', error?.message || error);
  }
}

function getResourceId(args) {
  const first = args?.[0];
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object') return first.id || first.studentId || first.facultyId || first.departmentId || first.programmeId || first.courseId || first.levelId || first.semesterId || first.academicSessionId || '';
  return '';
}

export async function registerAuditFix() {
  const methods = {};
  const names = [
    'getDashboard','getStudents','getStudent','deleteStudent','getAcademicProfile','getAuditLogs','getSettings','updateSettings',
    'getFaculties','createFaculty','updateFaculty','deleteFaculty','getDepartments','createDepartment','updateDepartment','deleteDepartment',
    'getProgrammes','createProgramme','updateProgramme','deleteProgramme','getCourses','createCourse','updateCourse','deleteCourse',
    'getAcademicVersions','createAcademicVersion','updateAcademicVersion','deleteAcademicVersion','getLevels','createLevel','updateLevel','deleteLevel',
    'getSemesters','createSemester','updateSemester','deleteSemester','getAcademicSessions','createAcademicSession','updateAcademicSession','deleteAcademicSession',
    'getGradingRules','createGradingRule','updateGradingRule','deleteGradingRule','getNotifications','saveNotificationDraft','sendNotification','scheduleNotification','updateNotification','deleteNotification'
  ];

  const currentAdapters = Object.fromEntries(names.map(name => [name, getServiceAdapter('admin', name)]));

  methods.getAuditLogs = async ({ status = '', resourceType = '' } = {}) => {
    const { db } = await requireAdmin();
    const snap = await db.collection('auditLogs').get();
    return snap.docs
      .map(doc => ({ id: doc.id, ...doc.data(), createdAt: asDate(doc.data()?.createdAt) }))
      .filter(row => !status || row.status === status)
      .filter(row => !resourceType || row.resourceType === resourceType || row.resource === resourceType)
      .sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''));
  };

  for (const name of names) {
    if (name === 'getAuditLogs') continue;
    const original = currentAdapters[name];
    if (!original || READ_ONLY.has(name)) {
      if (original) methods[name] = original;
      continue;
    }
    methods[name] = async (...args) => {
      const { user } = await requireAdmin();
      const resourceId = getResourceId(args);
      try {
        const result = await original(...args);
        await writeAudit({
          action: name,
          resource: resourceTypeFor(name),
          resourceId,
          status: 'success',
          description: `${name} completed successfully.`,
          actor: user
        });
        return result;
      } catch (error) {
        await writeAudit({
          action: name,
          resource: resourceTypeFor(name),
          resourceId,
          status: error?.code === 'permission-denied' ? 'denied' : 'failed',
          description: error?.message || `${name} failed.`,
          actor: user
        });
        throw error;
      }
    };
  }

  configureServices({ admin: methods });
}
