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
