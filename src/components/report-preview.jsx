import { number, date } from '../utils/formatting';
import { Icon } from './Icon';
import { FALLBACK_LEVELS, FALLBACK_SEMESTERS } from '../data/uniport-catalogue';

const levelInfo = id => {
  const match = String(id || '').match(/(?:level-)?(100|200|300|400|500|600)/i);
  if (match) {
    const yearNumber = Number(match[1]) / 100;
    return { number: yearNumber, label: `Year ${yearNumber}` };
  }
  const level = FALLBACK_LEVELS.find(item => item.id === id || item.name === id || item.yearName === id);
  return level ? { number: Number(level.yearNumber) || 99, label: level.yearName || level.name } : { number: 99, label: id || 'Year not specified' };
};

const semesterInfo = id => {
  const value = String(id || '').toLowerCase();
  if (value.includes('first') || value.endsWith('-1')) return { order: 1, label: 'First Semester' };
  if (value.includes('second') || value.endsWith('-2')) return { order: 2, label: 'Second Semester' };
  const semester = FALLBACK_SEMESTERS.find(item => item.id === id || item.name === id || item.shortName === id);
  return semester ? { order: semester.id === 'semester-first' ? 1 : 2, label: semester.name } : { order: 9, label: id || 'Semester not specified' };
};

const groupCourses = courses => {
  const years = new Map();
  (courses || []).forEach(course => {
    const year = levelInfo(course.levelId);
    const semester = semesterInfo(course.semesterId);
    const yearKey = `${year.number}|${year.label}`;
    if (!years.has(yearKey)) years.set(yearKey, { ...year, semesters: new Map() });
    const yearGroup = years.get(yearKey);
    const semesterKey = `${semester.order}|${semester.label}`;
    if (!yearGroup.semesters.has(semesterKey)) yearGroup.semesters.set(semesterKey, { ...semester, courses: [] });
    yearGroup.semesters.get(semesterKey).courses.push(course);
  });

  return [...years.values()]
    .sort((a, b) => a.number - b.number)
    .map(year => ({
      ...year,
      semesters: [...year.semesters.values()]
        .sort((a, b) => a.order - b.order)
        .map(semester => ({
          ...semester,
          courses: semester.courses.sort((a, b) => String(a.code || '').localeCompare(String(b.code || '')))
        }))
    }));
};

const semesterSummary = courses => {
  const credits = courses.reduce((sum, row) => sum + Number(row.credits || 0), 0);
  const qualityPoints = courses.reduce((sum, row) => sum + Number(row.qualityPoints ?? Number(row.credits || 0) * Number(row.points || 0)), 0);
  return { credits, qualityPoints, gpa: credits ? qualityPoints / credits : 0 };
};

export function ReportPreview({ preview, type = 'Academic summary' }) {
  const sections = groupCourses(preview?.courses || []);
  return <article className="report-paper">
    <div className="report-letterhead"><strong>CGPA<span>+</span></strong><div><span>UniPort</span><small>INDEPENDENT ACADEMIC PLANNING</small></div></div>
    <div className="report-heading"><span>FOR PERSONAL REFERENCE</span><h2>CGPA+ Academic Report</h2><p>{type}</p></div>
    <div className="report-meta">
      <div><span>Student</span><strong>{preview?.studentName || 'Not loaded'}</strong></div>
      <div><span>University</span><strong>University of Port Harcourt</strong></div>
      <div><span>Academic session</span><strong>{preview?.sessionName || '--'}</strong></div>
      <div><span>Generated</span><strong>{date(preview?.createdAt)}</strong></div>
    </div>
    <div className="report-summary">
      <div><span>CGPA</span><strong>{number(preview?.summary?.cgpa)}</strong></div>
      <div><span>Credit units</span><strong>{number(preview?.summary?.totalCredits, 0)}</strong></div>
      <div><span>Quality points</span><strong>{number(preview?.summary?.qualityPoints)}</strong></div>
    </div>

    <div className="report-academic-sections">
      {sections.length ? sections.map(year => <section className="report-year" key={`${year.number}-${year.label}`}>
        <div className="report-year-heading"><h3>{year.label}</h3></div>
        {year.semesters.map(semester => {
          const totals = semesterSummary(semester.courses);
          return <div className="report-semester" key={`${year.label}-${semester.label}`}>
            <div className="report-semester-heading"><h4>{semester.label}</h4><span>GPA: {number(totals.gpa)} · CU: {number(totals.credits, 0)}</span></div>
            <div className="table-scroll"><table><thead><tr><th>Course Code</th><th>Course Title</th><th>Credit Units</th><th>Grade</th><th>Grade Points</th><th>Quality Points</th></tr></thead><tbody>{semester.courses.map(c => <tr key={c.id || c.code}><td>{c.code || '--'}</td><td>{c.title || c.courseTitle || c.courseName || '--'}</td><td>{c.credits ?? '--'}</td><td>{c.grade || '--'}</td><td>{c.points ?? '--'}</td><td>{c.qualityPoints ?? Number(c.credits || 0) * Number(c.points || 0)}</td></tr>)}</tbody></table></div>
          </div>;
        })}
      </section>) : <div className="table-scroll"><table><thead><tr><th>Course Code</th><th>Course Title</th><th>Credit Units</th><th>Grade</th><th>Grade Points</th><th>Quality Points</th></tr></thead><tbody><tr><td colSpan={6}>Academic report data has not been loaded.</td></tr></tbody></table></div>}
    </div>

    <div className="report-disclaimer"><Icon name="shield" size={16} /><p>This is a CGPA+ Academic Report, not an official University of Port Harcourt transcript. It does not certify results, clearance or graduation eligibility.</p></div>
    <footer>{preview?.id ? `Report reference: ${preview.id}` : 'LAYOUT PREVIEW ONLY. NO VERIFIED REPORT HAS BEEN GENERATED.'}</footer>
  </article>;
}
