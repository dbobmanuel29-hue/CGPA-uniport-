import { useMemo, useRef, useState } from 'react';
import { Badge, Button, Field, Input, Notice, Select } from './ui';
import { ActionError, useAction } from './feedback';
import { academicService } from '../services/academic-service';
import { GRADE_OPTIONS, FALLBACK_LEVELS, FALLBACK_SEMESTERS, FALLBACK_SESSIONS } from '../data/uniport-catalogue';

const gradeSet = new Set(GRADE_OPTIONS.map(item => item.grade));
const normalize = value => String(value ?? '').trim().replace(/\\s+/g, ' ');
const clean = value => normalize(value).toLowerCase().replace(/[_-]+/g, ' ');
const levelFromText = value => {
  const raw = clean(value);
  const match = raw.match(/(?:level|year|class)?\\s*(100|200|300|400|500|600)(?:\\s*level)?/i);
  return match ? `level-${match[1]}` : '';
};
const semesterFromText = value => {
  const raw = clean(value);
  if (/\\b(first|1st|1)\\b/.test(raw)) return 'semester-first';
  if (/\\b(second|2nd|2)\\b/.test(raw)) return 'semester-second';
  return '';
};
const sessionFromText = value => {
  const match = String(value ?? '').match(/20\\d{2}\\s*[\\/-]\\s*20\\d{2}/);
  return match ? match[0].replace(/\\s+/g, '') : '';
};
const sessionIdFromText = value => {
  const found = sessionFromText(value);
  if (!found) return '';
  const row = FALLBACK_SESSIONS.find(item => clean(item.name) === clean(found));
  return row?.id || '';
};
const levelIdFromValue = value => {
  const raw = clean(value);
  const exact = FALLBACK_LEVELS.find(item => clean(item.id) === raw || clean(item.name) === raw || clean(item.yearName) === raw);
  return exact?.id || levelFromText(raw);
};
const semesterIdFromValue = value => {
  const raw = clean(value);
  const exact = FALLBACK_SEMESTERS.find(item => clean(item.id) === raw || clean(item.name) === raw);
  return exact?.id || semesterFromText(raw);
};

function extractDocumentContext(text, fallback = {}) {
  const session = sessionIdFromText(text) || fallback.sessionId || '';
  const level = levelFromText(text) || fallback.levelId || '';
  const semester = semesterFromText(text) || fallback.semesterId || '';
  return { sessionId: session, levelId: level, semesterId: semester };
}

function parseRows(text, context) {
  const lines = String(text || '').split(/\\r?\\n/).map(normalize).filter(Boolean);
  const rows = [];
  const codePattern = /\\b[A-Z]{2,6}\\s*[-.]?\\s*\\d{3}\\b/i;
  for (const line of lines) {
    const codeMatch = line.match(codePattern);
    if (!codeMatch) continue;
    const code = codeMatch[0].replace(/[-.]?\\s*/g, ' ').replace(/\\s+/g, ' ').toUpperCase();
    const afterCode = line.slice(codeMatch.index + codeMatch[0].length).trim();
    const gradeMatch = afterCode.match(/(?:^|\\s)(A|B|C|D|E|F)(?:[+\\-])?(?:\\s|$)/i);
    const grade = gradeMatch?.[1]?.toUpperCase() || '';
    const tokens = afterCode.split(/\\s+/).filter(Boolean);
    const gradeIndex = gradeMatch ? tokens.findIndex(token => /^([ABCDEF])[+\\-]?$/i.test(token)) : -1;
    const beforeGrade = gradeIndex >= 0 ? tokens.slice(0, gradeIndex) : tokens;
    const unitCandidates = beforeGrade.map((token, index) => ({ token, index })).filter(item => /^[1-6](?:\\.0)?$/.test(item.token));
    const unit = unitCandidates.length ? Number(unitCandidates[unitCandidates.length - 1].token) : null;
    const titleTokens = unit != null ? beforeGrade.slice(0, unitCandidates[unitCandidates.length - 1].index) : beforeGrade;
    const title = titleTokens.join(' ').replace(/^(?:[-:|])+|(?:[-:|])+$/g, '').trim();
    if (!title || !unit || !gradeSet.has(grade)) continue;
    const point = GRADE_OPTIONS.find(item => item.grade === grade)?.points;
    rows.push({
      id: `import-${rows.length}-${code}`,
      code,
      title,
      credits: unit,
      grade,
      points: point,
      sessionId: context.sessionId,
      semesterId: context.semesterId,
      levelId: context.levelId,
      confidence: 'review',
      source: 'document'
    });
  }
  const unique = new Map();
  rows.forEach(row => unique.set(`${row.code}|${row.sessionId}|${row.semesterId}|${row.levelId}`, row));
  return [...unique.values()];
}

async function extractPdfText(file, onProgress) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).toString();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const lines = new Map();
    content.items.forEach(item => {
      const y = Math.round(item.transform?.[5] || 0);
      const key = Math.round(y / 2) * 2;
      if (!lines.has(key)) lines.set(key, []);
      lines.get(key).push(item.str);
    });
    const text = [...lines.entries()].sort((a, b) => b[0] - a[0]).map(([, parts]) => parts.join(' ')).join('\\n');
    pages.push(text);
    onProgress?.(`Reading PDF page ${pageNumber} of ${pdf.numPages}...`);
  }
  return pages.join('\\n');
}

async function renderPdfPagesForOcr(file, onProgress) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).toString();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const canvases = [];
  const limit = Math.min(pdf.numPages, 6);
  for (let pageNumber = 1; pageNumber <= limit; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.7 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    canvases.push(canvas);
    onProgress?.(`Preparing scanned page ${pageNumber} of ${limit}...`);
  }
  return canvases;
}

async function ocrImages(images, onProgress) {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');
  const parts = [];
  try {
    for (let index = 0; index < images.length; index += 1) {
      const result = await worker.recognize(images[index]);
      parts.push(result.data.text || '');
      onProgress?.(`Reading image ${index + 1} of ${images.length}...`);
    }
  } finally {
    await worker.terminate();
  }
  return parts.join('\\n');
}

function getStatus(row, duplicates) {
  if (!row.code || !row.title || !row.credits || !row.grade || !row.levelId || !row.sessionId || !row.semesterId) return 'Needs review';
  return duplicates.has(`${row.code}|${row.sessionId}|${row.semesterId}|${row.levelId}`) ? 'Already saved' : 'Ready';
}

export default function UniportResultImporter({ context = {}, onImported }) {
  const inputRef = useRef(null);
  const action = useAction();
  const [fileName, setFileName] = useState('');
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState([]);
  const [rawText, setRawText] = useState('');
  const [existing, setExisting] = useState([]);
  const [error, setError] = useState('');

  const duplicates = useMemo(() => new Set(existing.map(row => `${String(row.code || '').trim().toUpperCase()}|${row.sessionId || ''}|${row.semesterId || ''}|${row.levelId || ''}`)), [existing]);
  const readyRows = rows.filter(row => getStatus(row, duplicates) === 'Ready');

  async function processFile(file) {
    if (!file) return;
    action.clear();
    setError('');
    setRows([]);
    setRawText('');
    setFileName(file.name);
    setStatus('Reading your result...');
    try {
      const fallback = {
        sessionId: context.sessionId || '',
        levelId: context.levelId || '',
        semesterId: context.semesterId || ''
      };
      let text = '';
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        text = await extractPdfText(file, setStatus);
        let parsedContext = extractDocumentContext(text, fallback);
        let parsed = parseRows(text, parsedContext);
        if (parsed.length === 0) {
          setStatus('This looks like a scanned PDF. Running local OCR...');
          const canvases = await renderPdfPagesForOcr(file, setStatus);
          text = await ocrImages(canvases, setStatus);
          parsedContext = extractDocumentContext(text, fallback);
          parsed = parseRows(text, parsedContext);
        }
        if (!parsed.length) throw new Error('No course rows could be detected. Try a clearer result PDF or screenshot, then review the manual entry option.');
        setRows(parsed);
        setRawText(text);
        setStatus(`${parsed.length} course result${parsed.length === 1 ? '' : 's'} detected.`);
      } else {
        setStatus('Reading your screenshot...');
        text = await ocrImages([file], setStatus);
        const parsedContext = extractDocumentContext(text, fallback);
        const parsed = parseRows(text, parsedContext);
        if (!parsed.length) throw new Error('No course rows could be detected. Use a clearer screenshot with the course table fully visible.');
        setRows(parsed);
        setRawText(text);
        setStatus(`${parsed.length} course result${parsed.length === 1 ? '' : 's'} detected.`);
      }
      const saved = await academicService.getResults({});
      setExisting(saved || []);
    } catch (e) {
      setError(e?.message || 'Unable to read this result document.');
      setStatus('');
    }
  }

  function updateRow(id, field, value) {
    setRows(prev => prev.map(row => row.id === id ? { ...row, [field]: field === 'credits' || field === 'points' ? Number(value) : value } : row));
  }

  function updateGrade(id, grade) {
    const points = GRADE_OPTIONS.find(item => item.grade === grade)?.points || '';
    setRows(prev => prev.map(row => row.id === id ? { ...row, grade, points } : row));
  }

  async function importResults() {
    if (!readyRows.length) return;
    await action.run(async () => {
      for (const row of readyRows) {
        await academicService.saveResult({
          code: row.code.trim().toUpperCase(),
          title: row.title.trim(),
          credits: Number(row.credits),
          grade: row.grade,
          points: Number(row.points),
          sessionId: row.sessionId,
          semesterId: row.semesterId,
          levelId: row.levelId,
          attemptType: 'regular',
          originalCourseCode: ''
        });
      }
      return readyRows.length;
    }, count => {
      setRows([]);
      setRawText('');
      setStatus(`${count} result${count === 1 ? '' : 's'} imported successfully.`);
      setExisting(prev => [...prev, ...readyRows]);
      onImported?.(count);
    }, 'Your UniPort result was imported.');
  }

  function clear() {
    setRows([]);
    setRawText('');
    setFileName('');
    setStatus('');
    setError('');
    action.clear();
  }

  return <section className="uniport-importer">
    <input ref={inputRef} hidden type="file" accept=".pdf,image/png,image/jpeg,image/webp,application/pdf" onChange={e => { processFile(e.target.files?.[0]); e.target.value = ''; }} />
    <div className="uniport-import-head">
      <div>
        <span className="eyebrow">UNIPORT RESULT IMPORT</span>
        <h2>Upload your UniPort result</h2>
        <p>Upload an ARIS result PDF or a clear screenshot. CGPA+ reads it on your device, lets you correct anything it misunderstood, then saves only what you confirm.</p>
      </div>
      <Button icon="upload" onClick={() => inputRef.current?.click()} busy={!!status && !rows.length}>Choose result</Button>
    </div>
    <Notice tone="info" icon="info"><strong>Privacy:</strong> the document is processed in your browser. CGPA+ does not upload the result file to a server. Always check the detected rows before importing.</Notice>
    {fileName && <div className="uniport-import-file"><Badge>{fileName}</Badge>{status && <span>{status}</span>}</div>}
    {error && <ActionError error={error} />}
    {rows.length > 0 && <div className="uniport-import-review">
      <div className="uniport-review-summary"><div><strong>{rows.length}</strong><span>detected</span></div><div><strong>{readyRows.length}</strong><span>ready to save</span></div><div><strong>{rows.length - readyRows.length}</strong><span>needs review / duplicate</span></div></div>
      <div className="table-scroll"><table><thead><tr><th>Course</th><th>Title</th><th>Units</th><th>Grade</th><th>Level</th><th>Session</th><th>Semester</th><th>Status</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}>
        <td><Input value={row.code} onChange={e => updateRow(row.id, 'code', e.target.value.toUpperCase())} /></td>
        <td><Input value={row.title} onChange={e => updateRow(row.id, 'title', e.target.value)} /></td>
        <td><Input value={row.credits} type="number" min="1" max="6" onChange={e => updateRow(row.id, 'credits', e.target.value)} /></td>
        <td><Select value={row.grade} onChange={e => updateGrade(row.id, e.target.value)}><option value="">Select</option>{GRADE_OPTIONS.map(item => <option key={item.grade} value={item.grade}>{item.grade}</option>)}</Select></td>
        <td><Select value={row.levelId} onChange={e => updateRow(row.id, 'levelId', e.target.value)}><option value="">Select</option>{FALLBACK_LEVELS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></td>
        <td><Select value={row.sessionId} onChange={e => updateRow(row.id, 'sessionId', e.target.value)}><option value="">Select</option>{FALLBACK_SESSIONS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></td>
        <td><Select value={row.semesterId} onChange={e => updateRow(row.id, 'semesterId', e.target.value)}><option value="">Select</option>{FALLBACK_SEMESTERS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></td>
        <td><Badge tone={getStatus(row, duplicates) === 'Ready' ? 'success' : getStatus(row, duplicates) === 'Already saved' ? 'neutral' : 'danger'}>{getStatus(row, duplicates)}</Badge></td>
      </tr>)}</tbody></table></div>
      <p className="field-hint">CGPA+ will not overwrite an existing matching result. Correct any highlighted information before importing.</p>
      <ActionError error={action.error} />
      <div className="modal-actions"><Button variant="outline" onClick={clear}>Clear</Button><Button icon="check" onClick={importResults} busy={action.busy} disabled={!readyRows.length}>Import {readyRows.length} result{readyRows.length === 1 ? '' : 's'}</Button></div>
    </div>}
    {rawText && rows.length === 0 && <p className="field-hint">The document was read successfully, but no rows remain to review.</p>}
    <style>{`
      .uniport-importer{display:grid;gap:18px;padding:24px;border:1px solid var(--border);border-radius:16px;background:var(--surface)}
      .uniport-import-head{display:flex;justify-content:space-between;gap:22px;align-items:flex-start}
      .uniport-import-head h2{font-size:22px;margin:5px 0 8px}
      .uniport-import-head p{max-width:760px;color:var(--muted);line-height:1.7;margin:0}
      .uniport-import-file{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding-top:2px}
      .uniport-import-file>span{font-size:12px;color:var(--muted)}
      .uniport-review-summary{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--border);border-radius:12px;overflow:hidden}
      .uniport-review-summary>div{padding:14px 16px;border-right:1px solid var(--border)}
      .uniport-review-summary>div:last-child{border-right:0}
      .uniport-review-summary strong{display:block;font-size:20px}
      .uniport-review-summary span{font-size:10px;color:var(--muted)}
      .uniport-import-review .table-scroll{max-height:540px;margin-top:16px}
      .uniport-import-review table{min-width:980px}
      .uniport-import-review .input,.uniport-import-review .select{min-width:100px;font-size:11px;padding:8px}
      .uniport-import-review td:nth-child(2) .input{min-width:190px}
      @media(max-width:720px){
        .uniport-import-head{flex-direction:column}
        .uniport-import-head>.button{width:100%}
        .uniport-review-summary{grid-template-columns:1fr}
        .uniport-review-summary>div{border-right:0;border-bottom:1px solid var(--border)}
        .uniport-review-summary>div:last-child{border-bottom:0}
      }
    `}</style>
  </section>;
}
