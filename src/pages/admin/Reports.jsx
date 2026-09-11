import { useState } from 'react';
import { PageHeader, Panel, Button, Field, Input, Select, Badge } from '../../components/ui';
import { Modal, ActionError, useAction } from '../../components/feedback';
import { DataTable } from '../../components/table';
import { ReportPreview } from '../../components/report-preview';
import { reportService } from '../../services/report-service';
import { adminReportService } from '../../services/admin-report-service';
import { useResource } from '../../hooks/useResource';
import { downloadReportFile } from '../../utils/files';
import { dateTime, titleCase } from '../../utils/formatting';

function expiryDate(createdAt) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '--';
  date.setMonth(date.getMonth() + 1);
  return dateTime(date.toISOString());
}

export default function AdminReports() {
  const [request, setRequest] = useState({ type: 'academic', studentId: '', scope: 'admin' });
  const [preview, setPreview] = useState(null);
  const [reportId, setReportId] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const action = useAction();
  const deleteAction = useAction();
  const resource = useResource(() => reportService.getReports({ scope: 'admin' }), []);
  const change = key => e => { setRequest({ ...request, [key]: e.target.value }); setPreview(null); setReportId(null); };
  const studentReport = request.type === 'academic' || request.type === 'semester';
  const validStudentRequest = !studentReport || request.studentId.trim().length > 0;
  return <><PageHeader eyebrow="THE INFORMATION BEHIND THE DECISIONS" title="Admin report center." description="Academic and support reporting for platform administration. Reports are clearly labelled as CGPA+ documents, never official university transcripts. Saved reports are automatically removed after one month to keep the database lean." /><div className="reports-layout"><div><Panel title="Report configuration"><form className="form-stack" onSubmit={e => { e.preventDefault(); if (!validStudentRequest) return; action.run(() => reportService.getReportPreview({ ...request, reportId: null }), setPreview); }}><Field label="Report category"><Select value={request.type} onChange={change('type')}><option value="academic">Student academic report</option><option value="semester">Semester report</option><option value="platform">Platform report</option><option value="support">Support report</option></Select></Field>{studentReport && <Field label="Student Firebase ID" required hint="Enter the student's Firebase user ID. This is the document ID of their user account in Firestore."><Input value={request.studentId} onChange={change('studentId')} placeholder="Paste the student's Firebase ID" required /></Field>}<Button variant="outline" type="submit" icon="eye" busy={action.busy} disabled={!validStudentRequest}>Load preview</Button><Button type="button" icon="file" disabled={!validStudentRequest} onClick={() => setConfirm(true)}>Generate report</Button><Button type="button" variant="outline" icon="download" busy={action.busy} disabled={!validStudentRequest} onClick={() => action.run(() => reportService.downloadReport({ ...request, reportId: null }), f => downloadReportFile(f, `CGPA-${request.type}-Report.txt`))}>Download</Button><ActionError error={action.error} /></form></Panel></div><ReportPreview preview={preview} type={studentReport ? (request.type === 'academic' ? 'Student academic report' : 'Semester report') : `${titleCase(request.type)} report`} /></div><h2 className="section-mini-heading">Generated reports</h2><DataTable resource={resource} columns={[{ key: 'id', label: 'Report ID' }, { key: 'name', label: 'Report name' }, { key: 'type', label: 'Type', render: titleCase }, { key: 'status', label: 'Status', render: v => <Badge>{titleCase(v)}</Badge> }, { key: 'createdAt', label: 'Generated', render: dateTime }, { key: 'createdAt', label: 'Expires', render: expiryDate }]} onView={r => { setReportId(r.id); action.run(() => reportService.getReportPreview({ scope: 'admin', reportId: r.id }), setPreview); }} onDelete={r => setDeleteTarget(r)} emptyTitle="No reports have been loaded." /><Modal open={confirm} onClose={() => setConfirm(false)} title="Generate an admin report?"><p className="muted">The backend will authorize the requested academic or support data and create a CGPA+ report. Saved reports are kept for one month and then automatically removed.</p><ActionError error={action.error} /><div className="modal-actions"><Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button><Button busy={action.busy} onClick={() => action.run(() => reportService.generateReport(request), r => { setReportId(r.id); if (r.preview) setPreview(r.preview); setConfirm(false); resource.refresh(); }, 'Report generation request accepted.')}>Generate report</Button></div></Modal><Modal open={!!deleteTarget} onClose={() => { if (!deleteAction.busy) setDeleteTarget(null); }} title="Delete this report?"><p className="muted">This permanently removes <strong>{deleteTarget?.name || 'this report'}</strong> from the reports collection. This cannot be undone.</p><ActionError error={deleteAction.error} /><div className="modal-actions"><Button variant="outline" disabled={deleteAction.busy} onClick={() => setDeleteTarget(null)}>Cancel</Button><Button busy={deleteAction.busy} onClick={() => deleteAction.run(() => adminReportService.deleteReport(deleteTarget.id), () => { if (reportId === deleteTarget.id) { setReportId(null); setPreview(null); } setDeleteTarget(null); resource.refresh(); }, 'Report deleted.')}>Delete report</Button></div></Modal></>;
}
