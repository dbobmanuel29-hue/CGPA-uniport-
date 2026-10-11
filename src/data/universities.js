// University registry. A university is supported only when its academic rules and
// catalogue have been checked; do not infer a grading scale or matriculation format.
export const UNIVERSITIES = Object.freeze([
  Object.freeze({
    id: 'UNIPORT',
    name: 'University of Port Harcourt',
    shortName: 'UniPort',
    location: 'Rivers State, Nigeria',
    status: 'supported',
    gradingScale: 5,
    catalogueSource: 'fallback-and-admin-catalogue',
    matriculation: Object.freeze({
      label: 'Matriculation / registration number',
      placeholder: 'e.g. U2023/5570242 or your ARIS registration number',
      hint: 'Enter the matriculation or registration number exactly as shown on your official UniPort/ARIS record. Common examples include U2023/5570242 and a 12-digit number followed by two letters. This checks format only, not enrolment.',
      examples: Object.freeze(['U2023/5570242', '202330540053HF']),
      formatVerified: 'examples-only',
    }),
  }),
  Object.freeze({
    id: 'RSU',
    name: 'Rivers State University',
    shortName: 'RSU',
    location: 'Rivers State, Nigeria',
    status: 'coming-soon',
    matriculation: Object.freeze({
      label: 'Matriculation number',
      placeholder: 'Enter the number exactly as shown on your RSU record',
      hint: 'RSU’s official registration page shows an example in the form DE.1234/5678. Academic calculations remain disabled until RSU grading rules and catalogue are verified.',
      examples: Object.freeze(['DE.1234/5678']),
      formatVerified: 'official-portal-example',
    }),
  }),
  Object.freeze({
    id: 'UNILAG',
    name: 'University of Lagos',
    shortName: 'UNILAG',
    location: 'Lagos State, Nigeria',
    status: 'coming-soon',
    matriculation: Object.freeze({
      label: 'Matriculation number',
      placeholder: 'Enter the number exactly as shown on your student portal',
      hint: 'Use your official UNILAG student matriculation number. A strict format will not be assumed without an authoritative format specification.',
      examples: Object.freeze([]),
      formatVerified: 'not-yet-verified',
    }),
  }),
  Object.freeze({
    id: 'UNN',
    name: 'University of Nigeria, Nsukka',
    shortName: 'UNN',
    location: 'Enugu State, Nigeria',
    status: 'coming-soon',
    matriculation: Object.freeze({
      label: 'Registration / matriculation number',
      placeholder: 'Enter the number exactly as shown on your student portal',
      hint: 'Use your official UNN student number. Formats can differ by programme, so CGPA+ will not guess a strict pattern.',
      examples: Object.freeze([]),
      formatVerified: 'not-yet-verified',
    }),
  }),
]);

export const UNIVERSITY = UNIVERSITIES.find(university => university.id === 'UNIPORT');

export function getUniversityById(universityId) {
  return UNIVERSITIES.find(university => university.id === String(universityId || '').trim().toUpperCase()) || null;
}

export function isUniversitySupported(universityId) {
  return getUniversityById(universityId)?.status === 'supported';
}

export function getMatriculationConfig(universityId) {
  return getUniversityById(universityId)?.matriculation || null;
}
