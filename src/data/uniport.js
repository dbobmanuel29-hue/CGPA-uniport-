export const UNIVERSITY = Object.freeze({
  id: 'UNIPORT', name: 'University of Port Harcourt', shortName: 'UniPort',
  location: 'Rivers State, Nigeria', locked: true,
});

export const ACADEMIC_HIERARCHY = Object.freeze([
  'University', 'Faculty', 'Department', 'Programme', 'Academic Version', 'Level', 'Semester', 'Course',
]);

// There is intentionally no invented university catalogue in this frontend.
export const ACADEMIC_CATALOGUE = Object.freeze({
  faculties: [], departments: [], programmes: [], versions: [], levels: [], semesters: [], sessions: [], courses: [],
});