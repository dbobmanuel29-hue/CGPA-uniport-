import { UNIVERSITY } from './universities.js';
export { UNIVERSITY } from './universities.js';

export const ACADEMIC_HIERARCHY = Object.freeze([
  'University', 'Faculty', 'Department', 'Programme', 'Academic Version', 'Level', 'Semester', 'Course',
]);

// The active fallback catalogue remains UniPort-specific until another institution's
// catalogue and grading policy have been verified and configured.
export const ACADEMIC_CATALOGUE = Object.freeze({
  universityId: UNIVERSITY.id,
  faculties: [], departments: [], programmes: [], versions: [], levels: [], semesters: [], sessions: [], courses: [],
});
