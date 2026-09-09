import { useEffect, useState } from 'react';
import { PageHeader, Panel, Button, Badge, Field, Input, Select, Textarea, AsyncSelect, Tabs, Notice } from '../../components/ui';
import { Modal, ConfirmModal, ActionError, useAction } from '../../components/feedback';
import { DataTable, SearchBox, StatusFilter } from '../../components/table';
import { Icon } from '../../components/Icon';
import { useResource } from '../../hooks/useResource';
import { adminService } from '../../services/admin-service';
import { titleCase } from '../../utils/formatting';
import { ACADEMIC_HIERARCHY } from '../../data/uniport';

const basic = [{ key: 'name', label: 'Name', required: true }, { key: 'code', label: 'Code', required: true }];
const status = { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'], required: true };
const faculty = { key: 'facultyId', label: 'Faculty', relation: 'getFaculties', required: true };
const department = { key: 'departmentId', label: 'Department', relation: 'getDepartments', dependsOn: 'facultyId', required: true };
const programme = { key: 'programmeId', label: 'Programme', relation: 'getProgrammes', dependsOn: 'departmentId', required: true };
const version = { key: 'academicVersionId', label: 'Academic version', relation: 'getAcademicVersions', dependsOn: 'programmeId', required: true };
const level = { key: 'levelId', label: 'Level', relation: 'getLevels', dependsOn: 'academicVersionId', required: true };
const semester = { key: 'semesterId', label: 'Semester', relation: 'getSemesters', dependsOn: 'academicVersionId', required: true };
const col = (key, label) => ({ key, label });

export const ENTITIES = {
  faculties: { title: 'Faculties', singular: 'Faculty', list: 'getFaculties', description: 'The first academic relationship in the UniPort hierarchy.', fields: [...basic, { key: 'description', label: 'Description', type: 'textarea' }, status], columns: [col('name', 'Faculty'), col('code', 'Code'), col('departmentCount', 'Departments')] },
  departments: { title: 'Departments', singular: 'Department', list: 'getDepartments', description: 'Each department belongs to a faculty. Relationships are supplied by the backend.', fields: [faculty, ...basic, status], columns: [col('name', 'Department'), col('code', 'Code'), col('facultyName', 'Faculty')] },
  programmes: { title: 'Programmes', singular: 'Programme', list: 'getProgrammes', description: 'Connect programmes to the correct faculty and department.', fields: [faculty, department, ...basic, { key: 'award', label: 'Award / qualification', required: true }, { key: 'durationYears', label: 'Nominal duration (years)', type: 'number', min: 1, step: 1, required: true }, status], columns: [col('name', 'Programme'), col('code', 'Code'), col('facultyName', 'Faculty'), col('departmentName', 'Department'), col('award', 'Award')] },
  courses: { title: 'Courses', singular: 'Course', list: 'getCourses', description: 'Manage verified course metadata within an academic version. No course units are prefilled.', fields: [{ key: 'code', label: 'Course code', required: true }, { key: 'title', label: 'Course title', required: true }, { key: 'credits', label: 'Credit units', type: 'number', min: 1, step: 1, required: true }, faculty, department, programme, version, level, semester, status], columns: [col('code', 'Course code'), col('title', 'Course title'), col('credits', 'Units'), col('programmeName', 'Programme'), col('levelName', 'Level'), col('semesterName', 'Semester'), col('academicVersionName', 'Academic version')] },
  versions: { title: 'Academic versions', singular: 'AcademicVersion', list: 'getAcademicVersions', description: 'Version programme requirements to preserve the academic context of past results.', fields: [faculty, department, programme, ...basic, { key: 'effectiveSessionId', label: 'Effective academic session', relation: 'getAcademicSessions', required: true }, status], columns: [col('name', 'Version'), col('code', 'Code'), col('programmeName', 'Programme'), col('effectiveSessionName', 'Effective session')] },
  levels: { title: 'Levels', singular: 'Level', list: 'getLevels', description: 'Academic levels must follow the connected programme version.', fields: [faculty, department, programme, version, ...basic, { key: 'order', label: 'Display order', type: 'number', min: 0, step: 1, required: true }, status], columns: [col('name', 'Level'), col('code', 'Code'), col('academicVersionName', 'Academic version'), col('order', 'Order')] },
  semesters: { title: 'Semesters', singular: 'Semester', list: 'getSemesters', description: 'Define semester labels and their academic sequence without assumed university rules.', fields: [faculty, department, programme, version, ...basic, { key: 'order', label: 'Display order', type: 'number', min: 0, step: 1, required: true }, status], columns: [col('name', 'Semester'), col('academicVersionName', 'Academic version'), col('order', 'Order')] },
  sessions: { title: 'Academic sessions', singular: 'AcademicSession', list: 'getAcademicSessions', description: 'Manage session dates and labels from authorized academic information.', fields: [...basic, { key: 'startDate', label: 'Start date', type: 'date', required: true }, { key: 'endDate', label: 'End date', type: 'date', required: true }, status], columns: [col('name', 'Academic session'), col('code', 'Code'), col('startDate', 'Start date'), col('endDate', 'End date')] },
  grading: { title: 'Grading rules', singular: 'GradingRule', list: 'getGradingRules', description: 'Only verified backend-controlled policies may define institutional grades and classification.', fields: [faculty, department, programme, version, { key: 'label', label: 'Grade label', required: true }, { key: 'minScore', label: 'Minimum score', type: 'number', min: 0, max: 100, step: '.01', required: true }, { key: 'maxScore', label: 'Maximum score', type: 'number', min: 0, max: 100, step: '.01', required: true }, { key: 'points', label: 'Grade point', type: 'number', min: 0, step: '.01', required: true }, { key: 'maxPoint', label: 'Maximum scale point', type: 'number', min: 1, step: '.01', required: true }, { key: 'source', label: 'Policy source / reference', required: true }, status], columns: [col('label', 'Grade label'), col('minScore', 'Minimum score'), col('maxScore', 'Maximum score'), col('points', 'Grade point'), col('academicVersionName', 'Academic version'), col('source', 'Policy source')] },
};

function EntityFields({ config, form, setForm }) {
  function update(key, value) {
    const cleared = new Set([key]);
    let changed = true;
    while (changed) { changed = false; config.fields.forEach(field => { if (field.dependsOn && cleared.has(field.dependsOn) && !cleared.has(field.key)) { cleared.add(field.key); changed = true; } }); }
    setForm(previous => ({ ...previous, ...Object.fromEntries([...cleared].filter(k => k !== key).map(k => [k, ''])), [key]: value }));
  }
  return <div className="form-grid">{config.fields.map(f => <div className={f.type === 'textarea' ? 'full-width' : ''} key={f.key}>{f.relation ? <AsyncSelect label={f.label} loader={() => adminService[f.relation](f.dependsOn ? { [f.dependsOn]: form[f.dependsOn] } : {})} dependencies={[form[f.dependsOn] || '']} enabled={!f.dependsOn || !!form[f.dependsOn]} value={form[f.key] || ''} onChange={e => update(f.key, e.target.value)} required={f.required} /> : <Field label={f.label} optional={!f.required}>{f.type === 'textarea' ? <Textarea value={form[f.key] || ''} onChange={e => update(f.key, e.target.value)} maxLength={5000} /> : f.type === 'select' ? <Select required={f.required} value={form[f.key] || ''} onChange={e => update(f.key, e.target.value)}><option value="">Select {f.label.toLowerCase()}</option>{f.options.map(o => <option key={o} value={o}>{titleCase(o)}</option>)}</Select> : <Input required={f.required} type={f.type || 'text'} min={f.min} max={f.max} step={f.step} value={form[f.key] ?? ''} onChange={e => update(f.key, e.target.value)} placeholder={f.label} />}</Field>}</div>)}</div>;
}

export function AcademicCrud({ entity, embedded = false }) {
  const config = ENTITIES[entity];
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const resource = useResource(() => adminService[config.list]({ status: statusFilter }), [entity, statusFilter]);
  const [editor, setEditor] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState({});
  const [validation, setValidation] = useState('');
  const action = useAction();
  useEffect(() => { setSearch(''); setStatusFilter(''); setEditor(false); setEditing(null); }, [entity]);
  function openEditor(row = null) { setEditing(row); setForm(row || {}); setValidation(''); action.clear(); setEditor(true); }
  const columns = [...config.columns, { key: 'status', label: 'Status', render: value => <Badge tone={value === 'active' ? 'success' : 'neutral'}>{titleCase(value) || '--'}</Badge> }];
  const title = config.singular.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  function save(e) {
    e.preventDefault();
    for (const f of config.fields) if (f.required && (form[f.key] === '' || form[f.key] == null)) return setValidation(`Complete ${f.label.toLowerCase()} before saving.`);
    if (form.startDate && form.endDate && form.endDate < form.startDate) return setValidation('The end date must follow the start date.');
    if (form.minScore !== undefined && Number(form.minScore) > Number(form.maxScore)) return setValidation('Minimum score cannot exceed maximum score.');
    if (form.points !== undefined && Number(form.points) > Number(form.maxPoint)) return setValidation('Grade points cannot exceed the maximum scale.');
    setValidation('');
    const payload = Object.fromEntries(config.fields.map(f => [f.key, f.type === 'number' && form[f.key] !== '' ? Number(form[f.key]) : form[f.key] || '']));
    action.run(() => editing ? adminService[`update${config.singular}`](editing.id, payload) : adminService[`create${config.singular}`](payload), () => { setEditor(false); resource.refresh(); }, `The ${title} was ${editing ? 'updated' : 'created'}.`);
  }
  return <>{!embedded && <PageHeader eyebrow="UNIPORT ACADEMIC CATALOGUE" title={config.title} description={config.description} actions={<Button icon="plus" onClick={() => openEditor()}>Add {title}</Button>} />}<div className="table-toolbar"><SearchBox value={search} onChange={setSearch} placeholder={`Search ${config.title.toLowerCase()}...`} /><StatusFilter value={statusFilter} onChange={setStatusFilter} options={['active', 'inactive']} />{embedded && <Button icon="plus" onClick={() => openEditor()}>Add {title}</Button>}</div><DataTable resource={resource} columns={columns} search={search} emptyTitle={`No ${config.title.toLowerCase()} available yet.`} emptyDescription="Backend data required. Only authorized, verified academic information belongs in this catalogue." onView={setViewing} onEdit={openEditor} onDelete={setDeleting} /><Notice icon="shield">All create, update and delete requests require backend admin authorization and audit logging. This UI does not grant access or silently change data.</Notice><Modal open={editor} onClose={() => setEditor(false)} title={`${editing ? 'Edit' : 'Add'} ${title}`} description="Submit verified academic information to the connected service." wide><form className="form-stack" onSubmit={save}><EntityFields config={config} form={form} setForm={setForm} />{validation && <p className="field-error" role="alert">{validation}</p>}<ActionError error={action.error} /><div className="modal-actions"><Button variant="outline" onClick={() => setEditor(false)}>Cancel</Button><Button type="submit" busy={action.busy} icon="check">{editing ? 'Save changes' : `Create ${title}`}</Button></div></form></Modal><Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.name || viewing?.title || viewing?.label || `${config.title} details`} wide><dl className="detail-grid">{config.fields.map(f => <div key={f.key}><dt>{f.label}</dt><dd>{String(viewing?.[f.key] ?? '--')}</dd></div>)}</dl></Modal><ConfirmModal open={!!deleting} title={`Delete this ${title}?`} description="The backend will validate academic relationships and permissions before deleting anything. Historical records must remain protected." actionLabel={`Delete ${title}`} dangerous onClose={() => setDeleting(null)} onConfirm={async () => { await adminService[`delete${config.singular}`](deleting.id); resource.refresh(); }} /></>;
}

export default function AcademicData() {
  const [tab, setTab] = useState('faculties');
  return <><PageHeader eyebrow="A CONNECTED ACADEMIC FOUNDATION" title="UniPort academic data." description="A versioned, institution-specific catalogue. Not a fabricated university database." /><div className="academic-hierarchy">{ACADEMIC_HIERARCHY.map((item, i) => <span key={item}>{i > 0 && <Icon name="chevron" size={12} />}{item}</span>)}</div><Tabs value={tab} onChange={setTab} options={Object.entries(ENTITIES).filter(([key]) => key !== 'courses').map(([value, c]) => ({ value, label: c.title }))} /><AcademicCrud key={tab} entity={tab} embedded /></>;
}