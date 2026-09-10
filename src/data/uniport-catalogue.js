// Verified UniPort fallback catalogue used until the admin academic catalogue is populated in Firestore.
// University and grading details are based on current University of Port Harcourt publications.

export const GRADE_OPTIONS = Object.freeze([
  { grade: 'A', points: 5, score: '70–100' }, { grade: 'B', points: 4, score: '60–69' },
  { grade: 'C', points: 3, score: '50–59' }, { grade: 'D', points: 2, score: '45–49' },
  { grade: 'E', points: 1, score: '40–44' }, { grade: 'F', points: 0, score: '0–39' },
]);

const faculty = (id, name) => ({ id, name, universityId: 'UNIPORT', status: 'active' });
const department = (id, facultyId, name) => ({ id, name, facultyId, status: 'active' });
const programme = (id, departmentId, name) => ({ id, name, departmentId, status: 'active' });

export const FALLBACK_FACULTIES = Object.freeze([
  faculty('faculty-agriculture', 'Faculty of Agriculture'), faculty('faculty-allied-health', 'Faculty of Allied Health Sciences'), faculty('faculty-basic-medical', 'Faculty of Basic Medical Sciences'), faculty('faculty-clinical-sciences', 'Faculty of Clinical Sciences'), faculty('faculty-communication', 'Faculty of Communication & Media Studies'), faculty('faculty-computing', 'Faculty of Computing'), faculty('faculty-dentistry', 'Faculty of Dentistry'), faculty('faculty-education', 'Faculty of Education'), faculty('faculty-engineering', 'Faculty of Engineering'), faculty('faculty-humanities', 'Faculty of Humanities'), faculty('faculty-law', 'Faculty of Law'), faculty('faculty-management', 'Faculty of Management Sciences'), faculty('faculty-pharmaceutical', 'Faculty of Pharmaceutical Sciences'), faculty('faculty-sslt', 'School of Science Laboratory Technology'), faculty('faculty-science', 'Faculty of Science'), faculty('faculty-social-sciences', 'Faculty of Social Sciences'),
]);

export const FALLBACK_DEPARTMENTS = Object.freeze([
  // Agriculture
  department('dept-agri-crop-soil', 'faculty-agriculture', 'Crop and Soil Science'), department('dept-agri-animal', 'faculty-agriculture', 'Animal Science'), department('dept-agri-fisheries', 'faculty-agriculture', 'Fisheries'), department('dept-agri-economics', 'faculty-agriculture', 'Agricultural Economics and Agribusiness Management'), department('dept-agri-forestry', 'faculty-agriculture', 'Forestry and Wildlife Management'), department('dept-agri-food', 'faculty-agriculture', 'Food Science and Nutrition'), department('dept-agri-home', 'faculty-agriculture', 'Home Science'), department('dept-agri-extension', 'faculty-agriculture', 'Agricultural Extension and Development Studies'),
  // Allied Health / health sciences
  department('dept-allied-medlab', 'faculty-allied-health', 'Medical Laboratory Science'), department('dept-allied-nursing', 'faculty-allied-health', 'Nursing Science'),
  // Basic Medical Sciences
  department('dept-basic-anatomy', 'faculty-basic-medical', 'Anatomy'), department('dept-basic-biochemistry', 'faculty-basic-medical', 'Medical Biochemistry'), department('dept-basic-pharmacology', 'faculty-basic-medical', 'Pharmacology'), department('dept-basic-physiology', 'faculty-basic-medical', 'Human Physiology'), department('dept-basic-pathology-anatomical', 'faculty-basic-medical', 'Anatomical Pathology'), department('dept-basic-pathology-chemical', 'faculty-basic-medical', 'Chemical Pathology'), department('dept-basic-haematology', 'faculty-basic-medical', 'Haematology, Blood Transfusion and Immunology'), department('dept-basic-microbiology', 'faculty-basic-medical', 'Medical Microbiology and Parasitology'), department('dept-basic-preventive', 'faculty-basic-medical', 'Preventive and Social Medicine'),
  // Clinical Sciences
  department('dept-clinical-anaesthesiology', 'faculty-clinical-sciences', 'Anaesthesiology'), department('dept-clinical-medicine', 'faculty-clinical-sciences', 'Medicine'), department('dept-clinical-mental-health', 'faculty-clinical-sciences', 'Mental Health'), department('dept-clinical-nursing', 'faculty-clinical-sciences', 'Nursing Science'), department('dept-clinical-obgyn', 'faculty-clinical-sciences', 'Obstetrics and Gynaecology'), department('dept-clinical-preventive', 'faculty-clinical-sciences', 'Preventive and Social Medicine'), department('dept-clinical-paediatrics', 'faculty-clinical-sciences', 'Paediatrics and Child Health'), department('dept-clinical-surgery', 'faculty-clinical-sciences', 'Surgery'), department('dept-clinical-radiology', 'faculty-clinical-sciences', 'Radiology'), department('dept-clinical-ophthalmology', 'faculty-clinical-sciences', 'Ophthalmology'), department('dept-clinical-ent', 'faculty-clinical-sciences', 'Ear, Nose and Throat Surgery'),
  // Communication
  department('dept-communication-broadcasting', 'faculty-communication', 'Broadcasting'), department('dept-communication-film', 'faculty-communication', 'Film and Multimedia Studies'), department('dept-communication-journalism', 'faculty-communication', 'Journalism and Media Studies'), department('dept-communication-pr', 'faculty-communication', 'Public Relations and Advertising'),
  // Computing
  department('dept-computer-science', 'faculty-computing', 'Computer Science'), department('dept-information-technology', 'faculty-computing', 'Information Technology'), department('dept-cyber-security', 'faculty-computing', 'Cyber Security'),
  // Dentistry
  department('dept-dentistry-child', 'faculty-dentistry', 'Child Dental Health'), department('dept-dentistry-oral-surgery', 'faculty-dentistry', 'Oral and Maxillofacial Surgery'), department('dept-dentistry-pathology', 'faculty-dentistry', 'Oral Pathology and Oral Biology'), department('dept-dentistry-preventive', 'faculty-dentistry', 'Preventive Dentistry'), department('dept-dentistry-restorative', 'faculty-dentistry', 'Restorative Dentistry'),
  // Education
  department('dept-education-adult', 'faculty-education', 'Adult and Non-Formal Education'), department('dept-education-curriculum', 'faculty-education', 'Curriculum Studies and Educational Technology'), department('dept-education-early-childhood', 'faculty-education', 'Early Childhood and Primary Education'), department('dept-education-foundations', 'faculty-education', 'Educational Foundations'), department('dept-education-management', 'faculty-education', 'Educational Management and Planning'), department('dept-education-psychology', 'faculty-education', 'Educational Psychology, Guidance and Counselling'), department('dept-education-human-kinetics', 'faculty-education', 'Human Kinetics and Health Education'), department('dept-education-library', 'faculty-education', 'Library and Information Science'), department('dept-education-science', 'faculty-education', 'Science Education'), department('dept-education-environmental', 'faculty-education', 'Environmental Education'),
  // Engineering
  department('dept-engineering-chemical', 'faculty-engineering', 'Chemical Engineering'), department('dept-engineering-civil', 'faculty-engineering', 'Civil and Environmental Engineering'), department('dept-engineering-electrical', 'faculty-engineering', 'Electrical/Electronics Engineering'), department('dept-engineering-mechanical', 'faculty-engineering', 'Mechanical Engineering'), department('dept-engineering-mechatronics', 'faculty-engineering', 'Mechatronics Engineering'), department('dept-engineering-petroleum', 'faculty-engineering', 'Petroleum and Gas Engineering'), department('dept-engineering-environmental', 'faculty-engineering', 'Environmental Engineering'),
  // Humanities
  department('dept-humanities-english', 'faculty-humanities', 'English Studies'), department('dept-humanities-fine-arts', 'faculty-humanities', 'Fine Arts and Design'), department('dept-humanities-foreign-languages', 'faculty-humanities', 'Foreign Languages and Literatures'), department('dept-humanities-history', 'faculty-humanities', 'History and Diplomatic Studies'), department('dept-humanities-linguistics', 'faculty-humanities', 'Linguistics and Communication Studies'), department('dept-humanities-music', 'faculty-humanities', 'Music'), department('dept-humanities-philosophy', 'faculty-humanities', 'Philosophy'), department('dept-humanities-religious', 'faculty-humanities', 'Religious and Cultural Studies'), department('dept-humanities-theatre', 'faculty-humanities', 'Theatre and Film Studies'),
  // Law
  department('dept-law-public', 'faculty-law', 'Public Law'), department('dept-law-private', 'faculty-law', 'Private and Property Law'), department('dept-law-jurisprudence', 'faculty-law', 'Jurisprudence and International Law'), department('dept-law-commercial', 'faculty-law', 'Commercial and Industrial Law'),
  // Management Sciences
  department('dept-management-accounting', 'faculty-management', 'Accounting'), department('dept-management-finance', 'faculty-management', 'Finance and Banking'), department('dept-management-management', 'faculty-management', 'Management'), department('dept-management-marketing', 'faculty-management', 'Marketing'), department('dept-management-hospitality', 'faculty-management', 'Hospitality Management and Tourism'),
  // Pharmaceutical Sciences
  department('dept-pharma-clinical', 'faculty-pharmaceutical', 'Clinical Pharmacy and Management'), department('dept-pharma-experimental', 'faculty-pharmaceutical', 'Experimental Pharmacology and Toxicology'), department('dept-pharma-chemistry', 'faculty-pharmaceutical', 'Pharmaceutical and Medicinal Chemistry'), department('dept-pharma-microbiology', 'faculty-pharmaceutical', 'Pharmaceutical Microbiology and Biotechnology'), department('dept-pharma-pharmaceutics', 'faculty-pharmaceutical', 'Pharmaceutics and Pharmaceutical Technology'), department('dept-pharma-pharmacognosy', 'faculty-pharmaceutical', 'Pharmacognosy and Phytotherapy'),
  // SSLT
  department('dept-sslt-biochem', 'faculty-sslt', 'Biochemistry and Chemistry Technology'), department('dept-sslt-biology', 'faculty-sslt', 'Biology and Biotechnology'), department('dept-sslt-biomedical', 'faculty-sslt', 'Biomedical Technology'), department('dept-sslt-geology', 'faculty-sslt', 'Geology and Mining Technology'), department('dept-sslt-industrial-chem', 'faculty-sslt', 'Industrial Chemistry and Petroleum Technology'), department('dept-sslt-microbiology', 'faculty-sslt', 'Microbiology Technology'), department('dept-sslt-physics-electronics', 'faculty-sslt', 'Physics with Electronic Technology'), department('dept-sslt-physics-production', 'faculty-sslt', 'Physics with Production Technology'),
  // Science
  department('dept-science-animal', 'faculty-science', 'Animal and Environmental Biology'), department('dept-science-biochemistry', 'faculty-science', 'Biochemistry'), department('dept-science-geology', 'faculty-science', 'Geology'), department('dept-science-math', 'faculty-science', 'Mathematics and Statistics'), department('dept-science-microbiology', 'faculty-science', 'Microbiology'), department('dept-science-physics', 'faculty-science', 'Physics'), department('dept-science-plant', 'faculty-science', 'Plant Science and Biotechnology'), department('dept-science-chemistry', 'faculty-science', 'Pure and Industrial Chemistry'),
  // Social Sciences
  department('dept-social-economics', 'faculty-social-sciences', 'Economics'), department('dept-social-geography', 'faculty-social-sciences', 'Geography and Environmental Management'), department('dept-social-political', 'faculty-social-sciences', 'Political and Administrative Studies'), department('dept-social-sociology', 'faculty-social-sciences', 'Sociology'), department('dept-social-public-admin', 'faculty-social-sciences', 'Public Administration'), department('dept-social-community', 'faculty-social-sciences', 'Community Services and Social Work'),
]);

// CGPA+ displays B.Sc. consistently in this student-facing fallback catalogue, as requested.
const bscProgramme = (departmentRow) => programme(`prog-${departmentRow.id.replace(/^dept-/, '')}`, departmentRow.id, `B.Sc. ${departmentRow.name}`);
export const FALLBACK_PROGRAMMES = Object.freeze(FALLBACK_DEPARTMENTS.map(bscProgramme));

export const FALLBACK_SESSIONS = Object.freeze(Array.from({ length: 8 }, (_, index) => { const start = 2019 + index; return { id: `session-${start}-${String(start + 1).slice(-2)}`, name: `${start}/${start + 1}`, status: 'active' }; }).concat([{ id: 'session-2027-28', name: '2027/2028', status: 'active' }]));

export const FALLBACK_LEVELS = Object.freeze([
  { id: 'level-100', name: '100 Level', yearName: 'Year 1', yearNumber: 1, status: 'active' },
  { id: 'level-200', name: '200 Level', yearName: 'Year 2', yearNumber: 2, status: 'active' },
  { id: 'level-300', name: '300 Level', yearName: 'Year 3', yearNumber: 3, status: 'active' },
  { id: 'level-400', name: '400 Level', yearName: 'Year 4', yearNumber: 4, status: 'active' },
  { id: 'level-500', name: '500 Level', yearName: 'Year 5', yearNumber: 5, status: 'active' },
  { id: 'level-600', name: '600 Level', yearName: 'Year 6', yearNumber: 6, status: 'active' },
]);

export const FALLBACK_SEMESTERS = Object.freeze([
  { id: 'semester-first', name: 'First Semester', shortName: 'First Semester', status: 'active' },
  { id: 'semester-second', name: 'Second Semester', shortName: 'Second Semester', status: 'active' },
]);

export const findFallback = (collection, value) => collection.find(row => row.id === value) || null;

export const academicPeriodLabel = (levelId, semesterId) => {
  const level = findFallback(FALLBACK_LEVELS, levelId);
  const semester = findFallback(FALLBACK_SEMESTERS, semesterId);
  return level && semester ? `${level.yearName} — ${semester.name}` : '--';
};