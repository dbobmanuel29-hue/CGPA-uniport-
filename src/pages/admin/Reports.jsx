import { useState } from 'react';
import { PageHeader, Panel, Button, Field, Input, Select, Badge } from '../../components/ui';
import { ConfirmModal, Modal, ActionError, useAction } from '../../components/feedback';
import { DataTable } from '../../components/table';
import { ReportPreview } from '../../components/report-preview';
import { reportService } from '../../services/report-service';
import { adminReportService } from '../../services/admin-report-service';
import { useResource } from '../../hooks/useResource';
import { downloadReportFile } from '../../utils/files';
import { dateTime, titleCase } from '../../utils/formatting';

export default function AdminReports() {
  const [request, setRequest] = useState({ type: 'academic', studentId: '', scope: 'admin' });
  const [preview, setPreview] = useState(null);
  const [reportId, setReportId] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const previewAction = useAction();
  const generateAction = useAction();
  const downloadAction = useAction();
  const resource = useResource(() => reportService.getReports({ scope: 'admin' }), []);
  const change = key => e => { setRequest({ ...request, [key]: e.target.value }); setPreview(null); setReportId(null); };
  const studentReport = request.type === 'academic' || request.type === 'semester';
  const validStudentRequest = !studentReport || request.studentId.trim().length > 0;

  return <>
    <PageHeader eyebrow="THE INFORMATION BEHIND THE DECISIONS" title="Admin report center." description="Academic and support reporting for platform administration. Reports are clearly labelled as CGPA+ documents, never official university transcripts. Saved reports stay available until an authorized admin deletes them." />
    <div className="reports-layout">
      <div>
        <Panel title="Report configuration">
          <form className="form-stack" onSubmit={e => {
            e.preventDefault();
            if (!validStudentRequest) return;
            previewAction.run(() => reportService.getReportPreview({ ...request, reportId: null }), setPreview);
          }}>
            <Field label="Report category">
              <Select value={request.type} onChange={change('type')}>
                <option value="academic">Student academic report</option>
                <option value="semester">Semester report</option>
                <option value="platform">Platform report</option>
                <option value="support">Support report</option>
              </Select>
            </Field>
            {studentReport && <Field label="Student Firebase ID" required hint="Enter the student's Firebase user ID. This is the document ID of their user account in Firestore.">
              <Input value={request.studentId} onChange={change('studentId')} placeholder="Paste the student's Firebase ID" required />
            </Field>}
            <Button variant="outline" type="submit" icon="eye" busy={previewAction.busy} disabled={!validStudentRequest}>Load preview</Button>
            <Button type="button" icon="file" disabled={!validStudentRequest || generateAction.busy} onClick={() => setConfirm(true)}>Generate report</Button>
            <Button type="button" variant="outline" icon="download" busy={downloadAction.busy} disabled={!validStudentRequest} onClick={() => downloadAction.run(
              () => reportService.downloadReport({ ...request, reportId }),
              file => downloadReportFile(file, `CGPA-${request.type}-Report.pdf`)
            )}>Download</Button>
            <ActionError error={previewAction.error} />
            <ActionError error={generateAction.error} />
            <ActionError error={downloadAction.error} />
          </form>
        </Panel>
      </div>
      <ReportPreview preview={preview} type={studentReport ? (request.type === 'academic' ? 'Student academic report' : 'Semester report') : `${titleCase(request.type)} report`} />
    </div>
    <h2 className="section-mini-heading">Generated reports</h2>
    <DataTable
      resource={resource}
      columns={[
        { key: 'id', label: 'Report ID' },
        { key: 'name', label: 'Report name' },
        { key: 'type', label: 'Type', render: titleCase },
        { key: 'status', label: 'Status', render: v => <Badge>{titleCase(v)}</Badge> },
        { key: 'createdAt', label: 'Generated', render: dateTime },
        { key: 'retention', label: 'Retention', render: () => 'Manual deletion' },
      ]}
      onView={r => { setReportId(r.id); previewAction.run(() => reportService.getReportPreview({ scope: 'admin', reportId: r.id }), setPreview); }}
      onDelete={r => setDeleteTarget(r)}
      emptyTitle="No reports have been loaded."
    />
    <Modal open={confirm} onClose={() => { if (!generateAction.busy) setConfirm(false); }} title="Generate an admin report?">
      <p className="muted">CGPA+ will verify your admin access, generate the report from the selected data, save its history, and download the PDF. These are CGPA+ documents, not official university transcripts.</p>
      <ActionError error={generateAction.error} />
      <div className="modal-actions">
        <Button variant="outline" disabled={generateAction.busy} onClick={() => setConfirm(false)}>Cancel</Button>
        <Button busy={generateAction.busy} onClick={() => generateAction.run(async () => {
          const result = await reportService.generateReport(request);
          const file = await reportService.downloadReport({ ...request, reportId: result.id });
          downloadReportFile(file, `CGPA-${request.type}-Report.pdf`);
          return result;
        }, result => {
          setReportId(result.id);
          if (result.preview) setPreview(result.preview);
          setConfirm(false);
          resource.refresh();
        }, 'The report PDF was generated and downloaded.')}>Generate report</Button>
      </div>
    </Modal>
    <ConfirmModal
      open={!!deleteTarget}
      onClose={() => setDeleteTarget(null)}
      title="Delete saved report?"
      description={`You are about to permanently remove ${deleteTarget?.name || 'this saved report'} from CGPA+.`}
      actionLabel="Delete report"
      dangerous
      onConfirm={async () => {
        await adminReportService.deleteReport(deleteTarget.id);
        if (reportId === deleteTarget.id) { setReportId(null); setPreview(null); }
        setDeleteTarget(null);
        resource.refresh();
      }}
    >
      <div className="confirm-target">
        <strong>{deleteTarget?.name || 'Saved report'}</strong>
        <span>{deleteTarget?.type ? titleCase(deleteTarget.type) + ' report' : 'Admin report'}</span>
      </div>
    </ConfirmModal>
  </>;
}
