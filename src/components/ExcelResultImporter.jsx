import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Field, Notice, Panel, Select, Badge } from './ui';
import { ActionError, useAction } from './feedback';
import { academicService } from '../services/academic-service';
import { GRADE_OPTIONS, FALLBACK_LEVELS, FALLBACK_SEMESTERS, FALLBACK_SESSIONS } from '../data/uniport-catalogue';

const REQUIRED = ['code', 'title', 'credits'];
const aliases = {
  code: ['course code', 'course_code', 'coursecode', 'code', 'course id', 'course no', 'course number'],
  title: ['course title', 'course_title', 'coursetitle', 'course name', 'coursename', 'title', 'course'],
  credits: ['credit units', 'credit unit', 'credits', 'credit', 'units', 'cu', 'creditunit', 'creditunits'],
  grade: ['grade', 'letter grade', 'lettergrade', 'result', 'letter'],
  points: ['grade point', 'grade points', 'gradepoint', 'gradepoints', 'point', 'points', 'gp'],
  score: ['score', 'mark', 'marks', 'percentage', 'percent', 'score %', 'total score'],
  sessionId: ['academic session', 'academic_session', 'session', 'session name', 'sessionname', 'school session'],
  semesterId: ['semester', 'term', 'semester name', 'semestername'],
  levelId: ['level', 'year', 'year level', 'class', 'academic level']
};

const normalize = value => String(value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, ' ');
const cleanHeader = value => normalize(value).replace(/[^a-z0-9 ]/g, '');
const headerScore = (header, names) => { const h = cleanHeader(header); return names.reduce((best, name) => { const n = cleanHeader(name); return h === n ? 100 : h.includes(n) || n.includes(h) ? Math.max(best, 60) : best; }, 0); };
function detectMapping(headers) { return Object.fromEntries([...REQUIRED, 'grade', 'points', 'score', 'levelId', 'sessionId', 'semesterId'].map(key => { let best = { header: '', score: 0 }; headers.forEach(header => { const score = headerScore(header, aliases[key] || []); if (score > best.score) best = { header, score }; }); return [key, best.score >= 60 ? best.header : '']; })); }
const numeric = value => { const n = Number(String(value ?? '').replace(/,/g, '').replace('%', '').trim()); return Number.isFinite(n) ? n : null; };
const gradeFromScore = score => { const n = numeric(score); if (n == null) return ''; if (n >= 70) return 'A'; if (n >= 60) return 'B'; if (n >= 50) return 'C'; if (n >= 45) return 'D'; if (n >= 40) return 'E'; return 'F'; };
const gradeFromPoints = points => GRADE_OPTIONS.find(item => Number(item.points) === Number(points))?.grade || '';
const optionId = (value, rows) => { const raw = normalize(value); if (!raw) return ''; const exact = rows.find(row => normalize(row.id) === raw || normalize(row.name) === raw); if (exact) return exact.id; return rows.find(row => normalize(row.name).includes(raw) || raw.includes(normalize(row.name)))?.id || ''; };
const levelIdFromValue = value => { const raw = normalize(value); const direct = FALLBACK_LEVELS.find(row => normalize(row.id) === raw || normalize(row.name) === raw || normalize(row.yearName) === raw); if (direct) return direct.id; const match = raw.match(/(100|200|300|400|500|600)/); return match ? `level-${match[1]}` : ''; };
const semesterIdFromValue = value => { const raw = normalize(value); if (raw.includes('first') || raw === '1' || raw.includes('1st')) return 'semester-first'; if (raw.includes('second') || raw === '2' || raw.includes('2nd')) return 'semester-second'; return optionId(value, FALLBACK_SEMESTERS); };
const sessionIdFromValue = value => optionId(value, FALLBACK_SESSIONS);

function makeRows(sheetRows, mapping, context) { return sheetRows.map((row, index) => { const get = key => mapping[key] ? row[mapping[key]] : ''; const code = String(get('code') ?? '').trim().toUpperCase(); const title = String(get('title') ?? '').trim(); const credits = numeric(get('credits')); const score = numeric(get('score')); const pointsRaw = numeric(get('points')); let grade = String(get('grade') ?? '').trim().toUpperCase(); if (!GRADE_OPTIONS.some(item => item.grade === grade)) grade = gradeFromScore(score) || gradeFromPoints(pointsRaw); const option = GRADE_OPTIONS.find(item => item.grade === grade); return { _row: index + 2, code, title, credits, grade, points: option?.points ?? pointsRaw, sessionId: sessionIdFromValue(get('sessionId')) || context.sessionId || '', semesterId: semesterIdFromValue(get('semesterId')) || context.semesterId || '', levelId: levelIdFromValue(get('levelId')) || context.levelId || '', score }; }).filter(row => row.code || row.title || row.credits || row.grade); }
function validateRows(rows) { return rows.map(row => { const errors = []; if (!row.code) errors.push('missing course code'); if (!row.title) errors.push('missing course title'); if (!(row.credits > 0)) errors.push('missing/invalid credit units'); if (!GRADE_OPTIONS.some(item => item.grade === row.grade)) errors.push('missing/unknown grade'); if (!row.levelId) errors.push('missing level'); if (!row.sessionId) errors.push('missing session'); if (!row.semesterId) errors.push('missing semester'); return { ...row, errors }; }); }

export default function ExcelResultImporter({ context = {}, onImported, compact = false }) {
  const { levelId: contextLevelId = '', sessionId: contextSessionId = '', semesterId: contextSemesterId = '' } = context;
  const inputRef = useRef(null); const action = useAction();
  const [fileName, setFileName] = useState(''); const [rawRows, setRawRows] = useState([]); const [rows, setRows] = useState([]); const [headers, setHeaders] = useState([]); const [mapping, setMapping] = useState({}); const [busyReading, setBusyReading] = useState(false); const [existing, setExisting] = useState([]); const [message, setMessage] = useState(''); const [readError, setReadError] = useState('');
  useEffect(() => { academicService.getResults({}).then(setExisting).catch(() => setExisting([])); }, []);
  useEffect(() => { if (rawRows.length) setRows(makeRows(rawRows, mapping, { levelId: contextLevelId, sessionId: contextSessionId, semesterId: contextSemesterId })); }, [rawRows, mapping, contextLevelId, contextSessionId, contextSemesterId]);
  const validRows = useMemo(() => validateRows(rows), [rows]);
  const duplicates = useMemo(() => new Set(existing.map(r => `${String(r.code || '').trim().toUpperCase()}|${r.sessionId || ''}|${r.semesterId || ''}|${r.levelId || ''}`)), [existing]);
  const keyFor = row => `${row.code}|${row.sessionId}|${row.semesterId}|${row.levelId}`;
  const importable = validRows.filter(row => !row.errors.length && !duplicates.has(keyFor(row)));
  const duplicateCount = validRows.filter(row => !row.errors.length && duplicates.has(keyFor(row))).length;

  async function readFile(file) {
    if (!file) return; action.clear(); setReadError(''); setMessage(''); setBusyReading(true); setFileName(file.name); setRawRows([]); setRows([]);
    try { const XLSX = await import('xlsx'); const buffer = await file.arrayBuffer(); const workbook = XLSX.read(buffer, { type: 'array', cellDates: true }); const sheets = workbook.SheetNames.map(name => ({ name, rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: '', raw: false }) })); const best = sheets.sort((a, b) => b.rows.length - a.rows.length)[0]; if (!best?.rows.length) throw new Error('The Excel file does not contain a readable table.'); const detected = detectMapping(Object.keys(best.rows[0])); setHeaders(Object.keys(best.rows[0])); setMapping(detected); setRawRows(best.rows); setMessage(`${best.rows.length} spreadsheet rows found from “${best.name}”.`); }
    catch (error) { setReadError(error?.message || 'Unable to read this Excel file. Please check that it is a valid .xlsx or .xls file.'); }
    finally { setBusyReading(false); }
  }
  async function importResults() { if (!importable.length) return; await action.run(async () => { for (const row of importable) await academicService.saveResult({ code: row.code, title: row.title, credits: Number(row.credits), grade: row.grade, points: Number(row.points), sessionId: row.sessionId, semesterId: row.semesterId, levelId: row.levelId, attemptType: 'regular', originalCourseCode: '' }); return importable.length; }, count => { setMessage(`${count} result${count === 1 ? '' : 's'} imported successfully.`); setRawRows([]); setRows([]); setHeaders([]); setFileName(''); academicService.getResults({}).then(setExisting).catch(() => {}); onImported?.(count); }, 'Your spreadsheet results were imported.'); }
  const clear = () => { setRawRows([]); setRows([]); setHeaders([]); setMapping({}); setFileName(''); setMessage(''); setReadError(''); action.clear(); };
  const label = { code: 'Course code', title: 'Course title', credits: 'Credit units', grade: 'Grade', points: 'Grade points', score: 'Score / mark', levelId: 'Level', sessionId: 'Academic session', semesterId: 'Semester' };
  return <Panel title="Import results from Excel" description="Upload an .xlsx or .xls spreadsheet. CGPA+ reads it in your browser, detects common columns and lets you review everything before anything is saved." className={compact ? 'excel-import-compact' : undefined}>
    <input ref={inputRef} type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" hidden onChange={e => { readFile(e.target.files?.[0]); e.target.value = ''; }} />
    <div className="excel-import-toolbar"><Button type="button" icon="upload" onClick={() => inputRef.current?.click()} busy={busyReading}>Choose Excel file</Button>{fileName && <Badge>{fileName}</Badge>}</div>
    <Notice>Your spreadsheet is processed in your browser. CGPA+ only saves results after you review and confirm them. If a column is not detected correctly, you can map it manually.</Notice>
    {readError && <p className="field-error" role="alert">{readError}</p>}
    {headers.length > 0 && <>
      <div className="form-grid excel-import-mapping">{Object.keys(label).map(key => <Field key={key} label={label[key]}><Select value={mapping[key] || ''} onChange={e => setMapping(prev => ({ ...prev, [key]: e.target.value }))}><option value="">Not mapped</option>{headers.map(header => <option key={header} value={header}>{header}</option>)}</Select></Field>)}</div>
      <div className="excel-import-summary"><strong>{validRows.length}</strong><span>rows found</span><strong>{importable.length}</strong><span>ready to import</span>{duplicateCount > 0 && <><strong>{duplicateCount}</strong><span>duplicates skipped</span></>}</div>
      {validRows.length > 0 && <div className="table-scroll"><table><thead><tr><th>Row</th><th>Course</th><th>Title</th><th>Units</th><th>Grade</th><th>Level</th><th>Session</th><th>Semester</th><th>Status</th></tr></thead><tbody>{validRows.slice(0, 50).map(row => <tr key={row._row}><td>{row._row}</td><td><strong>{row.code || '--'}</strong></td><td>{row.title || '--'}</td><td>{row.credits ?? '--'}</td><td>{row.grade || '--'}</td><td>{FALLBACK_LEVELS.find(x => x.id === row.levelId)?.name || row.levelId || '--'}</td><td>{FALLBACK_SESSIONS.find(x => x.id === row.sessionId)?.name || row.sessionId || '--'}</td><td>{FALLBACK_SEMESTERS.find(x => x.id === row.semesterId)?.name || row.semesterId || '--'}</td><td>{row.errors.length ? <Badge tone="danger">{row.errors.join(', ')}</Badge> : duplicates.has(keyFor(row)) ? <Badge tone="neutral">Already saved</Badge> : <Badge tone="success">Ready</Badge>}</td></tr>)}</tbody></table></div>}
      {validRows.length > 50 && <p className="field-hint">Showing the first 50 rows in the preview. All valid rows are considered for import.</p>}
      <ActionError error={action.error} />
      <div className="modal-actions"><Button variant="outline" type="button" onClick={clear}>Clear</Button><Button type="button" busy={action.busy} disabled={!importable.length} icon="upload" onClick={importResults}>Import {importable.length} result{importable.length === 1 ? '' : 's'}</Button></div>
    </>}
    {message && <p className="field-hint" role="status">{message}</p>}
  </Panel>;
}
