// Verified UniPort fallback catalogue used until the admin academic catalogue is populated in Firestore.
// University and grading details are based on current University of Port Harcourt publications.

export const GRADE_OPTIONS = Object.freeze([
  { grade: 'A', points: 5, score: '70–100' },
  { grade: 'B', points: 4, score: '60–69' },
  { grade: 'C', points: 3, score: '50–59' },
  { grade: 'D', points: 2, score: '45–49' },
  { grade: 'E', points: 1, score: '40–44' },
  { grade: 'F', points: 0, score: '0–39' },
]);

const faculty = (id, name) => ({ id, name, universityId: 'UNIPORT', status: 'active' });
const department = (id, facultyId, name) => ({ id, name, facultyId, status: 'active' });
const programme = (id, departmentId, name) => ({ id, name, departmentId, status: 'active' });

export const FALLBACK_FACULTIES = Object.freeze([
  faculty('faculty-agriculture', 'Faculty of Agriculture'),
  faculty('faculty-allied-health', 'Faculty of Allied Health Sciences'),
  faculty('faculty-basic-medical', 'Faculty of Basic Medical Sciences'),
  faculty('faculty-clinical-sciences', 'Faculty of Clinical Sciences'),
  faculty('faculty-communication', 'Faculty of Communication & Media Studies'),
  faculty('faculty-computing', 'Faculty of Computing'),
  faculty('faculty-dentistry', 'Faculty of Dentistry'),
  faculty('faculty-education', 'Faculty of Education'),
  faculty('faculty-engineering', 'Faculty of Engineering'),
  faculty('faculty-humanities', 'Faculty of Humanities'),
  faculty('faculty-law', 'Faculty of Law'),
  faculty('faculty-management', 'Faculty of Management Sciences'),
  faculty('faculty-pharmaceutical', 'Faculty of Pharmaceutical Sciences'),
  faculty('faculty-sslt', 'School of Science Laboratory Technology'),
  faculty('faculty-science', 'Faculty of Science'),
  faculty('faculty-social-sciences', 'Faculty of Social Sciences'),
]);

export const FALLBACK_DEPARTMENTS = Object.freeze([
  department('dept-computer-science', 'faculty-computing', 'Computer Science'),
  department('dept-information-technology', 'faculty-computing', 'Information Technology'),
  department('dept-cyber-security', 'faculty-computing', 'Cyber Security'),
  department('dept-education-adult', 'faculty-education', 'Adult & Non-Formal Education'),
  department('dept-education-curriculum', 'faculty-education', 'Curriculum Studies and Educational Technology'),
  department('dept-education-early-childhood', 'faculty-education', 'Early Childhood and Primary Education'),
  department('dept-education-foundations', 'faculty-education', 'Educational Foundations'),
  department('dept-education-management', 'faculty-education', 'Educational Management and Planning'),
  department('dept-education-psychology', 'faculty-education', 'Educational Psychology, Guidance and Counselling'),
  department('dept-education-human-kinetics', 'faculty-education', 'Human Kinetics & Health Education'),
  department('dept-education-library', 'faculty-education', 'Library and Information Science'),
  department('dept-education-science', 'faculty-education', 'Science Education'),
  department('dept-engineering-chemical', 'faculty-engineering', 'Chemical Engineering'),
  department('dept-engineering-civil', 'faculty-engineering', 'Civil and Environmental Engineering'),
  department('dept-engineering-electrical', 'faculty-engineering', 'Electrical/Electronics Engineering'),
  department('dept-engineering-mechanical', 'faculty-engineering', 'Mechanical Engineering'),
  department('dept-engineering-mechatronics', 'faculty-engineering', 'Mechatronics Engineering'),
  department('dept-engineering-petroleum', 'faculty-engineering', 'Petroleum and Gas Engineering'),
  department('dept-science-animal', 'faculty-science', 'Animal and Environmental Biology'),
  department('dept-science-biochemistry', 'faculty-science', 'Biochemistry'),
  department('dept-science-geology', 'faculty-science', 'Geology'),
  department('dept-science-math', 'faculty-science', 'Mathematics and Statistics'),
  department('dept-science-microbiology', 'faculty-science', 'Microbiology'),
  department('dept-science-physics', 'faculty-science', 'Physics'),
  department('dept-science-plant', 'faculty-science', 'Plant Science and Biotechnology'),
  department('dept-science-chemistry', 'faculty-science', 'Pure and Industrial Chemistry'),
  department('dept-social-economics', 'faculty-social-sciences', 'Economics'),
  department('dept-social-geography', 'faculty-social-sciences', 'Geography & Environmental Management'),
  department('dept-social-political', 'faculty-social-sciences', 'Political & Administrative Studies'),
  department('dept-social-sociology', 'faculty-social-sciences', 'Sociology'),
  department('dept-humanities-english', 'faculty-humanities', 'English Studies'),
  department('dept-humanities-fine-arts', 'faculty-humanities', 'Fine Arts and Design'),
  department('dept-humanities-foreign-languages', 'faculty-humanities', 'Foreign Languages and Literatures'),
  department('dept-humanities-history', 'faculty-humanities', 'History and Diplomatic Studies'),
  department('dept-humanities-linguistics', 'faculty-humanities', 'Linguistics and Communication Studies'),
  department('dept-humanities-music', 'faculty-humanities', 'Music'),
  department('dept-humanities-philosophy', 'faculty-humanities', 'Philosophy'),
  department('dept-humanities-religious', 'faculty-humanities', 'Religious and Cultural Studies'),
  department('dept-humanities-theatre', 'faculty-humanities', 'Theatre and Film Studies'),
  department('dept-communication-broadcasting', 'faculty-communication', 'Broadcasting'),
  department('dept-communication-film', 'faculty-communication', 'Film and Multimedia Studies'),
  department('dept-communication-journalism', 'faculty-communication', 'Journalism and Media Studies'),
  department('dept-communication-pr', 'faculty-communication', 'Public Relations and Advertising'),
]);

export const FALLBACK_PROGRAMMES = Object.freeze([
  programme('prog-computer-science', 'dept-computer-science', 'B.Sc. Computer Science'),
  programme('prog-information-technology', 'dept-information-technology', 'B.Sc. Information Technology'),
  programme('prog-cyber-security', 'dept-cyber-security', 'B.Sc. Cyber Security'),
  programme('prog-adult-education', 'dept-education-adult', 'B.Ed. Adult & Non-Formal Education'),
  programme('prog-curriculum-education', 'dept-education-curriculum', 'B.Ed. Curriculum Studies and Educational Technology'),
  programme('prog-early-childhood', 'dept-education-early-childhood', 'B.Ed. Early Childhood and Primary Education'),
  programme('prog-education-foundations', 'dept-education-foundations', 'B.Ed. Educational Foundations'),
  programme('prog-education-management', 'dept-education-management', 'B.Ed. Educational Management and Planning'),
  programme('prog-education-psychology', 'dept-education-psychology', 'B.Ed. Educational Psychology, Guidance and Counselling'),
  programme('prog-human-kinetics', 'dept-education-human-kinetics', 'B.Ed. Human Kinetics & Health Education'),
  programme('prog-library-science', 'dept-education-library', 'B.Ed. Library and Information Science'),
  programme('prog-science-education', 'dept-education-science', 'B.Sc. Science Education'),
  programme('prog-chemical-engineering', 'dept-engineering-chemical', 'B.Eng. Chemical Engineering'),
  programme('prog-civil-engineering', 'dept-engineering-civil', 'B.Eng. Civil and Environmental Engineering'),
  programme('prog-electrical-engineering', 'dept-engineering-electrical', 'B.Eng. Electrical/Electronics Engineering'),
  programme('prog-mechanical-engineering', 'dept-engineering-mechanical', 'B.Eng. Mechanical Engineering'),
  programme('prog-mechatronics', 'dept-engineering-mechatronics', 'B.Eng. Mechatronics Engineering'),
  programme('prog-petroleum-engineering', 'dept-engineering-petroleum', 'B.Eng. Petroleum and Gas Engineering'),
  programme('prog-animal-biology', 'dept-science-animal', 'B.Sc. Animal and Environmental Biology'),
  programme('prog-biochemistry', 'dept-science-biochemistry', 'B.Sc. Biochemistry'),
  programme('prog-geology', 'dept-science-geology', 'B.Sc. Geology'),
  programme('prog-mathematics-statistics', 'dept-science-math', 'B.Sc. Mathematics and Statistics'),
  programme('prog-microbiology', 'dept-science-microbiology', 'B.Sc. Microbiology'),
  programme('prog-physics', 'dept-science-physics', 'B.Sc. Physics'),
  programme('prog-plant-science', 'dept-science-plant', 'B.Sc. Plant Science and Biotechnology'),
  programme('prog-pure-chemistry', 'dept-science-chemistry', 'B.Sc. Pure and Industrial Chemistry'),
  programme('prog-economics', 'dept-social-economics', 'B.Sc. Economics'),
  programme('prog-geography', 'dept-social-geography', 'B.Sc. Geography & Environmental Management'),
  programme('prog-political-admin', 'dept-social-political', 'B.Sc. Political & Administrative Studies'),
  programme('prog-sociology', 'dept-social-sociology', 'B.Sc. Sociology'),
]);

export const FALLBACK_SESSIONS = Object.freeze(
  Array.from({ length: 8 }, (_, index) => {
    const start = 2019 + index;
    return { id: `session-${start}-${String(start + 1).slice(-2)}`, name: `${start}/${start + 1}`, status: 'active' };
  }).concat([{ id: 'session-2027-28', name: '2027/2028', status: 'active' }])
);

export const FALLBACK_LEVELS = Object.freeze([
  { id: 'level-100', name: '100 Level', status: 'active' },
  { id: 'level-200', name: '200 Level', status: 'active' },
  { id: 'level-300', name: '300 Level', status: 'active' },
  { id: 'level-400', name: '400 Level', status: 'active' },
  { id: 'level-500', name: '500 Level', status: 'active' },
  { id: 'level-600', name: '600 Level', status: 'active' },
]);

export const FALLBACK_SEMESTERS = Object.freeze([
  { id: 'semester-first', name: 'First Semester', status: 'active' },
  { id: 'semester-second', name: 'Second Semester', status: 'active' },
]);

export const findFallback = (collection, value) => collection.find(row => row.id === value) || null;
