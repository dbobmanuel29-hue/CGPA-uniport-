import { useEffect, useState } from 'react';
import { PageHeader, Button, Panel, Field, Input, AsyncSelect, Notice, Badge, Stat } from '../../components/ui';
import { Modal, ConfirmModal, ActionError, useAction, ConnectionState } from '../../components/feedback';
import { DataTable, SearchBox } from '../../components/table';
import { useResource } from '../../hooks/useResource';
import { academicService } from '../../services/academic-service';
import { number, titleCase } from '../../utils/formatting';

const blank = { code: '', title: '', credits: '', grade: '', points: '', sessionId: '', semesterId: '', levelId: '' };
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
  return <Modal open={open} onClose={onClose} title={record ? 'Edit academic result' : 'Add an academic result'} description="Your own result, in the right academic context." wide><form className="form-stack" onSubmit={e => { e.preventDefault(); if (!contextualized) return; const payload = { ...form, code: form.code.trim().toUpperCase(), credits: Number(form.credits), points: Number(form.points) }; action.run(() => record ? academicService.updateResult(record.id, payload) : academicService.saveResult(payload), () => { onSaved?.(); onClose(); }, record ? 'Your result was updated.' : 'Your result was saved.'); }}><div className="form-grid"><Field label="Course code"><Input value={form.code} onChange={change('code')} placeholder="As shown on your result sheet" required maxLength={30} /></Field><Field label="Course title"><Input value={form.title} onChange={change('title')} placeholder="Full course title" required maxLength={180} /></Field><Field label="Credit units"><Input value={form.credits} onChange={change('credits')} type="number" required min="1" step="1" inputMode="numeric" /></Field><Field label="Grade"><Input value={form.grade} onChange={change('grade')} placeholder="Grade on your result sheet" required maxLength={20} /></Field><Field label="Grade points" hint="Enter the corresponding points from your result sheet."><Input value={form.points} onChange={change('points')} type="number" required min="0" step=".01" inputMode="decimal" /></Field><AsyncSelect label="Academic session" loader={() => academicService.getAcademicSessions()} value={form.sessionId} onChange={change('sessionId')} /><AsyncSelect label="Semester" loader={() => academicService.getSemesters()} value={form.semesterId} onChange={change('semesterId')} /><AsyncSelect label="Level" loader={() => academicService.getLevels()} value={form.levelId} onChange={change('levelId')} /></div><Notice>Academic selectors require backend data. Results are only saved after the service accepts them. No official grade mapping or course units are assumed here.</Notice><ActionError error={action.error} /><div className="modal-actions"><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" busy={action.busy} disabled={!contextualized} icon="check">{record ? 'Save changes' : 'Save result'}</Button></div></form></Modal>;
}

export function ResultDetails({ record, onClose }) {
  return <Modal open={!!record} onClose={onClose} title={record?.code || 'Result details'} description={record?.title} wide><dl className="detail-grid">{resultColumns.filter(c => c.key !== 'title').map(c => <div key={c.key}><dt>{c.label}</dt><dd>{String(record?.[c.key] ?? '--')}</dd></div>)}</dl></Modal>;
}

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
  return <><PageHeader eyebrow="A HOME FOR EVERY RESULT" title="Your academic record." description="Organize the courses, semesters and sessions that make up your university journey." actions={<Button icon="plus" onClick={() => { setEditing(null); setEditor(true); }}>Add result</Button>} /><div className="record-summary"><div><span>Current CGPA</span><strong>{number(summary.data?.cgpa)}</strong></div><div><span>Semester GPA</span><strong>{number(summary.data?.gpa)}</strong></div><div><span>Total credits</span><strong>{number(summary.data?.totalCredits, 0)}</strong></div><div className="record-summary-links"><a href="#/app/calculator">Calculate GPA</a><a href="#/app/cgpa">Calculate CGPA</a></div></div><div className="table-toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Search course code or title..." /><Button variant="outline" icon="eye" onClick={() => setSemester(true)}>View semester</Button></div><div className="table-filters"><AsyncSelect label="Academic session" loader={() => academicService.getAcademicSessions()} value={filters.sessionId} onChange={change('sessionId')} required={false} placeholder="All sessions" /><AsyncSelect label="Semester" loader={() => academicService.getSemesters()} value={filters.semesterId} onChange={change('semesterId')} required={false} placeholder="All semesters" /><AsyncSelect label="Level" loader={() => academicService.getLevels()} value={filters.levelId} onChange={change('levelId')} required={false} placeholder="All levels" /><button className="text-button" onClick={() => { setFilters({ sessionId: '', semesterId: '', levelId: '' }); setSearch(''); }}>Reset filters</button></div><DataTable columns={resultColumns} resource={resource} search={search} emptyTitle="No results added yet." emptyDescription="When you save your first course through the connected backend, it will appear here." onView={setViewing} onEdit={record => { setEditing(record); setEditor(true); }} onDelete={setDeleting} /><p className="table-help">Tip: select a column heading to sort. On smaller screens, swipe the table to see every field.</p><ResultEditor open={editor} onClose={() => setEditor(false)} record={editing} onSaved={refresh} /><ResultDetails record={viewing} onClose={() => setViewing(null)} /><ConfirmModal open={!!deleting} title="Delete this result?" description={`Delete ${deleting?.code || 'this course'} from your academic record? Nothing is removed until the backend confirms the request.`} actionLabel="Delete result" dangerous onClose={() => setDeleting(null)} onConfirm={async () => { await academicService.deleteResult(deleting.id); refresh(); }} /><Modal open={semester} onClose={() => setSemester(false)} title="Semester overview" description="The summary follows your current session and semester filters." wide><ConnectionState resource={summary} title="semester summary" emptyTitle="No semester selected." emptyDescription="Choose a session and semester with recorded courses.">{data => <div className="stats-grid stats-three"><Stat label="Semester GPA" value={number(data.gpa)} /><Stat label="Total credit units" value={number(data.totalCredits, 0)} /><Stat label="Current CGPA" value={number(data.cgpa)} accent /></div>}</ConnectionState></Modal></>;
}