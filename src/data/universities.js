// Central registry for university-specific academic configuration.
// Only institutions with verified catalogues and grading rules should be marked supported.
export const UNIVERSITIES = Object.freeze([
  Object.freeze({
    id: 'UNIPORT',
    name: 'University of Port Harcourt',
    shortName: 'UniPort',
    location: 'Rivers State, Nigeria',
    status: 'supported',
    gradingScale: 5,
    catalogueSource: 'fallback-and-admin-catalogue',
  }),
]);

export const UNIVERSITY = UNIVERSITIES.find(university => university.id === 'UNIPORT');

export function getUniversityById(universityId) {
  return UNIVERSITIES.find(university => university.id === String(universityId || '').trim().toUpperCase()) || null;
}

export function isUniversitySupported(universityId) {
  return getUniversityById(universityId)?.status === 'supported';
}
