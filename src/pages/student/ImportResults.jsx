import { useEffect, useState } from 'react';
import { PageHeader, Button, Notice, Panel } from '../../components/ui';
import ExcelResultImporter from '../../components/ExcelResultImporter';
import UniportResultImporter from '../../components/UniportResultImporter';
import { academicService } from '../../services/academic-service';

export default function ImportResults() {
  const [profile, setProfile] = useState(null);
  useEffect(() => { academicService.getProfile().then(setProfile).catch(() => {}); }, []);

  const context = {
    levelId: profile?.currentLevelId || '',
    sessionId: profile?.currentSessionId || '',
    semesterId: profile?.currentSemesterId || ''
  };

  return <>
    <PageHeader
      eyebrow="ACADEMIC TOOLS"
      title="Bring your results into CGPA+."
      description="Choose the easiest way to add your academic history. UniPort result documents, Excel/CSV files and manual entry can all work together."
      actions={<>
        <Button variant="outline" href="#/app/academic" endIcon="arrow">Back to academic record</Button>
        <Button href="#/app/academic?add=1" icon="plus">Add manually</Button>
      </>}
    />

    <div className="import-results-page">
      <section className="import-choice-grid" aria-label="Result import options">
        <a className="import-choice-card is-primary" href="#uniport-result">
          <span className="import-choice-number">01</span>
          <strong>UniPort result</strong>
          <p>Upload an ARIS result PDF or a clear screenshot. CGPA+ reads the document on your device and prepares the courses for review.</p>
          <span className="import-choice-link">Upload result →</span>
        </a>
        <a className="import-choice-card" href="#excel-result">
          <span className="import-choice-number">02</span>
          <strong>Excel</strong>
          <p>Already have a spreadsheet? Keep using the existing importer to map columns, preview rows and add them safely.</p>
          <span className="import-choice-link">Import spreadsheet →</span>
        </a>
        <a className="import-choice-card" href="#/app/academic?add=1">
          <span className="import-choice-number">03</span>
          <strong>Manual entry</strong>
          <p>Add one course at a time when you only need to enter a result or correct something after an import.</p>
          <span className="import-choice-link">Add a result →</span>
        </a>
      </section>

      <section id="uniport-result" className="import-section">
        <div className="import-section-heading">
          <div>
            <span className="eyebrow">OPTION 01</span>
            <h2>Import from your UniPort result</h2>
            <p>Use an ARIS result PDF, downloaded academic document, or a clear screenshot. The file stays on your device while CGPA+ reads it.</p>
          </div>
        </div>
        <UniportResultImporter context={context} />
      </section>

      <section id="excel-result" className="import-section">
        <div className="import-section-heading">
          <div>
            <span className="eyebrow">OPTION 02</span>
            <h2>Import from Excel</h2>
            <p>For students who already have their results in a spreadsheet. This existing workflow is unchanged.</p>
          </div>
        </div>
        <ExcelResultImporter context={context} onImported={() => {}} />
      </section>

      <section className="import-manual-card">
        <div>
          <span className="eyebrow">OPTION 03</span>
          <h2>Need to add just one result?</h2>
          <p>Use the existing manual result form. It is still the simplest option for individual courses and corrections.</p>
        </div>
        <Button href="#/app/academic?add=1" icon="plus">Add result manually</Button>
      </section>

      <Notice tone="info" icon="info">
        <strong>Important:</strong> CGPA+ is an independent academic planning tool, not the University of Port Harcourt portal. Imported results are only saved after you review the detected information and confirm the import.
      </Notice>
    </div>

    <style>{`
      .import-results-page{display:grid;gap:24px;padding-bottom:32px}
      .import-choice-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
      .import-choice-card{display:flex;flex-direction:column;gap:9px;padding:21px;border:1px solid var(--border);border-radius:16px;background:var(--surface);color:inherit;text-decoration:none;transition:transform .18s,border-color .18s,background .18s}
      .import-choice-card:hover{transform:translateY(-2px);border-color:var(--green);background:var(--soft)}
      .import-choice-card.is-primary{border-color:var(--green);background:var(--green-light)}
      .import-choice-number{font-size:10px;letter-spacing:.12em;color:var(--muted);font-weight:700}
      .import-choice-card strong{font-size:17px}
      .import-choice-card p{font-size:12px;line-height:1.7;color:var(--muted);margin:0;min-height:62px}
      .import-choice-link{font-size:11px;color:var(--green);font-weight:700;margin-top:auto}
      .import-section{scroll-margin-top:24px}
      .import-section-heading{margin-bottom:12px}
      .import-section-heading h2{font-size:23px;margin:5px 0 7px}
      .import-section-heading p{max-width:760px;color:var(--muted);line-height:1.7;margin:0;font-size:12px}
      .import-manual-card{display:flex;align-items:center;justify-content:space-between;gap:22px;padding:22px;border:1px solid var(--border);border-radius:16px;background:var(--surface)}
      .import-manual-card h2{font-size:19px;margin:5px 0 7px}
      .import-manual-card p{margin:0;color:var(--muted);font-size:12px;line-height:1.6}
      @media(max-width:850px){.import-choice-grid{grid-template-columns:1fr}.import-choice-card p{min-height:0}.import-manual-card{align-items:flex-start;flex-direction:column}.import-manual-card>.button{width:100%}}
    `}</style>
  </>;
}
