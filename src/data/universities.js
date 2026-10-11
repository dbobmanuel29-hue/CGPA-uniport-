// CGPA+ rollout registry: focus on public universities whose students may need an
// independent GPA/CGPA tool. Private universities are intentionally excluded from this product directory.
// A university is calculation-enabled only after its grading policy, academic catalogue and
// registration-number guidance are verified.
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

  // Additional federal universities from the NUC's published federal-university directory.
  comingSoon('ATBU', 'Abubakar Tafawa Balewa University', 'ATBU', 'Bauchi State, Nigeria'),
  comingSoon('FUGASHUA', 'Federal University Gashua', 'FUGASHUA', 'Yobe State, Nigeria'),
  comingSoon('FUTMINNA', 'Federal University of Technology, Minna', 'FUTMINNA', 'Niger State, Nigeria'),
  comingSoon('FUDUTSINMA', 'Federal University, Dutsin-Ma', 'FUDUTSINMA', 'Katsina State, Nigeria'),
  comingSoon('FUKASHERE', 'Federal University, Kashere', 'FUKASHERE', 'Gombe State, Nigeria'),
  comingSoon('FULOKOJA', 'Federal University, Lokoja', 'FULOKOJA', 'Kogi State, Nigeria'),
  comingSoon('AEFUNAI', 'Alex Ekwueme Federal University, Ndufu-Alike', 'AE-FUNAI', 'Ebonyi State, Nigeria'),
  comingSoon('FUWUKARI', 'Federal University, Wukari', 'FUWUKARI', 'Taraba State, Nigeria'),
  comingSoon('FUGUS', 'Federal University, Gusau', 'FUGUS', 'Zamfara State, Nigeria'),
  comingSoon('MAUTECH', 'Modibbo Adama University', 'MAUTECH', 'Adamawa State, Nigeria'),
  comingSoon('POLAC', 'Nigeria Police Academy, Wudil', 'POLAC', 'Kano State, Nigeria'),
  comingSoon('NDA', 'Nigerian Defence Academy', 'NDA', 'Kaduna State, Nigeria'),
  comingSoon('UNIJOS', 'University of Jos', 'UNIJOS', 'Plateau State, Nigeria'),
  comingSoon('NMU', 'Nigerian Maritime University', 'NMU', 'Delta State, Nigeria'),
  comingSoon('AFIT', 'Air Force Institute of Technology', 'AFIT', 'Kaduna State, Nigeria'),
  comingSoon('NAUB', 'Nigerian Army University, Biu', 'NAUB', 'Borno State, Nigeria'),
  comingSoon('FUHSO', 'Federal University of Health Sciences, Otukpo', 'FUHSO', 'Benue State, Nigeria'),
  comingSoon('FUTBABURA', 'Federal University of Technology, Babura', 'FUT Babura', 'Jigawa State, Nigeria'),
  comingSoon('FUTIA', 'Federal University of Technology, Ikot Abasi', 'FUTIA', 'Akwa Ibom State, Nigeria'),
  comingSoon('FUHSA', 'Federal University of Health Sciences, Azare', 'FUHSA', 'Bauchi State, Nigeria'),
  comingSoon('FUHSI', 'Federal University of Health Sciences, Ila Orangun', 'FUHSI', 'Osun State, Nigeria'),
  comingSoon('ADUN', 'Admiralty University of Nigeria', 'ADUN', 'Delta State, Nigeria'),
  comingSoon('FUTD', 'Federal University of Transportation, Daura', 'FUTD', 'Katsina State, Nigeria'),
  comingSoon('AAAU', 'African Aviation and Aerospace University', 'AAAU', 'FCT, Nigeria'),
  comingSoon('FUBAS', 'Federal University of Agriculture, Bassam-Biri', 'FUBAS', 'Bayelsa State, Nigeria'),
  comingSoon('FUHSK', 'Federal University of Health Sciences, Kwale', 'FUHSK', 'Delta State, Nigeria'),
  comingSoon('FUHSKAT', 'Federal University of Health Sciences, Katsina', 'FUHSKAT', 'Katsina State, Nigeria'),
  comingSoon('FUAMUBI', 'Federal University of Agriculture, Mubi', 'FUAMUBI', 'Adamawa State, Nigeria'),
  comingSoon('FUEZARIA', 'Federal University of Education, Zaria', 'FUE Zaria', 'Kaduna State, Nigeria'),
  comingSoon('ALVANFED', 'Alvan Ikoku Federal University of Education', 'Alvan Ikoku', 'Imo State, Nigeria'),
  comingSoon('YMFUE', 'Yusuf Maitama Sule Federal University of Education', 'YMFUE', 'Kano State, Nigeria'),
  comingSoon('AFUED', 'Adeyemi Federal University of Education', 'AFUED', 'Ondo State, Nigeria'),
  comingSoon('FUAHSE', 'Federal University of Allied Health Sciences, Enugu', 'FUAHSE', 'Enugu State, Nigeria'),
  comingSoon('FUMMSA', 'Federal University of Medicine and Medical Sciences, Abeokuta', 'FUMMSA', 'Ogun State, Nigeria'),
  comingSoon('FUEPANKSHIN', 'Federal University of Education, Pankshin', 'FUE Pankshin', 'Plateau State, Nigeria'),
  comingSoon('FUEKONTAGORA', 'Federal University of Education, Kontagora', 'FUE Kontagora', 'Niger State, Nigeria'),
  comingSoon('UMSORON', 'University of Maritime Studies, Oron', 'UMS Oron', 'Akwa Ibom State, Nigeria'),
  comingSoon('FUETAI', 'Federal University of Environment and Technology, Tai', 'FUET Tai', 'Rivers State, Nigeria'),
  comingSoon('FUASKACHIA', 'Federal University of Applied Sciences, Kachia', 'FUAS Kachia', 'Kaduna State, Nigeria'),
  comingSoon('TASFUE', 'Tai Solarin Federal University of Education', 'TASFUE', 'Ogun State, Nigeria'),
  comingSoon('FUADSI', 'Federal University of Agriculture and Developmental Studies, Iragbiji', 'FUADSI', 'Osun State, Nigeria'),
  comingSoon('FUTESIYIN', 'Federal University of Technology and Environmental Studies, Iyin-Ekiti', 'FUTES', 'Ekiti State, Nigeria'),
  comingSoon('FUATO', 'Federal University of Agriculture and Technology, Okeho', 'FUATO', 'Oyo State, Nigeria'),
  comingSoon('FUHSTZ', 'Federal University of Health Science and Technology, Tsafe', 'FUHST', 'Zamfara State, Nigeria'),
  comingSoon('FUATOBA', 'Federal University of Agriculture and Technology, Obio-Akpa', 'FUATO', 'Akwa Ibom State, Nigeria'),
  comingSoon('FUSTEPE', 'Federal University of Science and Technology, Epe', 'FUST Epe', 'Lagos State, Nigeria'),
  comingSoon('FUSTKABO', 'Federal University of Science and Technology, Kabo', 'FUST Kabo', 'Kano State, Nigeria'),
  // Additional state universities from the NUC's published state-university directory.
  comingSoon('ABSU', 'Abia State University', 'ABSU', 'Abia State, Nigeria'),
  comingSoon('ESUT', 'Enugu State University of Science and Technology', 'ESUT', 'Enugu State, Nigeria'),
  comingSoon('OOU', 'Olabisi Onabanjo University', 'OOU', 'Ogun State, Nigeria'),
  comingSoon('LAUTECH', 'Ladoke Akintola University of Technology', 'LAUTECH', 'Oyo State, Nigeria'),
  comingSoon('PAU', 'Prince Abubakar Audu University', 'PAAU', 'Kogi State, Nigeria'),
  comingSoon('COOU', 'Chukwuemeka Odumegwu Ojukwu University', 'COOU', 'Anambra State, Nigeria'),
  comingSoon('EBSU', 'Ebonyi State University', 'EBSU', 'Ebonyi State, Nigeria'),
  comingSoon('ADUSTECH', 'Aliko Dangote University of Science and Technology', 'ADUSTECH', 'Kano State, Nigeria'),
  comingSoon('ADSU', 'Adamawa State University', 'ADSU', 'Adamawa State, Nigeria'),
  comingSoon('NSUK', 'Nasarawa State University, Keffi', 'NSUK', 'Nasarawa State, Nigeria'),
  comingSoon('UNICROSS', 'University of Cross River State', 'UNICROSS', 'Cross River State, Nigeria'),
  comingSoon('GSU', 'Gombe State University', 'GSU', 'Gombe State, Nigeria'),
  comingSoon('KASU', 'Kaduna State University', 'KASU', 'Kaduna State, Nigeria'),
  comingSoon('IBBU', 'Ibrahim Badamasi Babangida University', 'IBBU', 'Niger State, Nigeria'),
  comingSoon('PLASU', 'Plateau State University', 'PLASU', 'Plateau State, Nigeria'),
  comingSoon('YSU', 'Yobe State University', 'YSU', 'Yobe State, Nigeria'),
  comingSoon('KSUSTA', 'Kebbi State University of Science and Technology, Aliero', 'KSUSTA', 'Kebbi State, Nigeria'),
  comingSoon('UMYU', 'Umaru Musa Yar’Adua University', 'UMYU', 'Katsina State, Nigeria'),
  comingSoon('OSUSTECH', 'Olusegun Agagu University of Science and Technology', 'OAUSTECH', 'Ondo State, Nigeria'),
  comingSoon('TSU', 'Taraba State University', 'TSU', 'Taraba State, Nigeria'),
  comingSoon('KWASU', 'Kwara State University', 'KWASU', 'Kwara State, Nigeria'),
  comingSoon('SSU', 'Sokoto State University', 'SSU', 'Sokoto State, Nigeria'),
  comingSoon('AKSU', 'Akwa Ibom State University', 'AKSU', 'Akwa Ibom State, Nigeria'),
  comingSoon('BASUG', 'Bauchi State University, Gadau', 'BASUG', 'Bauchi State, Nigeria'),
  comingSoon('NWU', 'Northwest University, Kano', 'NWU', 'Kano State, Nigeria'),
  comingSoon('TECHU', 'First Technical University, Ibadan', 'Tech-U', 'Oyo State, Nigeria'),
  comingSoon('SLU', 'Sule Lamido University', 'SLU', 'Jigawa State, Nigeria'),
  comingSoon('UNIMED', 'University of Medical Sciences, Ondo', 'UNIMED', 'Ondo State, Nigeria'),
  comingSoon('EDSU', 'Edo State University, Uzairue', 'EDSU', 'Edo State, Nigeria'),
  comingSoon('KOMU', 'Kingsley Ozumba Mbadiwe University', 'KOMU', 'Imo State, Nigeria'),
  comingSoon('UAT', 'University of Africa, Toru-Orua', 'UAT', 'Bayelsa State, Nigeria'),
  comingSoon('KIBU', 'Kashim Ibrahim University', 'KIBU', 'Borno State, Nigeria'),
  comingSoon('MAUSTECH', 'Moshood Abiola University of Science and Technology', 'MAUSTECH', 'Ogun State, Nigeria'),
  comingSoon('ZAMSU', 'Zamfara State University', 'ZAMSU', 'Zamfara State, Nigeria'),
  comingSoon('BMU', 'Bayelsa Medical University', 'BMU', 'Bayelsa State, Nigeria'),
  comingSoon('UAES', 'University of Agriculture and Environmental Sciences', 'UAES', 'Imo State, Nigeria'),
  comingSoon('CUSTECH', 'Confluence University of Science and Technology', 'CUSTECH', 'Kogi State, Nigeria'),
  comingSoon('BOUESTI', 'Bamidele Olumilua University of Education, Science and Technology', 'BOUESTI', 'Ekiti State, Nigeria'),
  comingSoon('UNIDEL', 'University of Delta', 'UNIDEL', 'Delta State, Nigeria'),
  comingSoon('DSUST', 'Delta State University of Science and Technology', 'DSUST', 'Delta State, Nigeria'),
  comingSoon('DOU', 'Dennis Osadebe University', 'DOU', 'Delta State, Nigeria'),
  comingSoon('LASUED', 'Lagos State University of Education', 'LASUED', 'Lagos State, Nigeria'),
  comingSoon('SSUE', 'Shehu Shagari University of Education', 'SSUE', 'Sokoto State, Nigeria'),
  comingSoon('SUMAS', 'State University of Medical and Applied Sciences', 'SUMAS', 'Enugu State, Nigeria'),
  comingSoon('UNILESA', 'University of Ilesa', 'UNILESA', 'Osun State, Nigeria'),
  comingSoon('EAUED', 'Emanuel Alayande University of Education', 'EAUED', 'Oyo State, Nigeria'),
  comingSoon('KSU-KABBA', 'Kogi State University, Kabba', 'KSU Kabba', 'Kogi State, Nigeria'),
  comingSoon('AKUN', 'Abdulkadir Kure University', 'AKUN', 'Niger State, Nigeria'),
  comingSoon('KWASUED', 'Kwara State University of Education', 'KWASUED', 'Kwara State, Nigeria'),
  comingSoon('AAUAC', 'Abdulsalam Abubakar University of Agriculture and Climate Action', 'AAUAC', 'Niger State, Nigeria'),
  comingSoon('EBSU-ICT', 'Ebonyi State University of ICT, Science and Technology', 'EBSU ICT', 'Ebonyi State, Nigeria'),
  comingSoon('CRUEE', 'Cross River University of Education and Entrepreneurship', 'CRUEE', 'Cross River State, Nigeria'),
  comingSoon('BSUAST', 'Benue State University of Agriculture, Science and Technology', 'BSUAST', 'Benue State, Nigeria'),
  comingSoon('UAAE', 'University of Aeronautics and Aerospace Engineering', 'UAAE', 'Ebonyi State, Nigeria'),



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
