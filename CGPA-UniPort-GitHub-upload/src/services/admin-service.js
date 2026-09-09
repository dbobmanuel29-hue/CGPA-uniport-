import { createService } from './adapter.js';
export const adminService = createService('admin', [
  'getDashboard', 'getStudents', 'getStudent', 'getAcademicProfile', 'getAuditLogs', 'getSettings', 'updateSettings',
  'getFaculties', 'createFaculty', 'updateFaculty', 'deleteFaculty',
  'getDepartments', 'createDepartment', 'updateDepartment', 'deleteDepartment',
  'getProgrammes', 'createProgramme', 'updateProgramme', 'deleteProgramme',
  'getCourses', 'createCourse', 'updateCourse', 'deleteCourse',
  'getAcademicVersions', 'createAcademicVersion', 'updateAcademicVersion', 'deleteAcademicVersion',
  'getLevels', 'createLevel', 'updateLevel', 'deleteLevel',
  'getSemesters', 'createSemester', 'updateSemester', 'deleteSemester',
  'getAcademicSessions', 'createAcademicSession', 'updateAcademicSession', 'deleteAcademicSession',
  'getGradingRules', 'createGradingRule', 'updateGradingRule', 'deleteGradingRule',
  'getNotifications', 'saveNotificationDraft', 'sendNotification', 'scheduleNotification',
]);