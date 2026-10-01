import { useEffect, useState } from 'react';
import { useSession } from '../state/session';

const STEPS = [
  { n: '01', title: 'Create a semester', text: 'Open Academic record, choose Add semester, then enter the academic session, semester and level. Save it before adding courses.' },
  { n: '02', title: 'Add your courses', text: 'Inside the semester, add each course using its course code, title and credit unit. Use the official details from your result or course registration.' },
  { n: '03', title: 'Enter your grades', text: 'Select the grade you received for each course, review the credit units and save the result. CGPA+ calculates the semester GPA and updates your CGPA.' },
  { n: '04', title: 'Check your progress', text: 'Use Analytics, Target CGPA and Graduation planning to understand your performance and what you need next.' },
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
            <h2 id="academic-guide-title">Add your results with confidence.</h2>
            <p>Whether this is your first semester on CGPA+ or you already have a record, here is the quickest way to keep everything accurate.</p>
          </div>
          <button className="academic-guide__close" onClick={() => setOpen(false)} aria-label="Close guide">×</button>
        </header>

        <div className="academic-guide__tabs" role="tablist" aria-label="Academic guide sections">
          <button className={tab === 'manual' ? 'is-active' : ''} onClick={() => setTab('manual')}>Add manually</button>
          <button className={tab === 'excel' ? 'is-active' : ''} onClick={() => setTab('excel')}>Excel format</button>
          <button className={tab === 'tips' ? 'is-active' : ''} onClick={() => setTab('tips')}>Smart tips</button>
        </div>

        {tab === 'manual' && <div className="academic-guide__body">
          <div className="academic-guide__steps">
            {STEPS.map(step => <article className="academic-guide__step" key={step.n}><span>{step.n}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></article>)}
          </div>
          <div className="academic-guide__actions">
            <a href="#/app/academic" onClick={() => setOpen(false)}>Open Academic record →</a>
            <a href="#/app/import" onClick={() => setOpen(false)}>Import with Excel →</a>
          </div>
        </div>}

        {tab === 'excel' && <div className="academic-guide__body">
          <div className="academic-guide__excel-intro">
            <div><strong>Use one course per row.</strong><p>Keep the first row as the column headings. Do not merge cells or add decorative rows above the headings.</p></div>
            <button onClick={downloadTemplate}>Download template</button>
          </div>
          <div className="academic-guide__table-wrap">
            <table><thead><tr>{EXCEL_ROWS[0].map(cell => <th key={cell}>{cell}</th>)}</tr></thead><tbody>{EXCEL_ROWS.slice(1).map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table>
          </div>
          <ul className="academic-guide__rules">
            <li><b>Semester:</b> use a clear value such as 1st Semester or 2nd Semester.</li>
            <li><b>Course Code:</b> enter the official code, e.g. CSC301.</li>
            <li><b>Course Title:</b> enter the course name.</li>
            <li><b>Credit Unit:</b> use the actual credit unit as a number.</li>
            <li><b>Grade:</b> use the grade you received, such as A, B, C, D, E or F.</li>
          </ul>
          <a className="academic-guide__primary-link" href="#/app/import" onClick={() => setOpen(false)}>Go to Excel import →</a>
        </div>}

        {tab === 'tips' && <div className="academic-guide__body">
          <div className="academic-guide__tip-grid">
            <article><span>01</span><h3>Keep your record complete</h3><p>Add every course from a semester. Missing courses can make your GPA and CGPA summary inaccurate.</p></article>
            <article><span>02</span><h3>Check before saving</h3><p>Confirm course code, credit unit and grade against your official result before you save.</p></article>
            <article><span>03</span><h3>Use the planning tools</h3><p>Target CGPA, Projection, Analytics and Graduation planning can help you understand your academic progress.</p></article>
            <article><span>04</span><h3>Import carefully</h3><p>For Excel, fix validation errors before confirming the import. A clean spreadsheet makes bulk entry much easier.</p></article>
          </div>
          <div className="academic-guide__note"><strong>Premium workflow</strong><span>Enter once, then use Analytics, reports and planning tools to turn your academic record into a clear progress dashboard.</span></div>
        </div>}
      </section>
    </div>}
  </>;
}
