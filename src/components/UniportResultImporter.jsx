import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Field, Input, Notice, Select } from './ui';
import { ActionError, useAction } from './feedback';
import { academicService } from '../services/academic-service';
import { GRADE_OPTIONS, FALLBACK_LEVELS, FALLBACK_SEMESTERS, FALLBACK_SESSIONS } from '../data/uniport-catalogue';

const gradeSet = new Set(GRADE_OPTIONS.map(item => item.grade));
const normalize = value => String(value ?? '').trim().replace(/\s+/g, ' ');
const clean = value => normalize(value).toLowerCase().replace(/[_-]+/g, ' ');

const levelFromText = value => {
  const raw = clean(value);
  const numeric = raw.match(/(?:level|year|class)?\s*(100|200|300|400|500|600)(?:\s*level)?/i);
  if (numeric) return `level-${numeric[1]}`;
  const year = raw.match(/\b(?:year|level)\s*(1|2|3|4|5|6)\b/i);
  return year ? `level-${Number(year[1]) * 100}` : '';
};

const semesterFromText = value => {
  const raw = clean(value);
  if (/\b(first|1st|1)\s*(semester|sem)?\b/.test(raw)) return 'semester-first';
  if (/\b(second|2nd|2)\s*(semester|sem)?\b/.test(raw)) return 'semester-second';
  return '';
};

const sessionFromText = value => {
  const match = String(value ?? '').match(/20\d{2}\s*[\/-]\s*20\d{2}/);
  return match ? match[0].replace(/\s+/g, '') : '';
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
  return {
    sessionId: sessionIdFromText(text) || fallback.sessionId || '',
    levelId: levelFromText(text) || fallback.levelId || '',
    semesterId: semesterFromText(text) || fallback.semesterId || ''
  };
}

function parseRows(text, fallbackContext, sourceName) {
  const lines = String(text || '').split(/\r?\n/).map(normalize).filter(Boolean);
  const rows = [];
  const codePattern = /\b[A-Z]{2,6}\s*[-.]?\s*\d{3}\b/i;
  let currentContext = { ...fallbackContext };

  function parseCandidate(codeMatch, combined, rowContext) {
    const code = codeMatch[0].replace(/[-.]?\s*/g, ' ').replace(/\s+/g, ' ').toUpperCase();
    const afterCode = combined.slice(codeMatch.index + codeMatch[0].length).trim();
    const gradeMatch = afterCode.match(/(?:^|\s)(A|B|C|D|E|F)(?:[+\-])?(?=\s|$)/i);
    const grade = gradeMatch?.[1]?.toUpperCase() || '';
    const tokens = afterCode.split(/\s+/).filter(Boolean);
    const gradeIndex = gradeMatch ? tokens.findIndex(token => /^([ABCDEF])[+\-]?$/i.test(token)) : -1;
    const beforeGrade = gradeIndex >= 0 ? tokens.slice(0, gradeIndex) : tokens;
    const unitCandidates = beforeGrade.map((token, index) => ({ token, index })).filter(item => /^[1-6](?:\.0)?$/.test(item.token));
    const unitCandidate = unitCandidates.at(-1);
    const unit = unitCandidate ? Number(unitCandidate.token) : null;
    const titleTokens = unitCandidate ? beforeGrade.slice(0, unitCandidate.index) : beforeGrade;
    const title = titleTokens.join(' ').replace(/^(?:[-:|])+|(?:[-:|])+$/g, '').trim();
    if (!title || !unit || !gradeSet.has(grade)) return null;

    const explicitSession = sessionIdFromText(combined);
    const explicitLevel = levelFromText(combined);
    const explicitSemester = semesterFromText(combined);
    const pointsAfterGrade = gradeIndex >= 0 ? Number(tokens[gradeIndex + 1]) : NaN;
    const points = Number.isFinite(pointsAfterGrade) && pointsAfterGrade >= 0 && pointsAfterGrade <= 5
      ? pointsAfterGrade
      : GRADE_OPTIONS.find(item => item.grade === grade)?.points;

    return {
      id: `import-${rows.length}-${sourceName}-${code}`,
      code,
      title,
      credits: unit,
      grade,
      points,
      sessionId: explicitSession || rowContext.sessionId || '',
      semesterId: explicitSemester || rowContext.semesterId || '',
      levelId: explicitLevel || rowContext.levelId || '',
      sourceName,
      sourceText: combined,
      confidence: 'review'
    };
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const sessionId = sessionIdFromText(line);
    const levelId = levelIdFromValue(line);
    const semesterId = semesterIdFromValue(line);

    if (sessionId) currentContext = { ...currentContext, sessionId };
    if (levelId) currentContext = { ...currentContext, levelId };
    if (semesterId) currentContext = { ...currentContext, semesterId };

    const codeMatch = line.match(codePattern);
    if (!codeMatch) continue;

    let combined = line;
    let candidate = parseCandidate(codeMatch, combined, currentContext);

    if (!candidate) {
      for (let offset = 1; offset <= 3 && index + offset < lines.length; offset += 1) {
        const next = lines[index + offset];
        if (codePattern.test(next) && offset > 1) break;
        combined = `${combined} ${next}`;
        candidate = parseCandidate(codeMatch, combined, currentContext);
        if (candidate) break;
      }
    }

    if (candidate) rows.push(candidate);
  }

  const unique = new Map();
  rows.forEach(row => {
    const key = `${row.code}|${row.sessionId}|${row.semesterId}|${row.levelId}`;
    if (!unique.has(key)) unique.set(key, row);
  });
  return [...unique.values()];
}

async function extractPdfText(file, onProgress) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).toString();
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
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

    pages.push([...lines.entries()].sort((a, b) => b[0] - a[0]).map(([, parts]) => parts.join(' ')).join('\n'));
    onProgress?.(`Reading PDF page ${pageNumber} of ${pdf.numPages}...`);
  }

  return pages.join('\n');
}

async function renderPdfPagesForOcr(file, onProgress) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).toString();
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const canvases = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    canvases.push(canvas);
    onProgress?.(`Preparing scanned page ${pageNumber} of ${pdf.numPages}...`);
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

  return parts.join('\n');
}

function getStatus(row, duplicates) {
  if (!row.code || !row.title || !row.credits || !row.grade || !row.levelId || !row.sessionId || !row.semesterId) return 'Needs review';
  return duplicates.has(`${row.code}|${row.sessionId}|${row.semesterId}|${row.levelId}`) ? 'Already saved' : 'Ready';
}

export default function UniportResultImporter({ context = {}, onImported }) {
  const inputRef = useRef(null);
  const action = useAction();
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const previewUrlsRef = useRef([]);
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState([]);
  const [existing, setExisting] = useState([]);
  const [error, setError] = useState('');

  const duplicates = useMemo(
    () => new Set(existing.map(row => `${String(row.code || '').trim().toUpperCase()}|${row.sessionId || ''}|${row.semesterId || ''}|${row.levelId || ''}`)),
    [existing]
  );
  const readyRows = rows.filter(row => getStatus(row, duplicates) === 'Ready');

  useEffect(() => () => {
    previewUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    previewUrlsRef.current = [];
  }, []);

  function addPreviews(selectedFiles) {
    const next = selectedFiles.map(file => ({
      file,
      url: URL.createObjectURL(file),
      kind: file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image'
    }));
    previewUrlsRef.current.push(...next.map(item => item.url));
    setPreviews(prev => [...prev, ...next]);
    setFiles(prev => [...prev, ...selectedFiles]);
    return next;
  }

  async function processFiles(selectedFiles) {
    if (!selectedFiles.length) return;

    action.clear();
    setError('');
    setRows([]);
    setStatus(`Preparing ${selectedFiles.length} file${selectedFiles.length === 1 ? '' : 's'}...`);
    addPreviews(selectedFiles);

    try {
      const fallback = {
        sessionId: context.sessionId || '',
        levelId: context.levelId || '',
        semesterId: context.semesterId || ''
      };
      const allRows = [];

      for (let fileIndex = 0; fileIndex < selectedFiles.length; fileIndex += 1) {
        const file = selectedFiles[fileIndex];
        setStatus(`Reading ${file.name} (${fileIndex + 1}/${selectedFiles.length})...`);

        let text = '';
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          text = await extractPdfText(file, message => setStatus(`${file.name}: ${message}`));
          let parsed = parseRows(text, extractDocumentContext(text, fallback), file.name);

          if (!parsed.length) {
            setStatus(`${file.name}: scanned PDF detected. Running OCR...`);
            const canvases = await renderPdfPagesForOcr(file, message => setStatus(`${file.name}: ${message}`));
            text = await ocrImages(canvases, message => setStatus(`${file.name}: ${message}`));
            parsed = parseRows(text, extractDocumentContext(text, fallback), file.name);
          }

          allRows.push(...parsed);
        } else {
          text = await ocrImages([file], message => setStatus(`${file.name}: ${message}`));
          allRows.push(...parseRows(text, extractDocumentContext(text, fallback), file.name));
        }
      }

      const unique = new Map();
      allRows.forEach(row => {
        const key = `${row.code}|${row.sessionId}|${row.semesterId}|${row.levelId}`;
        if (!unique.has(key)) unique.set(key, row);
      });

      const parsedRows = [...unique.values()].map((row, index) => ({ ...row, id: `import-${index}-${row.code}` }));
      if (!parsedRows.length) {
        throw new Error('No course rows could be detected. Upload a clearer result image/PDF where the course code, title, credit units, grade, year/level and semester are visible.');
      }

      setRows(parsedRows);
      setStatus(`${parsedRows.length} course result${parsedRows.length === 1 ? '' : 's'} detected from ${selectedFiles.length} file${selectedFiles.length === 1 ? '' : 's'}.`);
      const saved = await academicService.getResults({});
      setExisting(saved || []);
    } catch (e) {
      setError(e?.message || 'Unable to read the result document.');
      setStatus('');
    }
  }

  function updateRow(id, field, value) {
    setRows(prev => prev.map(row => row.id === id
      ? { ...row, [field]: field === 'credits' || field === 'points' ? Number(value) : value }
      : row
    ));
  }

  function updateGrade(id, grade) {
    const points = GRADE_OPTIONS.find(item => item.grade === grade)?.points || '';
    setRows(prev => prev.map(row => row.id === id ? { ...row, grade, points } : row));
  }

  async function importResults() {
    if (!readyRows.length) return;

    await action.run(async () => {
      await Promise.all(readyRows.map(row => academicService.saveResult({
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
      })));
      return readyRows.length;
    }, count => {
      setRows([]);
      setStatus(`${count} result${count === 1 ? '' : 's'} imported successfully.`);
      previewUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      previewUrlsRef.current = [];
      setFiles([]);
      setPreviews([]);
      onImported?.(count);
    }, 'Your UniPort result was imported.');

    // Source files are intentionally never sent to Firebase, Cloudinary, or another server.
    // Only the reviewed academic fields are saved.
  }

  function clear() {
    previewUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    previewUrlsRef.current = [];
    setRows([]);
    setFiles([]);
    setPreviews([]);
    setStatus('');
    setError('');
    action.clear();
  }

  const hasFiles = files.length > 0;

  return <section className="uniport-importer">
    <input
      ref={inputRef}
      hidden
      multiple
      type="file"
      accept=".pdf,image/*,application/pdf"
      onChange={event => {
        const selected = Array.from(event.target.files || []);
        event.target.value = '';
        processFiles(selected);
      }}
    />

    <div className="uniport-import-head">
      <div>
        <span className="eyebrow">UNIPORT RESULT IMPORT</span>
        <h2>Upload your UniPort result</h2>
        <p>Upload one or several result screenshots/photos or PDF pages. CGPA+ reads the information on your device and keeps the review tied to what was detected from each source.</p>
      </div>
      <Button icon="upload" onClick={() => inputRef.current?.click()} busy={!!status && !rows.length}>Choose files</Button>
    </div>

    <Notice tone="info" icon="info">
      <strong>Private by design:</strong> your pictures and PDFs are processed in your browser and are not uploaded or stored by CGPA+. After you confirm the import, only the academic details you approved are saved to your account.
    </Notice>

    {hasFiles && <div className="uniport-source-area">
      <div className="uniport-source-head">
        <div>
          <strong>{files.length} source file{files.length === 1 ? '' : 's'}</strong>
          <span>Keep the original document visible while checking the detected values below.</span>
        </div>
        <Button variant="outline" onClick={() => inputRef.current?.click()}>Add more files</Button>
      </div>
      <div className="uniport-source-grid">
        {previews.map((item, index) => (
          <article className="uniport-source-card" key={item.url}>
            <div className="uniport-source-label"><Badge>{item.file.name}</Badge><span>{index + 1}</span></div>
            <div className="uniport-source-preview">
              {item.kind === 'pdf'
                ? <iframe title={item.file.name} src={item.url} />
                : <img src={item.url} alt={`Uploaded result ${index + 1}: ${item.file.name}`} />}
            </div>
          </article>
        ))}
      </div>
    </div>}

    {status && <div className="uniport-import-status"><span className="status-dot" />{status}</div>}
    {error && <ActionError error={error} />}

    {rows.length > 0 && <div className="uniport-import-review">
      <div className="uniport-review-title">
        <div>
          <span className="eyebrow">REVIEW BEFORE SAVING</span>
          <h3>Check every detected value against your original result</h3>
          <p>Nothing is saved until you press Import. If a field is wrong or missing, correct it here first.</p>
        </div>
      </div>

      <div className="uniport-review-summary">
        <div><strong>{rows.length}</strong><span>detected</span></div>
        <div><strong>{readyRows.length}</strong><span>ready to save</span></div>
        <div><strong>{rows.length - readyRows.length}</strong><span>needs review / duplicate</span></div>
      </div>

      <div className="table-scroll">
        <table>
          <thead><tr><th>Course Code</th><th>Course Title</th><th>Units</th><th>Grade</th><th>Year</th><th>Session</th><th>Semester</th><th>Source</th><th>Status</th></tr></thead>
          <tbody>{rows.map(row => <tr key={row.id}>
            <td><Input value={row.code} onChange={e => updateRow(row.id, 'code', e.target.value.toUpperCase())} /></td>
            <td><Input value={row.title} onChange={e => updateRow(row.id, 'title', e.target.value)} /></td>
            <td><Input value={row.credits} type="number" min="1" max="6" onChange={e => updateRow(row.id, 'credits', e.target.value)} /></td>
            <td><Select value={row.grade} onChange={e => updateGrade(row.id, e.target.value)}><option value="">Select</option>{GRADE_OPTIONS.map(item => <option key={item.grade} value={item.grade}>{item.grade}</option>)}</Select></td>
            <td><Select value={row.levelId} onChange={e => updateRow(row.id, 'levelId', e.target.value)}><option value="">Select</option>{FALLBACK_LEVELS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></td>
            <td><Select value={row.sessionId} onChange={e => updateRow(row.id, 'sessionId', e.target.value)}><option value="">Select</option>{FALLBACK_SESSIONS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></td>
            <td><Select value={row.semesterId} onChange={e => updateRow(row.id, 'semesterId', e.target.value)}><option value="">Select</option>{FALLBACK_SEMESTERS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></td>
            <td><Badge>{row.sourceName}</Badge></td>
            <td><Badge tone={getStatus(row, duplicates) === 'Ready' ? 'success' : getStatus(row, duplicates) === 'Already saved' ? 'neutral' : 'danger'}>{getStatus(row, duplicates)}</Badge></td>
          </tr>)}</tbody>
        </table>
      </div>

      <div className="uniport-mobile-review">
        {rows.map(row => <article className="uniport-mobile-row" key={row.id}>
          <div className="uniport-mobile-source"><Badge>{row.sourceName}</Badge></div>
          <div className="uniport-mobile-field"><span>Course code</span><Input value={row.code} onChange={e => updateRow(row.id, 'code', e.target.value.toUpperCase())} /></div>
          <div className="uniport-mobile-field"><span>Credit units</span><Input value={row.credits} type="number" min="1" max="6" onChange={e => updateRow(row.id, 'credits', e.target.value)} /></div>
          <div className="uniport-mobile-field wide"><span>Course title</span><Input value={row.title} onChange={e => updateRow(row.id, 'title', e.target.value)} /></div>
          <div className="uniport-mobile-field"><span>Grade</span><Select value={row.grade} onChange={e => updateGrade(row.id, e.target.value)}><option value="">Select</option>{GRADE_OPTIONS.map(item => <option key={item.grade} value={item.grade}>{item.grade}</option>)}</Select></div>
          <div className="uniport-mobile-field"><span>Year / level</span><Select value={row.levelId} onChange={e => updateRow(row.id, 'levelId', e.target.value)}><option value="">Select</option>{FALLBACK_LEVELS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></div>
          <div className="uniport-mobile-field"><span>Session</span><Select value={row.sessionId} onChange={e => updateRow(row.id, 'sessionId', e.target.value)}><option value="">Select</option>{FALLBACK_SESSIONS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></div>
          <div className="uniport-mobile-field"><span>Semester</span><Select value={row.semesterId} onChange={e => updateRow(row.id, 'semesterId', e.target.value)}><option value="">Select</option>{FALLBACK_SEMESTERS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></div>
          <div className="uniport-mobile-field wide"><span>Status</span><Badge tone={getStatus(row, duplicates) === 'Ready' ? 'success' : getStatus(row, duplicates) === 'Already saved' ? 'neutral' : 'danger'}>{getStatus(row, duplicates)}</Badge></div>
        </article>)}
      </div>

      <Notice tone="info" icon="info">
        <strong>Before you save:</strong> compare the review with the original picture/PDF above. CGPA+ will not silently change year, semester, credit units or grade. Missing essentials stay marked for review instead of being guessed.
      </Notice>

      <ActionError error={action.error} />
      <div className="modal-actions">
        <Button variant="outline" onClick={clear}>Clear</Button>
        <Button icon="check" onClick={importResults} busy={action.busy} disabled={!readyRows.length}>Import {readyRows.length} result{readyRows.length === 1 ? '' : 's'}</Button>
      </div>
    </div>}

    <style>{`
      .uniport-importer{display:grid;gap:18px;padding:24px;border:1px solid var(--border);border-radius:16px;background:var(--surface)}
      .uniport-import-head{display:flex;justify-content:space-between;gap:22px;align-items:flex-start}
      .uniport-import-head h2{font-size:22px;margin:5px 0 8px}
      .uniport-import-head p{max-width:760px;color:var(--muted);line-height:1.7;margin:0}
      .uniport-source-area{display:grid;gap:12px;padding:16px;border:1px solid var(--border);border-radius:14px;background:var(--soft)}
      .uniport-source-head{display:flex;justify-content:space-between;gap:16px;align-items:center}
      .uniport-source-head strong{display:block;font-size:14px}.uniport-source-head span{display:block;color:var(--muted);font-size:11px;margin-top:3px}
      .uniport-source-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
      .uniport-source-card{min-width:0;border:1px solid var(--border);border-radius:12px;background:var(--surface);overflow:hidden}
      .uniport-source-label{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 10px;border-bottom:1px solid var(--border)}
      .uniport-source-label>span{font-size:10px;color:var(--muted)}
      .uniport-source-preview{height:280px;background:#eee;display:grid;place-items:center;overflow:hidden}
      .uniport-source-preview img{width:100%;height:100%;object-fit:contain}
      .uniport-source-preview iframe{width:100%;height:100%;border:0;background:#fff}
      .uniport-import-status{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:12px}
      .status-dot{width:7px;height:7px;border-radius:50%;background:var(--green);flex:0 0 auto}
      .uniport-review-title h3{font-size:19px;margin:5px 0 6px}.uniport-review-title p{margin:0;color:var(--muted);font-size:12px}
      .uniport-review-summary{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--border);border-radius:12px;overflow:hidden}
      .uniport-review-summary>div{padding:14px 16px;border-right:1px solid var(--border)}.uniport-review-summary>div:last-child{border-right:0}
      .uniport-review-summary strong{display:block;font-size:20px}.uniport-review-summary span{font-size:10px;color:var(--muted)}
      .uniport-import-review .table-scroll{max-height:540px;margin-top:16px}.uniport-import-review table{min-width:1120px}
      .uniport-import-review .input,.uniport-import-review .select{min-width:100px;font-size:11px;padding:8px}
      .uniport-import-review td:nth-child(2) .input{min-width:190px}
      .uniport-mobile-review{display:none}
      .uniport-mobile-source{grid-column:1/-1}
      @media(max-width:720px){
        .uniport-importer{padding:18px 14px}
        .uniport-import-head{flex-direction:column}.uniport-import-head>.button{width:100%}
        .uniport-source-head{align-items:flex-start;flex-direction:column}.uniport-source-head>.button{width:100%}
        .uniport-source-grid{grid-template-columns:1fr}.uniport-source-preview{height:360px}
        .uniport-import-review .table-scroll{display:none}
        .uniport-mobile-review{display:grid;gap:12px;margin-top:16px}
        .uniport-mobile-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px;border:1px solid var(--border);border-radius:14px;background:var(--soft)}
        .uniport-mobile-field{min-width:0}.uniport-mobile-field.wide{grid-column:1/-1}
        .uniport-mobile-field span{display:block;font-size:10px;color:var(--muted);margin-bottom:3px;text-transform:uppercase;letter-spacing:.04em}
        .uniport-mobile-field input,.uniport-mobile-field select{width:100%;min-width:0}
        .uniport-mobile-field .input,.uniport-mobile-field .select{font-size:13px;padding:9px}
        .uniport-review-summary{grid-template-columns:1fr}.uniport-review-summary>div{border-right:0;border-bottom:1px solid var(--border)}
        .uniport-review-summary>div:last-child{border-bottom:0}
      }
    `}</style>
  </section>;
}
