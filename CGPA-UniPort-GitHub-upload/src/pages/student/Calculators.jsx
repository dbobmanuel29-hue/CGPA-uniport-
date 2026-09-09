import { useMemo, useState } from 'react';
import { Button, Badge, Field, Input, Select, PageHeader, Panel, Notice, Stat, AsyncSelect } from '../../components/ui';
import { Modal, ConfirmModal, ActionError, useAction, useToast } from '../../components/feedback';
import { Icon } from '../../components/Icon';
import { BarChart, Progress } from '../../components/charts';
import { useCalculator, blankCourse } from '../../state/calculator';
import { calculateGPA, calculateCGPA, calculateProjectedCGPA, calculateRequiredGPA, calculateMaximumAchievableCGPA, calculateProgress, targetOutlook } from '../../utils/calculations';
import { validateCourses } from '../../utils/validation';
import { number } from '../../utils/formatting';
import { academicService } from '../../services/academic-service';
import { planningClassification } from '../../data/grading';
import { useResource } from '../../hooks/useResource';

function CalculatorNav({ active }) { return <nav className="calculator-nav" aria-label="Calculation tools">{[['gpa', 'GPA calculator', '/app/calculator'], ['cgpa', 'CGPA calculator', '/app/cgpa'], ['target', 'Target CGPA', '/app/target'], ['projection', 'Projection', '/app/projection']].map(([key, label, path]) => <a href={`#${path}`} key={key} className={active === key ? 'active' : ''}>{label}</a>)}</nav>; }
function PlanningNote() { return <Notice icon="shield"><strong>Your inputs. A planning estimate.</strong> These tools do not assume UniPort grading rules. Enter points from your result sheet and select the appropriate maximum scale. Classification requires the backend grading policy.</Notice>; }
function SaveSemester({ open, onClose, rows, maxPoint }) {
  const [metadata, setMetadata] = useState({ sessionId: '', semesterId: '', levelId: '' });
  const action = useAction();
  return <Modal open={open} onClose={onClose} title="Save this semester" description="Connect your calculation to an academic session."><form className="form-stack" onSubmit={e => { e.preventDefault(); if (!metadata.sessionId || !metadata.semesterId || !metadata.levelId) return; action.run(() => academicService.saveSemester({ ...metadata, courses: rows.map(r => ({ code: r.code.trim().toUpperCase(), title: r.title.trim(), credits: Number(r.credits), points: Number(r.points) })), planningMaxPoint: maxPoint }), onClose, 'The connected service saved your semester.'); }}><AsyncSelect label="Academic session" loader={() => academicService.getAcademicSessions()} value={metadata.sessionId} onChange={e => setMetadata({ ...metadata, sessionId: e.target.value })} /><AsyncSelect label="Semester" loader={() => academicService.getSemesters()} value={metadata.semesterId} onChange={e => setMetadata({ ...metadata, semesterId: e.target.value })} /><AsyncSelect label="Level" loader={() => academicService.getLevels()} value={metadata.levelId} onChange={e => setMetadata({ ...metadata, levelId: e.target.value })} /><Notice>Your calculation remains in this page's memory until the backend accepts it. It is not an academic record yet.</Notice><ActionError error={action.error} /><div className="modal-actions"><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" busy={action.busy} disabled={!metadata.sessionId || !metadata.semesterId || !metadata.levelId}>Save semester</Button></div></form></Modal>;
}

export function GpaCalculator() {
  const { rows, setRows, maxPoint, setMaxPoint } = useCalculator();
  const policy = useResource(() => academicService.getGradingRules());
  const classify = value => planningClassification(value, policy.data, maxPoint);
  const [result, setResult] = useState(null);
  const [validation, setValidation] = useState('');
  const [save, setSave] = useState(false);
  const [clear, setClear] = useState(false);
  const toast = useToast();
  function update(id, key, value) { setRows(previous => previous.map(row => row.id === id ? { ...row, [key]: value } : row)); setResult(null); setValidation(''); }
  function calculate(e) { e.preventDefault(); const error = validateCourses(rows, maxPoint); if (error) { setValidation(error); return; } try { setResult(calculateGPA(rows, maxPoint)); setValidation(''); } catch (error) { setValidation(error.message); } }
  function saveClick() { const error = validateCourses(rows, maxPoint); if (error) { setValidation(error); return; } setResult(calculateGPA(rows, maxPoint)); setSave(true); }
  return <><PageHeader eyebrow="LET'S MAKE THE NUMBERS SIMPLE" title="Your semester, calculated." description="A little less guesswork. Calculate your GPA using your own courses and grade points." actions={<Badge tone="success" dot>Works without an account</Badge>} /><CalculatorNav active="gpa" /><div className="calculator-layout"><section className="panel course-entry"><div className="panel-header"><div><h2>Your courses</h2><p>Enter the values shown on your result sheet.</p></div><label className="scale-select"><span>Max. scale</span><Select value={maxPoint} onChange={e => { setMaxPoint(Number(e.target.value)); setResult(null); }} aria-label="Maximum GPA scale">{[4, 5, 7, 10].map(v => <option value={v} key={v}>{v}.0</option>)}</Select></label></div><form onSubmit={calculate} noValidate><div className="course-grid-labels"><span>COURSE CODE</span><span>COURSE TITLE</span><span>UNITS</span><span>GRADE POINTS</span><span /></div><div className="course-rows">{rows.map((row, i) => <div className="course-entry-row" key={row.id}><Field label={`Course ${i + 1} code`}><Input aria-label={`Course ${i + 1} code`} value={row.code} placeholder="Course code" onChange={e => update(row.id, 'code', e.target.value.toUpperCase())} maxLength={30} /></Field><Field label="Course title"><Input aria-label={`Course ${i + 1} title`} value={row.title} placeholder="Course title (optional)" onChange={e => update(row.id, 'title', e.target.value)} maxLength={180} /></Field><Field label="Credit units"><Input aria-label={`Course ${i + 1} credit units`} type="number" inputMode="numeric" min="1" step="1" value={row.credits} placeholder="3" onChange={e => update(row.id, 'credits', e.target.value)} /></Field><Field label="Grade points"><Input aria-label={`Course ${i + 1} grade points`} type="number" inputMode="decimal" min="0" max={maxPoint} step="0.01" value={row.points} placeholder="0.00" onChange={e => update(row.id, 'points', e.target.value)} /></Field><button type="button" className="icon-button remove-course" aria-label={`Remove course ${i + 1}`} onClick={() => { setRows(rows.filter(r => r.id !== row.id)); setResult(null); }}><Icon name="close" size={16} /></button></div>)}</div>{!rows.length && <div className="calculator-empty"><Icon name="book" size={28} /><p>No courses yet. Add one to get started.</p></div>}<button className="add-course-button" type="button" onClick={() => { setRows([...rows, blankCourse()]); setResult(null); }}><Icon name="plus" size={16} />Add another course</button>{validation && <div className="inline-alert danger" role="alert"><Icon name="alert" size={16} />{validation}</div>}<div className="calculator-form-actions"><Button type="submit" icon="calculator">Calculate GPA</Button><Button variant="outline" type="button" onClick={saveClick} icon="cloud">Save semester</Button><button className="text-button" type="button" onClick={() => setClear(true)}>Clear all</button></div></form><PlanningNote /></section><aside className="calculator-summary"><div className="gpa-output"><div className="output-label"><Icon name="calculator" size={19} /><span>YOUR SEMESTER GPA</span></div><div className="gpa-big" aria-live="polite">{number(result?.gpa)}<small>/ {number(maxPoint)}</small></div><span className="output-caption">{result ? 'Calculated locally from your inputs.' : 'Your next bit of clarity is right here.'}</span><div className="gpa-output-divider" /><div className="output-detail"><span>Total courses</span><strong>{result?.totalCourses ?? '--'}</strong></div><div className="output-detail"><span>Total credit units</span><strong>{number(result?.totalCreditUnits, 0)}</strong></div><div className="output-detail"><span>Quality points</span><strong>{number(result?.totalQualityPoints)}</strong></div></div><Panel title="What does it mean?"><p className="small-muted">{classify(result?.gpa)}. Your class of degree is not assumed from an example scale.</p><a href="#/app/target" className="small-link">Plan your target CGPA<Icon name="arrow" size={14} /></a></Panel><div className="calculator-tip"><Icon name="lock" size={16} /><p>Calculator drafts are kept only in memory. Refreshing this page clears them.</p></div></aside></div><SaveSemester open={save} onClose={() => setSave(false)} rows={rows} maxPoint={maxPoint} /><ConfirmModal open={clear} onClose={() => setClear(false)} title="Clear your calculation?" description="This removes your unsaved calculator inputs only. It does not delete any academic records." actionLabel="Clear inputs" onConfirm={() => { setRows([blankCourse(), blankCourse(), blankCourse()]); setResult(null); setValidation(''); toast.info('Local calculator inputs cleared.'); }} /></>;
}

export function CgpaCalculator() {
  const policy = useResource(() => academicService.getGradingRules());
  const [form, setForm] = useState({ credits: '', qualityPoints: '', semesters: '', max: 5 });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const change = k => e => { setForm({ ...form, [k]: e.target.value }); setResult(null); };
  function submit(event) {
    event.preventDefault();
    try {
      const cgpa = calculateCGPA(form.qualityPoints, form.credits, Number(form.max));
      if (cgpa === null) throw new Error('Enter at least one completed credit unit.');
      setResult(cgpa);
      setError('');
    } catch (error) { setError(error.message); }
  }
  return (
    <>
      <PageHeader eyebrow="THE BIG PICTURE" title="Bring your semesters together." description="Calculate a credit-weighted CGPA from your total quality points and credit units." />
      <CalculatorNav active="cgpa" />
      <div className="planner-grid">
        <Panel title="Your cumulative totals" description="Use totals from your academic records, not an average of semester GPAs.">
          <form className="form-stack" onSubmit={submit}>
            <div className="form-grid">
              <Field label="Total credit units"><Input required type="number" min="1" step="1" inputMode="numeric" value={form.credits} onChange={change('credits')} placeholder="Your completed units" /></Field>
              <Field label="Total quality points"><Input required type="number" min="0" step="any" inputMode="decimal" value={form.qualityPoints} onChange={change('qualityPoints')} placeholder="Sum of quality points" /></Field>
              <Field label="Number of semesters"><Input required type="number" min="1" step="1" value={form.semesters} onChange={change('semesters')} placeholder="Completed semesters" /></Field>
              <Field label="Maximum grading scale"><Select value={form.max} onChange={change('max')}>{[4, 5, 7, 10].map(v => <option key={v}>{v}</option>)}</Select></Field>
            </div>
            {error && <p className="field-error" role="alert">{error}</p>}
            <Button type="submit" icon="calculator">Calculate CGPA</Button>
          </form>
        </Panel>
        <div className="gpa-output">
          <div className="output-label"><Icon name="chart" /><span>CURRENT CGPA</span></div>
          <div className="gpa-big" aria-live="polite">{number(result)}<small>/ {number(form.max)}</small></div>
          <p className="output-caption">{result == null ? 'Add your totals to see the bigger picture.' : `${form.semesters} semesters under your selected scale.`}</p>
          <div className="gpa-output-divider" />
          <div className="output-detail"><span>Classification</span><strong>{planningClassification(result, policy.data, form.max)}</strong></div>
          <Progress value={result == null ? null : calculateProgress(result, form.max)} label="CGPA relative to your planning scale" accent />
        </div>
      </div>
      <PlanningNote />
    </>
  );
}

export function TargetCalculator() {
  const [form, setForm] = useState({ current: '', completed: '', remaining: '', target: '', max: 5 });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const change = k => e => { setForm({ ...form, [k]: e.target.value }); setResult(null); };
  const fields = [['current', 'Current CGPA'], ['completed', 'Completed credit units'], ['remaining', 'Remaining credit units'], ['target', 'Target CGPA']];
  function submit(e) { e.preventDefault(); try { const required = calculateRequiredGPA(form.current, form.completed, form.remaining, form.target, Number(form.max)); const maximum = calculateMaximumAchievableCGPA(form.current, form.completed, form.remaining, Number(form.max)); setResult({ required, maximum, outlook: targetOutlook(required, Number(form.max)) }); setError(''); } catch (error) { setError(error.message); } }
  return <><PageHeader eyebrow="GIVE YOUR GOALS DIRECTION" title="A goal. A plan. Your next move." description="Find the average GPA required across your remaining credits to reach a target." /><CalculatorNav active="target" /><div className="planner-grid"><Panel title="What are you aiming for?" description="These are your planning assumptions, not stored academic records."><form className="form-stack" onSubmit={submit}><div className="form-grid">{fields.map(([key, label]) => <Field label={label} key={key}><Input type="number" inputMode={key === 'completed' || key === 'remaining' ? 'numeric' : 'decimal'} min="0" max={key === 'target' || key === 'current' ? form.max : undefined} step={key === 'completed' || key === 'remaining' ? '1' : '0.01'} required value={form[key]} onChange={change(key)} placeholder={key === 'completed' || key === 'remaining' ? 'Credit units' : '0.00'} /></Field>)}</div><Field label="Maximum grading scale"><Select value={form.max} onChange={change('max')}>{[4, 5, 7, 10].map(v => <option key={v}>{v}</option>)}</Select></Field>{error && <p className="field-error" role="alert">{error}</p>}<Button type="submit" icon="target">Calculate required GPA</Button></form></Panel><div><div className="gpa-output"><div className="output-label"><Icon name="target" /><span>YOUR REQUIRED GPA</span></div><div className="gpa-big" aria-live="polite">{result?.required === Infinity ? 'Not possible' : number(result?.required)}<small>/ {number(form.max)}</small></div>{result ? <><Badge tone={result.outlook.tone}>{result.outlook.label}</Badge><p className="output-caption">{result.outlook.description}</p><div className="gpa-output-divider" /><div className="output-detail"><span>Maximum achievable CGPA</span><strong>{number(result.maximum)}</strong></div></> : <p className="output-caption">Know what your next semesters need to look like.</p>}</div><Notice>"Difficult" means the required GPA exceeds 90% of your selected scale. These labels are mathematical planning guidance only.</Notice></div></div><PlanningNote /></>;
}

export function ProjectionCalculator() {
  const [form, setForm] = useState({ current: '', completed: '', remaining: '', custom: '4.5' });
  const [submitted, setSubmitted] = useState(null);
  const [error, setError] = useState('');
  const values = useMemo(() => { if (!submitted) return []; return [3, 3.5, 4, 4.5, 5].map(g => calculateProjectedCGPA(submitted.current, submitted.completed, g, submitted.remaining)); }, [submitted]);
  let custom = null;
  if (submitted && form.custom !== '' && Number(form.custom) >= 0 && Number(form.custom) <= 5) custom = calculateProjectedCGPA(submitted.current, submitted.completed, form.custom, submitted.remaining);
  return <><PageHeader eyebrow="MAKE ROOM FOR POSSIBILITY" title="What could your next semester change?" description="Compare future GPA scenarios on an illustrative 5-point scale. Your inputs stay local." /><CalculatorNav active="projection" /><Panel title="Set the starting point"><form onSubmit={e => { e.preventDefault(); try { const projected = calculateProjectedCGPA(form.current, form.completed, 5, form.remaining); if (projected == null) throw new Error('Enter completed or remaining credit units.'); setSubmitted({ ...form }); setError(''); } catch (error) { setError(error.message); } }}><div className="projection-inputs">{[['current', 'Current CGPA'], ['completed', 'Completed credit units'], ['remaining', 'Remaining credit units']].map(([key, label]) => <Field label={label} key={key}><Input type="number" required min="0" max={key === 'current' ? 5 : undefined} step={key === 'current' ? '.01' : '1'} value={form[key]} onChange={e => { setForm({ ...form, [key]: e.target.value }); setSubmitted(null); }} placeholder="0" /></Field>)}<Button type="submit" icon="chart">Compare scenarios</Button></div>{error && <p className="field-error" role="alert">{error}</p>}</form></Panel><div className="projection-output-grid"><Panel title="A little perspective" description="Projected CGPA at different averages over your remaining credit units."><BarChart values={values} labels={['GPA 3.0', 'GPA 3.5', 'GPA 4.0', 'GPA 4.5', 'GPA 5.0']} max={5} /></Panel><Panel title="Try your own scenario" description="Move the slider to see what changes."><label className="range-label" htmlFor="custom-gpa">Future average GPA <strong>{number(form.custom)}</strong></label><input id="custom-gpa" className="range" type="range" min="0" max="5" step="0.05" value={form.custom} onChange={e => setForm({ ...form, custom: e.target.value })} /><Field label="Custom future GPA"><Input type="number" min="0" max="5" step=".01" value={form.custom} onChange={e => setForm({ ...form, custom: e.target.value })} /></Field><div className="custom-projection-result" aria-live="polite"><span>Projected CGPA</span><strong>{number(custom)}<small>/ 5.00</small></strong></div>{(Number(form.custom) < 0 || Number(form.custom) > 5) && <p className="field-error">Future GPA must be between 0 and 5.</p>}</Panel></div><div className="stats-grid stats-five">{[3, 3.5, 4, 4.5, 5].map((g, i) => <Stat key={g} label={`If your GPA is ${g.toFixed(1)}`} value={number(values[i])} icon="chart" />)}</div><PlanningNote /></>;
}