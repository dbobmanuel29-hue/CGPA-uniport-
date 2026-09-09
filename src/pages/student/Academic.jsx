import { useEffect, useState } from 'react';
import { PageHeader, Button, Panel, Field, Input, AsyncSelect, Notice, Badge, Stat } from '../../components/ui';
import { Modal, ConfirmModal, ActionError, useAction, ConnectionState } from '../../components/feedback';
import { DataTable, SearchBox } from '../../components/table';
import { useResource } from '../../hooks/useResource';
import { academicService } from '../../services/academic-service';
import { authService } from '../../services/auth-service';
import { number, titleCase } from '../../utils/formatting';

const blank = { code: '', title: '', credits: '', grade: '', points: '', sessionId: '', semesterId: '', levelId: '' };
const blankCourse = { code: '', title: '', credits: '', sessionId: '', semesterId: '', levelId: '' };
export const resultColumns = [
  { key: 'sessionName', label: 'Session' }, { key: 'semesterName', label: 'Semester' }, { key: 'levelName', label: 'Level' },
  { key: 'code', label: 'Course code', render: v => <strong>{v}</strong> }, { key: 'title', label: 'Course title' },
  { key: 'credits', label: 'Credit units' }, { key: 'grade', label: 'Grade', render: v => <Badge>{v || '--'}</Badge> },
  { key: 'points', label: 'Grade points' }, { key: 'qualityPoints', label: 'Quality points' },
  { key: 'status', label: 'Status', render: v => <Badge tone={v === 'failed' ? 'danger' : v === 'passed' ? 'success' : 'neutral'}>{titleCase(v) || 'Pending'}</Badge> },
];

export function ResultEditor({ open, onClose, record, onSaved }) {
  const [form, setForm] = useState(blank);
  const action = useAction();
  useEffect(() => {
    if (open) {
      setForm(record ? Object.fromEntries(Object.keys(blank).map(key => [key, record[key] ?? blank[key]])) : { ...blank });
      action.clear();
    }
  }, [open, record]);
  const change = k => e => setForm({ ...form, [k]: e.target.value });
  const contextualized = form.sessionId && form.semesterId && form.levelId;
  return <Modal open={open} onClose={onClose} title={record ? 'Edit academic result' : 'Add an academic result'} description="Save a course result in the right academic context." wide><form className="form-stack" onSubmit={e => { e.preventDefault(); if (!contextualized) return; const payload = { ...form, code: form.code.trim().toUpperCase(), credits: Number(form.credits), points: Number(form.points) }; action.run(() => record ? academicService.updateResult(record.id, payload) : academicService.saveResult(payload), () => { onSaved?.(); onClose(); }, record ? 'Your result was updated.' : 'Your result was saved.'); }}><div className="form-grid"><Field label="Course code"><Input value={form.code} onChange={change('code')} placeholder="e.g. CSC 301" required maxLength={30} /></Field><Field label="Course title"><Input value={form.title} onChange={change('title')} placeholder="Full course title" required maxLength={180} /></Field><Field label="Credit units"><Input value={form.credits} onChange={change('credits')} type="number" required min="1" step="1" inputMode="numeric" /></Field><Field label="Grade"><Input value={form.grade} onChange={change('grade')} placeholder="e.g. A, B, C" required maxLength={20} /></Field><Field label="Grade points" hint="Use the grade point that matches your programme's grading policy."><Input value={form.points} onChange={change('points')} type="number" required min="0" step=".01" inputMode="decimal" /></Field><AsyncSelect label="Academic session" loader={() => academicService.getAcademicSessions()} value={form.sessionId} onChange={change('sessionId')} /><AsyncSelect label="Semester" loader={() => academicService.getSemesters()} value={form.semesterId} onChange={change('semesterId')} /><AsyncSelect label="Level" loader={() => academicService.getLevels()} value={form.levelId} onChange={change('levelId')} /></div><Notice>Results are private to your account. CGPA+ validates the credit units and quality points before saving.</Notice><ActionError error={action.error} /><div className="modal-actions"><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" busy={action.busy} disabled={!contextualized} icon="check">{record ? 'Save changes' : 'Save result'}</Button></div></form></Modal>;
}

function CoursePlanner({ onChanged }) {
  const [courses, setCourses] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankCourse);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    try { const preferences = await authService.getPreferences(); setCourses(Array.isArray(preferences.plannedCourses) ? preferences.plannedCourses : []); } catch (e) { setError(e?.message || 'Unable to load your course list.'); }
  }
  useEffect(() => { load(); }, []);
  const change = key => e => setForm({ ...form, [key]: e.target.value });
  function start(course = null) { setEditing(course); setForm(course ? { ...blankCourse, ...course } : { ...blankCourse }); setError(''); setOpen(true); }
  async function save(e) {
    e.preventDefault();
    if (!form.code.trim() || !form.title.trim() || !form.credits) return;
    setBusy(true); setError('');
    try {
      const next = editing ? courses.map(c => c.id === editing.id ? { ...c, ...form, code: form.code.trim().toUpperCase(), credits: Number(form.credits) } : c) : [...courses, { ...form, id: crypto.randomUUID(), code: form.code.trim().toUpperCase(), credits: Number(form.credits) }];
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
  return <Panel title="My semester courses" description="Keep a simple list of the courses you are taking. Add your result later when the grade is released." action={<Button icon="plus" onClick={() => start()}>Add course</Button>}>
    {error ? <p className="field-error" role="alert">{error}</p> : null}
    {courses.length ? <div className="table-scroll"><table><thead><tr><th>Course</th><th>Title</th><th>Credits</th><th>Actions</th></tr></thead><tbody>{courses.map(course => <tr key={course.id}><td><strong>{course.code}</strong></td><td>{course.title}</td><td>{course.credits}</td><td><button className="text-button" onClick={() => start(course)}>Edit</button>{' '}<button className="text-button" onClick={() => remove(course.id)} disabled={busy}>Remove</button></td></tr>)}</tbody></table></div> : <div><Notice>No courses added yet. Add the courses you registered for this semester so your workspace is organized before results arrive.</Notice><Button variant="outline" onClick={() => start()}>Add my first course</Button></div>}
    <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit course' : 'Add semester course'} description="Add a course to your personal semester list."><form className="form-stack" onSubmit={save}><div className="form-grid"><Field label="Course code"><Input value={form.code} onChange={change('code')} placeholder="e.g. CSC 301" required /></Field><Field label="Course title"><Input value={form.title} onChange={change('title')} placeholder="e.g. Artificial Intelligence" required /></Field><Field label="Credit units"><Input value={form.credits} onChange={change('credits')} type="number" min="1" step="1" required /></Field></div><Notice>You can add the grade/result later. This list is private to your account.</Notice><div className="modal-actions"><Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" busy={busy}>{editing ? 'Save course' : 'Add course'}</Button></div></form></Modal>
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
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [semester, setSemester] = useState(false);
  const change = key => e => setFilters({ ...filters, [key]: e.target.value });
  function refresh() { resource.refresh(); summary.refresh(); }
  return <><PageHeader eyebrow="A HOME FOR EVERY RESULT" title="Your academic record." description="Add the courses you are taking, record your results when they are released, and let CGPA+ keep your GPA and CGPA organized." actions={<Button icon="plus" onClick={() => { setEditing(null); setEditor(true); }}>Add result</Button>} /><div className="record-summary"><div><span>Current CGPA</span><strong>{number(summary.data?.cgpa)}</strong></div><div><span>Semester GPA</span><strong>{number(summary.data?.gpa)}</strong></div><div><span>Total credits</span><strong>{number(summary.data?.totalCredits, 0)}</strong></div><div className="record-summary-links"><a href="#/app/calculator">Calculate GPA</a><a href="#/app/cgpa">Calculate CGPA</a></div></div>
    <CoursePlanner />
    <div className="table-toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Search course code or title..." /><Button variant="outline" icon="eye" onClick={() => setSemester(true)}>View semester</Button></div><div className="table-filters"><AsyncSelect label="Academic session" loader={() => academicService.getAcademicSessions()} value={filters.sessionId} onChange={change('sessionId')} required={false} placeholder="All sessions" /><AsyncSelect label="Semester" loader={() => academicService.getSemesters()} value={filters.semesterId} onChange={change('semesterId')} required={false} placeholder="All semesters" /><AsyncSelect label="Level" loader={() => academicService.getLevels()} value={filters.levelId} onChange={change('levelId')} required={false} placeholder="All levels" /><button className="text-button" onClick={() => { setFilters({ sessionId: '', semesterId: '', levelId: '' }); setSearch(''); }}>Reset filters</button></div><DataTable columns={resultColumns} resource={resource} search={search} emptyTitle="No results added yet." emptyDescription="When your result is released, add it here and CGPA+ will calculate the quality points for you." onView={setViewing} onEdit={record => { setEditing(record); setEditor(true); }} onDelete={setDeleting} /><p className="table-help">Tip: add your semester courses above first, then add each result when your grades are released.</p><ResultEditor open={editor} onClose={() => setEditor(false)} record={editing} onSaved={refresh} /><ResultDetails record={viewing} onClose={() => setViewing(null)} /><ConfirmModal open={!!deleting} title="Delete this result?" description={`Delete ${deleting?.code || 'this course'} from your academic record? Nothing is removed until the backend confirms the request.`} actionLabel="Delete result" dangerous onClose={() => setDeleting(null)} onConfirm={async () => { await academicService.deleteResult(deleting.id); refresh(); }} /><Modal open={semester} onClose={() => setSemester(false)} title="Semester overview" description="The summary follows your current session and semester filters." wide><ConnectionState resource={summary} title="semester summary" emptyTitle="No semester selected." emptyDescription="Choose a session and semester with recorded courses.">{data => <div className="stats-grid stats-three"><Stat label="Semester GPA" value={number(data.gpa)} /><Stat label="Total credit units" value={number(data.totalCredits, 0)} /><Stat label="Current CGPA" value={number(data.cgpa)} accent /></div>}</ConnectionState></Modal></>;
}
