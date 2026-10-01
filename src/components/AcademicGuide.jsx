import { useEffect, useState } from 'react';
import { useSession } from '../state/session';

const STEPS = [
  { n: '01', title: '1. Create the semester', text: 'Go to Academic record → Add semester. Choose the academic session (for example, 2025/2026), semester (1st or 2nd) and your level (for example, 300 Level). Save it.' },
  { n: '02', title: '2. Add each course', text: 'Inside that semester, add every course you registered. Enter the course code (CSC301), course title, and credit unit (for example, 3 units). Use your official school records.' },
  { n: '03', title: '3. Enter your grades', text: 'Select the grade you actually received (A, B, C, D, E or F), check the credit unit, then save. CGPA+ uses the grade and units to calculate your GPA and CGPA.' },
  { n: '04', title: '4. Review your progress', text: 'After saving, check your GPA, CGPA and academic progress. Target CGPA, Analytics and Graduation planning help you understand where you stand.' },
];

const EXCEL_ROWS = [
  ['Semester', 'Course Code', 'Course Title', 'Credit Unit', 'Grade'],
  ['1st Semester', 'CSC301', 'Data Structures', '3', 'A'],
  ['1st Semester', 'CSC305', 'Operating Systems', '3', 'B'],
  ['1st Semester', 'MTH301', 'Mathematics III', '3', 'C'],
  ['2nd Semester', 'CSC302', 'Database Systems', '3', 'A'],
];

function downloadTemplate() {
  const csv = EXCEL_ROWS.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'CGPA-Plus-results-template.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function AcademicGuide() {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('manual');

  useEffect(() => {
    if (!user?.id) return;
    const key = `cgpa-plus-guide-seen-${user.id}`;
    if (!localStorage.getItem(key)) {
      const timer = window.setTimeout(() => {
        setOpen(true);
        localStorage.setItem(key, '1');
      }, 1200);
      return () => window.clearTimeout(timer);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = event => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!user?.id) return null;

  return <>
    <button className="academic-guide-trigger" onClick={() => setOpen(true)} aria-label="Open CGPA+ academic guide">
      <span className="academic-guide-trigger__icon">?</span>
      <span className="academic-guide-trigger__text">How it works</span>
    </button>

    {open && <div className="academic-guide-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="academic-guide" role="dialog" aria-modal="true" aria-labelledby="academic-guide-title">
        <header className="academic-guide__header">
          <div>
            <span className="eyebrow">CGPA+ ACADEMIC GUIDE</span>
            <h2 id="academic-guide-title">Your first results? Start here.</h2>
            <p>New to CGPA+ or adding another semester? Follow these simple steps. You can enter results one by one or import many courses from a spreadsheet.</p>
          </div>
          <button className="academic-guide__close" onClick={() => setOpen(false)} aria-label="Close guide">×</button>
        </header>

        <div className="academic-guide__tabs" role="tablist" aria-label="Academic guide sections">
          <button type="button" aria-selected={tab === 'manual'} className={tab === 'manual' ? 'is-active' : ''} onClick={() => setTab('manual')}>Manual entry</button>
          <button type="button" aria-selected={tab === 'excel'} className={tab === 'excel' ? 'is-active' : ''} onClick={() => setTab('excel')}>Excel / CSV</button>
          <button type="button" aria-selected={tab === 'tips'} className={tab === 'tips' ? 'is-active' : ''} onClick={() => setTab('tips')}>Important tips</button>
        </div>

        {tab === 'manual' && <div className="academic-guide__body">
          <div className="academic-guide__steps">
            {STEPS.map(step => <article className="academic-guide__step" key={step.n}><span>{step.n}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></article>)}
          </div>
          <div className="academic-guide__actions">
            <a href="#/app/academic" onClick={() => setOpen(false)}>Start adding results →</a>
            <a href="#/app/import" onClick={() => setOpen(false)}>Import a spreadsheet →</a>
          </div>
        </div>}

        {tab === 'excel' && <div className="academic-guide__body">
          <div className="academic-guide__excel-intro">
            <div><strong>Put one course on each row.</strong><p>Your first row must contain the headings below. Do not merge cells, leave blank rows in the middle, or put a title above the headings.</p></div>
            <button onClick={downloadTemplate}>Download template</button>
          </div>
          <div className="academic-guide__table-wrap">
            <table><thead><tr>{EXCEL_ROWS[0].map(cell => <th key={cell}>{cell}</th>)}</tr></thead><tbody>{EXCEL_ROWS.slice(1).map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table>
          </div>
          <ul className="academic-guide__rules">
            <li><b>Semester:</b> use 1st Semester or 2nd Semester.</li>
            <li><b>Course Code:</b> use the official code, e.g. CSC301.</li>
            <li><b>Course Title:</b> use the name shown on your school record.</li>
            <li><b>Credit Unit:</b> enter the number, e.g. 1, 2, 3 or 4.</li>
            <li><b>Grade:</b> enter the grade you received: A, B, C, D, E or F.</li>
          </ul>
          <a className="academic-guide__primary-link" href="#/app/import" onClick={() => setOpen(false)}>Open Excel import →</a>
        </div>}

        {tab === 'tips' && <div className="academic-guide__body">
          <div className="academic-guide__tip-grid">
            <article><span>01</span><h3>Don't leave courses out</h3><p>Add every course that belongs to that semester. Leaving out a course can make your academic summary different from your official result.</p></article>
            <article><span>02</span><h3>Match your official result</h3><p>Before saving, compare the course code, credit unit and grade with your result sheet or school record.</p></article>
            <article><span>03</span><h3>Use your progress tools</h3><p>After your results are saved, use Analytics, Target CGPA, Projection and Graduation planning to understand your progress.</p></article>
            <article><span>04</span><h3>Fix spreadsheet errors first</h3><p>If the importer reports an error, correct that row in your spreadsheet and upload it again before confirming.</p></article>
          </div>
          <div className="academic-guide__note"><strong>A simple workflow</strong><span>Add or import your results → review them → check your GPA/CGPA → use the planning tools when you need them.</span></div>
        </div>}
      </section>
    </div>}
  </>;
}
