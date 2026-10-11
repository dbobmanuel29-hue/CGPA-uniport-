// University registry. A university is calculation-enabled only after its grading
// policy, academic catalogue and registration-number guidance are verified.
const matriculationGuidance = (label = 'Matriculation / registration number') => Object.freeze({
  label,
  placeholder: 'Enter the number exactly as shown on your official student record',
  hint: 'Use the number shown on your university student portal or official record. CGPA+ does not assume a strict format until an authoritative example or specification has been verified.',
  examples: Object.freeze([]),
  formatVerified: 'not-yet-verified',
});

const comingSoon = (id, name, shortName, location, matriculation = matriculationGuidance()) => Object.freeze({
  id, name, shortName, location, status: 'coming-soon', matriculation,
});

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
      hint: 'Enter the matriculation or registration number exactly as shown on your official UniPort/ARIS record. Examples are guidance only and do not verify enrolment.',
      examples: Object.freeze(['U2023/5570242', '202330540053HF']),
      formatVerified: 'examples-only',
    }),
  }),
  comingSoon('RSU', 'Rivers State University', 'RSU', 'Rivers State, Nigeria', Object.freeze({
    label: 'Matriculation number',
    placeholder: 'Enter the number exactly as shown on your RSU record',
    hint: 'An RSU registration page shows an example in the form DE.1234/5678. This is not an enrolment check; academic calculations remain disabled pending verified RSU rules and catalogue.',
    examples: Object.freeze(['DE.1234/5678']),
    formatVerified: 'official-portal-example',
  })),
  comingSoon('UNILAG', 'University of Lagos', 'UNILAG', 'Lagos State, Nigeria'),
  comingSoon('UNN', 'University of Nigeria, Nsukka', 'UNN', 'Enugu State, Nigeria', matriculationGuidance('Registration / matriculation number')),
  comingSoon('UI', 'University of Ibadan', 'UI', 'Oyo State, Nigeria'),
  comingSoon('OAU', 'Obafemi Awolowo University', 'OAU', 'Osun State, Nigeria'),
  comingSoon('UNIBEN', 'University of Benin', 'UNIBEN', 'Edo State, Nigeria'),
  comingSoon('UNICAL', 'University of Calabar', 'UNICAL', 'Cross River State, Nigeria'),
  comingSoon('UNIUYO', 'University of Uyo', 'UNIUYO', 'Akwa Ibom State, Nigeria'),
  comingSoon('UNILORIN', 'University of Ilorin', 'UNILORIN', 'Kwara State, Nigeria'),
  comingSoon('ABU', 'Ahmadu Bello University', 'ABU', 'Kaduna State, Nigeria'),
  comingSoon('BUK', 'Bayero University Kano', 'BUK', 'Kano State, Nigeria'),
  comingSoon('UDUS', 'Usmanu Danfodiyo University', 'UDUS', 'Sokoto State, Nigeria'),
  comingSoon('UNIMAID', 'University of Maiduguri', 'UNIMAID', 'Borno State, Nigeria'),
  comingSoon('FUTO', 'Federal University of Technology, Owerri', 'FUTO', 'Imo State, Nigeria'),
  comingSoon('FUTA', 'Federal University of Technology, Akure', 'FUTA', 'Ondo State, Nigeria'),
  comingSoon('UNIZIK', 'Nnamdi Azikiwe University', 'UNIZIK', 'Anambra State, Nigeria'),
  comingSoon('LASU', 'Lagos State University', 'LASU', 'Lagos State, Nigeria'),
  comingSoon('DELSU', 'Delta State University', 'DELSU', 'Delta State, Nigeria'),
  comingSoon('IAUE', 'Ignatius Ajuru University of Education', 'IAUE', 'Rivers State, Nigeria'),
  comingSoon('BSU', 'Benue State University', 'BSU', 'Benue State, Nigeria'),
  comingSoon('NDU', 'Niger Delta University', 'NDU', 'Bayelsa State, Nigeria'),
  comingSoon('FUPRE', 'Federal University of Petroleum Resources, Effurun', 'FUPRE', 'Delta State, Nigeria'),
  comingSoon('COVENANT', 'Covenant University', 'Covenant', 'Ogun State, Nigeria'),
  comingSoon('BABCOCK', 'Babcock University', 'Babcock', 'Ogun State, Nigeria'),
  comingSoon('AUN', 'American University of Nigeria', 'AUN', 'Adamawa State, Nigeria'),
  comingSoon('UNIOSUN', 'Osun State University', 'UNIOSUN', 'Osun State, Nigeria'),
  comingSoon('EKSU', 'Ekiti State University', 'EKSU', 'Ekiti State, Nigeria'),
  comingSoon('FUNAAB', 'Federal University of Agriculture, Abeokuta', 'FUNAAB', 'Ogun State, Nigeria'),
  comingSoon('UNIABUJA', 'University of Abuja', 'UNIABUJA', 'FCT, Nigeria'),
  comingSoon('MOUAU', 'Michael Okpara University of Agriculture, Umudike', 'MOUAU', 'Abia State, Nigeria'),
  comingSoon('IMSU', 'Imo State University', 'IMSU', 'Imo State, Nigeria'),
  comingSoon('AAU', 'Ambrose Alli University', 'AAU', 'Edo State, Nigeria'),
  comingSoon('LASUSTECH', 'Lagos State University of Science and Technology', 'LASUSTECH', 'Lagos State, Nigeria'),
  comingSoon('FUBK', 'Federal University, Birnin Kebbi', 'FUBK', 'Kebbi State, Nigeria'),
  comingSoon('FUD', 'Federal University, Dutse', 'FUD', 'Jigawa State, Nigeria'),
  comingSoon('FUOYE', 'Federal University, Oye-Ekiti', 'FUOYE', 'Ekiti State, Nigeria'),
  comingSoon('FULAFIA', 'Federal University, Lafia', 'FULAFIA', 'Nasarawa State, Nigeria'),
  comingSoon('FUOTUOKE', 'Federal University, Otuoke', 'FUOTUOKE', 'Bayelsa State, Nigeria'),
  comingSoon('NOUN', 'National Open University of Nigeria', 'NOUN', 'FCT, Nigeria'),
]);

// First rollout candidates are ordered for practical launch value, not as a claim
// that every student at these institutions lacks a calculator. Selection balances
// likely student reach, regional rollout, public-university coverage and the need
// to verify institution-specific grading rules before enabling calculations.
export const UNIVERSITY_ROLLOUT_PRIORITY = Object.freeze([
  Object.freeze({ universityId: 'RSU', rank: 1, reason: 'Nearby to the UniPort launch base; efficient first partner/outreach test in Rivers State.' }),
  Object.freeze({ universityId: 'UNN', rank: 2, reason: 'Large established public university; helps extend coverage into the South-East.' }),
  Object.freeze({ universityId: 'UNILAG', rank: 3, reason: 'Major public university and an important South-West adoption test.' }),
  Object.freeze({ universityId: 'UI', rank: 4, reason: 'Major established university; official material shows a 4-point policy, so it is a valuable grading-engine test.' }),
  Object.freeze({ universityId: 'UNIBEN', rank: 5, reason: 'Established public university that expands coverage into the South-South.' }),
  Object.freeze({ universityId: 'UNICAL', rank: 6, reason: 'Regional South-South coverage and practical student outreach.' }),
  Object.freeze({ universityId: 'UNIUYO', rank: 7, reason: 'Regional coverage in Akwa Ibom and a natural next public-university cohort.' }),
  Object.freeze({ universityId: 'OAU', rank: 8, reason: 'Major public university and a useful South-West validation cohort.' }),
  Object.freeze({ universityId: 'UNILORIN', rank: 9, reason: 'Broad public-university reach; verify the applicable grading policy by admission cohort.' }),
  Object.freeze({ universityId: 'ABU', rank: 10, reason: 'Important northern public-university coverage.' }),
  Object.freeze({ universityId: 'BUK', rank: 11, reason: 'Important north-western public-university coverage.' }),
  Object.freeze({ universityId: 'UNIZIK', rank: 12, reason: 'Adds another major South-East student cohort.' }),
  Object.freeze({ universityId: 'FUTO', rank: 13, reason: 'Technology-focused public-university cohort and South-East coverage.' }),
  Object.freeze({ universityId: 'FUTA', rank: 14, reason: 'Technology-focused public-university cohort and South-West coverage.' }),
  Object.freeze({ universityId: 'LASU', rank: 15, reason: 'Adds another large Lagos-area public-university cohort.' }),
  Object.freeze({ universityId: 'IAUE', rank: 16, reason: 'Nearby Rivers State institution; potential efficient partner outreach.' }),
  Object.freeze({ universityId: 'NDU', rank: 17, reason: 'Adds Bayelsa and wider Niger Delta coverage.' }),
  Object.freeze({ universityId: 'DELSU', rank: 18, reason: 'Adds Delta State public-university coverage.' }),
  Object.freeze({ universityId: 'UNIABUJA', rank: 19, reason: 'Adds Federal Capital Territory coverage.' }),
  Object.freeze({ universityId: 'UNIMAID', rank: 20, reason: 'Adds North-East regional coverage.' }),
]);

const rolloutPriorityById = new Map(UNIVERSITY_ROLLOUT_PRIORITY.map(item => [item.universityId, item]));

export function getUniversityRolloutPriority(universityId) {
  return rolloutPriorityById.get(String(universityId || '').trim().toUpperCase()) || null;
}

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
