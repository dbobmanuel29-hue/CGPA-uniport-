import { useEffect, useState } from 'react';
import { PageHeader, Button, Panel, Field, Input, Select, AsyncSelect, Notice, Badge, Stat } from '../../components/ui';
import { Modal, ConfirmModal, ActionError, useAction, ConnectionState } from '../../components/feedback';
import { DataTable, SearchBox } from '../../components/table';
import { useResource } from '../../hooks/useResource';
import { academicService } from '../../services/academic-service';
import { authService } from '../../services/auth-service';
import { number, titleCase } from '../../utils/formatting';
import { GRADE_OPTIONS, FALLBACK_LEVELS, FALLBACK_SEMESTERS, FALLBACK_SESSIONS } from '../../data/uniport-catalogue';

const blank = { code: '', title: '', credits: '', grade: '', points: '', sessionId: '', semesterId: '', levelId: '' };
const blankCourse = { code: '', title: '', credits: '', sessionId: '', semesterId: '', levelId: '' };

async function loadOrFallback(loader, fallback) {
  try {
    const rows = await loader();
    return Array.isArray(rows) && rows.length ? rows : fallback;
  } catch {
    return fallback;
  }
}

const labelFor = (rows, id) => rows.find(row => row.id === id)?.name || id || '--';

export const resultColumns = [
  { key: 'sessionName', label: 'Session' }, { key: 'semesterName', label: 'Semester' }, { key: 'levelName', label: 'Level' },
  { key: 'code', label: 'Course code', render: v => <strong>{v}</strong> }, { key: 'title', label: 'Course title' },
  { key: 'credits', label: 'Credit units' }, { key: 'grade', label: 'Grade', render: v => <Badge>{v || '--'}</Badge> },
  { key: 'points', label: 'Grade points' }, { key: 'qualityPoints', label: 'Quality points' },
  { key: 'status', label: 'Status', render: v => <Badge tone={v === 'failed' ? 'danger' : v === 'passed' ? 'success' : 'neutral'}>{titleCase(v) || 'Recorded'}</Badge> },
];

export function ResultEditor({ open, onClose, record, onSaved, initialCourse }) {
  const [form, setForm] = useState(blank);
  const action = useAction();

  useEffect(() => {
    if (!open) return;
    let active = true;
    action.clear();
    (async () => {
      let defaults = {};
      try {
        const profile = await academicService.getProfile();
        defaults = { sessionId: profile?.currentSessionId || '', semesterId: profile?.currentSemesterId || '', levelId: profile?.currentLevelId || '' };
      } catch {}
      if (!active) return;
      setForm(record
        ? Object.fromEntries(Object.keys(blank).map(key => [key, record[key] ?? blank[key]]))
        : { ...blank, ...defaults, ...(initialCourse || {}), sessionId: initialCourse?.sessionId || defaults.sessionId || FALLBACK_SESSIONS.find(x => x.name === '2026/2027')?.id || FALLBACK_SESSIONS[FALLBACK_SESSIONS.length - 1].id, semesterId: initialCourse?.semesterId || defaults.semesterId || FALLBACK_SEMESTERS[0].id, levelId: initialCourse?.levelId || defaults.levelId || 'level-300' });
    })();
    return () => { active = false; };
  }, [open, record, initialCourse]);

  const change = key => e => setForm(prev => ({ ...prev, [key]: e.target.value }));
  const gradeChange = e => {
    const grade = e.target.value;
    const option = GRADE_OPTIONS.find(item => item.grade === grade);
    setForm(prev => ({ ...prev, grade, points: option ? option.points : '' }));
  };
  const contextualized = form.sessionId && form.semesterId && form.levelId;
  const sessionLoader = () => loadOrFallback(() => academicService.getAcademicSessions(), FALLBACK_SESSIONS);
  const semesterLoader = () => loadOrFallback(() => academicService.getSemesters(), FALLBACK_SEMESTERS);
  const levelLoader = () => loadOrFallback(() => academicService.getLevels(), FALLBACK_LEVELS);

  return <Modal open={open} onClose={onClose} title={record ? 'Edit academic result' : 'Add an academic result'} description="Enter a course for a specific level, academic session and semester. CGPA+ keeps every semester separately and calculates your overall CGPA from all saved results." wide>
    <form className="form-stack" onSubmit={e => {
      e.preventDefault();
      if (!contextualized || !form.grade) return;
      const payload = { ...form, code: form.code.trim().toUpperCase(), credits: Number(form.credits), points: Number(form.points) };
      action.run(() => record ? academicService.updateResult(record.id, payload) : academicService.saveResult(payload), () => { onSaved?.(); onClose(); }, record ? 'Your result was updated.' : 'Your result was saved.');
    }}>
      <div className="form-grid">
        <Field label="Course code"><Input value={form.code} onChange={change('code')} placeholder="e.g. CSC 301" required maxLength={30} /></Field>
        <Field label="Course title"><Input value={form.title} onChange={change('title')} placeholder="Full course title" required maxLength={180} /></Field>
        <Field label="Credit units" hint="Use the credit unit shown for the course (for example, 3)."><Input value={form.credits} onChange={change('credits')} type="number" required min="1" step="1" inputMode="numeric" /></Field>
        <Field label="Grade" hint="Choose the letter grade on your result. CGPA+ will fill the grade point for you."><Select value={form.grade} onChange={gradeChange} required><option value="">Select your grade</option>{GRADE_OPTIONS.map(item => <option key={item.grade} value={item.grade}>{item.grade} — {item.score}</option>)}</Select></Field>
        <Field label="Grade point" hint="Grade point means the number assigned to your letter grade: A=5, B=4, C=3, D=2, E=1, F=0."><Input value={form.points} readOnly tabIndex={-1} placeholder="Selected automatically" /></Field>
        <AsyncSelect label="Academic session" loader={sessionLoader} value={form.sessionId} onChange={change('sessionId')} />
        <AsyncSelect label="Semester" loader={semesterLoader} value={form.semesterId} onChange={change('semesterId')} />
        <AsyncSelect label="Level" loader={levelLoader} value={form.levelId} onChange={change('levelId')} />
      </div>
      <Notice>Quality points = Credit Units × Grade Point. For example, a 3-unit course with a B (4 points) gives 12 quality points.</Notice>
      <ActionError error={action.error} />
      <div className="modal-actions"><Button variant="outline" type="button" onClick={onClose}>Cancel</Button><Button type="submit" busy={action.busy} disabled={!contextualized || !form.grade || !form.credits} icon="check">{record ? 'Save changes' : 'Save result'}</Button></div>
    </form>
  </Modal>;
}

function CoursePlanner({ onChanged, onAddResult }) {
  const [courses, setCourses] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankCourse);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    try {
      const preferences = await authService.getPreferences();
      setCourses(Array.isArray(preferences.plannedCourses) ? preferences.plannedCourses : []);
    } catch (e) { setError(e?.message || 'Unable to load your course list.'); }
  }
  useEffect(() => { load(); }, []);
  const change = key => e => setForm(prev => ({ ...prev, [key]: e.target.value }));
  function start(course = null) {
    setEditing(course);
    setForm(course ? { ...blankCourse, ...course } : { ...blankCourse });
    setError('');
    setOpen(true);
  }
  async function save(e) {
    e.preventDefault();
    if (!form.code.trim() || !form.title.trim() || !form.credits || !form.sessionId || !form.semesterId || !form.levelId) return;
    setBusy(true); setError('');
    try {
      const normalized = { ...form, code: form.code.trim().toUpperCase(), credits: Number(form.credits) };
      const next = editing ? courses.map(c => c.id === editing.id ? { ...c, ...normalized } : c) : [...courses, { ...normalized, id: crypto.randomUUID() }];
      await authService.updatePreferences({ plannedCourses: next });
      setCourses(next); setOpen(false); onChanged?.(next); setForm({ ...blankCourse });
    } catch (e) { setError(e?.message || 'Unable to save this course.'); }
    finally { setBusy(false); }
  }
  async function remove(id) {
    setBusy(true); setError('');
    try { const next = courses.filter(c => c.id !== id); await authService.updatePreferences({ plannedCourses: next }); setCourses(next); onChanged?.(next); }
    catch (e) { setError(e?.message || 'Unable to remove this course.'); }
    finally { setBusy(false); }
  }

  const groups = new Map();
  courses.forEach(course => {
    const key = `${course.sessionId || ''}::${course.semesterId || ''}::${course.levelId || ''}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(course);
  });

  return <Panel title="My course planner" description="Keep courses organized by level, academic session and semester. When a grade is released, use Add result on that course so it becomes part of your CGPA calculation." action={<Button icon="plus" onClick={() => start()}>Add course</Button>}>
    {error ? <p className="field-error" role="alert">{error}</p> : null}
    {courses.length ? <div className="semester-course-groups">{[...groups.entries()].map(([key, group]) => {
      const sample = group[0];
      return <div className="semester-course-group" key={key}>
        <div className="semester-course-heading">
          <div><strong>{labelFor(FALLBACK_LEVELS, sample.levelId)} · {labelFor(FALLBACK_SESSIONS, sample.sessionId)}</strong><span>{labelFor(FALLBACK_SEMESTERS, sample.semesterId)}</span></div>
          <Button variant="outline" onClick={() => start({ sessionId: sample.sessionId, semesterId: sample.semesterId, levelId: sample.levelId })}>Add course</Button>
        </div>
        <div className="table-scroll"><table><thead><tr><th>Course</th><th>Title</th><th>Credits</th><th>Actions</th></tr></thead><tbody>{group.map(course => <tr key={course.id}><td><strong>{course.code}</strong></td><td>{course.title}</td><td>{course.credits}</td><td><button type="button" className="text-button" onClick={() => onAddResult?.(course)}>Add result</button>{' '}<button type="button" className="text-button" onClick={() => start(course)}>Edit</button>{' '}<button type="button" className="text-button" onClick={() => remove(course.id)} disabled={busy}>Remove</button></td></tr>)}</tbody></table></div>
      </div>;
    })}</div> : <div><Notice>No courses added yet. Add courses for each level, session and semester. You can have separate course lists for 100 Level First Semester, 100 Level Second Semester, 200 Level First Semester, 200 Level Second Semester, and so on.</Notice><Button variant="outline" onClick={() => start()}>Add my first course</Button></div>}
    <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit course' : 'Add semester course'} description="Choose exactly where this course belongs. You can add another course to any semester later."><form className="form-stack" onSubmit={save}><div className="form-grid"><Field label="Course code"><Input value={form.code} onChange={change('code')} placeholder="e.g. CSC 301" required /></Field><Field label="Course title"><Input value={form.title} onChange={change('title')} placeholder="e.g. Artificial Intelligence" required /></Field><Field label="Credit units"><Input value={form.credits} onChange={change('credits')} type="number" min="1" step="1" required /></Field><AsyncSelect label="Academic session" loader={() => loadOrFallback(() => academicService.getAcademicSessions(), FALLBACK_SESSIONS)} value={form.sessionId} onChange={change('sessionId')} /><AsyncSelect label="Semester" loader={() => loadOrFallback(() => academicService.getSemesters(), FALLBACK_SEMESTERS)} value={form.semesterId} onChange={change('semesterId')} /><AsyncSelect label="Level" loader={() => loadOrFallback(() => academicService.getLevels(), FALLBACK_LEVELS)} value={form.levelId} onChange={change('levelId')} /></div><Notice>This planner entry does not affect your CGPA until you add the actual result and grade.</Notice><div className="modal-actions"><Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" busy={busy} disabled={!form.sessionId || !form.semesterId || !form.levelId}>{editing ? 'Save course' : 'Add course'}</Button></div></form></Modal>
  </Panel>;
}

export function ResultDetails({ record, onClose }) { return <Modal open={!!record} onClose={onClose} title={record?.code || 'Result details'} description={record?.title} wide><dl className="detail-grid">{resultColumns.filter(c => c.key !== 'title').map(c => <div key={c.key}><dt>{c.label}</dt><dd>{String(record?.[c.key] ?? '--')}</dd></div>)}</dl></Modal>; }

export default function Academic() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ sessionId: '', semesterId: '', levelId: '' });
  const resource = useResource(() => academicService.getResults(filters), [filters.sessionId, filters.semesterId, filters.levelId]);
  const summary = useResource(() => academicService.getSummary(filters), [filters.sessionId, filters.semesterId, filters.levelId]);
  const [editor, setEditor] = useState(new URLSearchParams(window.location.hash.split('?')[1]).get('add') === '1');
  const [editing, setEditing] = useState(null);
  const [resultCourse, setResultCourse] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [semester, setSemester] = useState(false);
  const change = key => e => setFilters({ ...filters, [key]: e.target.value });
  function refresh() { resource.refresh(); summary.refresh(); }
  const sessionLoader = () => loadOrFallback(() => academicService.getAcademicSessions(), FALLBACK_SESSIONS);
  const semesterLoader = () => loadOrFallback(() => academicService.getSemesters(), FALLBACK_SEMESTERS);
  const levelLoader = () => loadOrFallback(() => academicService.getLevels(), FALLBACK_LEVELS);
  return <><PageHeader eyebrow="A HOME FOR EVERY RESULT" title="Your academic record." description="Add courses to individual semesters, record each released result, and let CGPA+ calculate your GPA and CGPA across your complete academic journey." actions={<Button icon="plus" onClick={() => { setEditing(null); setResultCourse(null); setEditor(true); }}>Add result</Button>} />
    <div className="record-summary"><div><span>Current CGPA</span><strong>{number(summary.data?.cgpa)}</strong></div><div><span>Semester GPA</span><strong>{number(summary.data?.gpa)}</strong></div><div><span>Total credits</span><strong>{number(summary.data?.totalCredits, 0)}</strong></div><div className="record-summary-links"><a href="#/app/calculator">Calculate GPA</a><a href="#/app/cgpa">Calculate CGPA</a></div></div>
    <CoursePlanner onAddResult={course => { setEditing(null); setResultCourse(course); setEditor(true); }} />
    <div className="table-toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Search course code or title..." /><Button variant="outline" icon="eye" onClick={() => setSemester(true)}>View semester</Button></div>
    <div className="table-filters"><AsyncSelect label="Academic session" loader={sessionLoader} value={filters.sessionId} onChange={change('sessionId')} required={false} placeholder="All sessions" /><AsyncSelect label="Semester" loader={semesterLoader} value={filters.semesterId} onChange={change('semesterId')} required={false} placeholder="All semesters" /><AsyncSelect label="Level" loader={levelLoader} value={filters.levelId} onChange={change('levelId')} required={false} placeholder="All levels" /><button type="button" className="text-button" onClick={() => { setFilters({ sessionId: '', semesterId: '', levelId: '' }); setSearch(''); }}>Reset filters</button></div>
    <DataTable columns={resultColumns} resource={resource} search={search} emptyTitle="No results for this selection." emptyDescription="Add a result and choose its exact academic session, semester and level. Use All sessions, All semesters and All levels to see your complete record." onView={setViewing} onEdit={record => { setEditing(record); setResultCourse(null); setEditor(true); }} onDelete={setDeleting} />
    <p className="table-help">Each saved result belongs to one exact semester. Example: 100 Level First Semester → add its courses/results; 100 Level Second Semester → add its courses/results; then continue with 200 Level First Semester, 200 Level Second Semester, and so on. CGPA+ uses every saved result when calculating overall CGPA.</p>
    <ResultEditor open={editor} onClose={() => { setEditor(false); setResultCourse(null); }} record={editing} initialCourse={resultCourse} onSaved={refresh} />
    <ResultDetails record={viewing} onClose={() => setViewing(null)} />
    <ConfirmModal open={!!deleting} title="Delete this result?" description={`Delete ${deleting?.code || 'this course'} from your academic record? Nothing is removed until the backend confirms the request.`} actionLabel="Delete result" dangerous onClose={() => setDeleting(null)} onConfirm={async () => { await academicService.deleteResult(deleting.id); refresh(); }} />
    <Modal open={semester} onClose={() => setSemester(false)} title="Semester overview" description="Choose a session, semester and level above to see the matching summary." wide><ConnectionState resource={summary} title="semester summary" emptyTitle="No results for this selection." emptyDescription="Choose a session and semester with recorded results.">{data => <div className="stats-grid stats-three"><Stat label="Semester GPA" value={number(data.gpa)} /><Stat label="Total credit units" value={number(data.totalCredits, 0)} /><Stat label="Current CGPA" value={number(data.cgpa)} accent /></div>}</ConnectionState></Modal>
  </>;
}
