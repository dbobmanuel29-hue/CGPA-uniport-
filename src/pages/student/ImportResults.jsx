import { useEffect, useState } from 'react';
import { PageHeader, Button, Notice, Panel } from '../../components/ui';
import ExcelResultImporter from '../../components/ExcelResultImporter';
import { academicService } from '../../services/academic-service';

export default function ImportResults() {
  const [profile, setProfile] = useState(null);
  useEffect(() => { academicService.getProfile().then(setProfile).catch(() => {}); }, []);

  return <>
    <PageHeader
      eyebrow="ACADEMIC TOOLS"
      title="Import results from Excel."
      description="Already have your academic results saved in a spreadsheet? Bring them into CGPA+ without typing every course again."
      actions={<Button variant="outline" href="#/app/academic" endIcon="arrow">Back to academic record</Button>}
    />

    <div className="import-results-page">
      <section className="import-hero-card">
        <div className="import-hero-icon" aria-hidden="true">↥</div>
        <div>
          <span className="eyebrow">QUICK IMPORT</span>
          <h2>Move your academic history into CGPA+</h2>
          <p>Upload an Excel file, review what CGPA+ understands, then save only the results you want. Your existing academic record is not replaced.</p>
        </div>
      </section>

      <div className="import-info-grid">
        <Panel title="How it works" description="A simple three-step process.">
          <div className="import-steps">
            <div><span>1</span><div><strong>Upload</strong><p>Select your .xlsx or .xls spreadsheet.</p></div></div>
            <div><span>2</span><div><strong>Review</strong><p>CGPA+ detects course, credit, grade, level, session and semester information.</p></div></div>
            <div><span>3</span><div><strong>Save</strong><p>Confirm the preview and add the results to your academic record.</p></div></div>
          </div>
        </Panel>

        <Panel title="What happens to my existing results?" description="Your manually entered results are safe.">
          <div className="import-safe-list">
            <div><span>✓</span> Existing results stay in your account.</div>
            <div><span>✓</span> New spreadsheet results are added.</div>
            <div><span>✓</span> Matching course + session + semester entries are skipped as duplicates.</div>
            <div><span>✓</span> Nothing is deleted just because you import an Excel file.</div>
          </div>
        </Panel>
      </div>

      <Notice tone="info" icon="info">
        <strong>Tip:</strong> If your spreadsheet contains results from different semesters or sessions, include the <strong>Level</strong>, <strong>Session</strong>, and <strong>Semester</strong> columns so each result can be placed correctly.
      </Notice>

      <section className="import-upload-section" aria-label="Excel result importer">
        <ExcelResultImporter
          context={{
            levelId: profile?.currentLevelId || '',
            sessionId: profile?.currentSessionId || '',
            semesterId: profile?.currentSemesterId || ''
          }}
          onImported={() => {}}
        />
      </section>
    </div>

    <style>{`
      .import-results-page{display:grid;gap:18px;padding-bottom:32px}
      .import-hero-card{display:flex;gap:18px;align-items:flex-start;padding:24px;border:1px solid var(--border,#e5e7eb);border-radius:20px;background:linear-gradient(135deg,rgba(59,130,246,.09),rgba(99,102,241,.035));}
      .import-hero-icon{width:52px;height:52px;flex:0 0 52px;border-radius:16px;display:grid;place-items:center;background:var(--text,#111827);color:#fff;font-size:27px;font-weight:700;line-height:1}
      .import-hero-card h2{margin:5px 0 7px;font-size:22px;letter-spacing:-.02em}
      .import-hero-card p{margin:0;max-width:720px;line-height:1.65;color:var(--muted,#6b7280)}
      .import-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
      .import-steps{display:grid;gap:17px;padding:4px 0}
      .import-steps>div{display:flex;gap:12px;align-items:flex-start}
      .import-steps>div>span{width:28px;height:28px;flex:0 0 28px;border-radius:50%;display:grid;place-items:center;background:var(--surface-2,#f3f4f6);font-weight:700}
      .import-steps strong{display:block;margin-bottom:3px}
      .import-steps p{margin:0;color:var(--muted,#6b7280);font-size:14px;line-height:1.5}
      .import-safe-list{display:grid;gap:14px;padding:4px 0;color:var(--muted,#6b7280);font-size:14px;line-height:1.5}
      .import-safe-list div{display:flex;gap:9px;align-items:flex-start}
      .import-safe-list span{font-weight:800;color:var(--success,#15803d)}
      .import-upload-section{min-width:0}
      @media(max-width:760px){.import-info-grid{grid-template-columns:1fr}.import-hero-card{padding:20px}.import-hero-icon{width:46px;height:46px;flex-basis:46px}.import-hero-card h2{font-size:19px}}
    `}</style>
  </>;
}
