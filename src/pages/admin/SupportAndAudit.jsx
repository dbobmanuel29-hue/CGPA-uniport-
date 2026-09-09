import { useState } from 'react';
import { PageHeader, Button, Badge } from '../../components/ui';
import { Modal } from '../../components/feedback';
import { DataTable, SearchBox, StatusFilter } from '../../components/table';
import { TicketConversation, TICKET_STATUSES, ticketTone } from '../../components/tickets';
import { Icon } from '../../components/Icon';
import { useResource } from '../../hooks/useResource';
import { adminService } from '../../services/admin-service';
import { supportService } from '../../services/support-service';
import { date, dateTime, titleCase } from '../../utils/formatting';

export function AdminSupport() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [ticket, setTicket] = useState(null);
  const resource = useResource(() => supportService.getTickets({ status, priority, scope: 'admin' }), [status, priority]);
  const columns = [{ key: 'id', label: 'Ticket ID' }, { key: 'studentName', label: 'Student' }, { key: 'subject', label: 'Subject' }, { key: 'category', label: 'Category', render: titleCase }, { key: 'status', label: 'Status', render: s => <Badge tone={ticketTone(s)}>{titleCase(s)}</Badge> }, { key: 'priority', label: 'Priority', render: p => <Badge tone={p === 'high' ? 'warning' : 'neutral'}>{titleCase(p)}</Badge> }, { key: 'createdAt', label: 'Date', render: date }];
  return <><PageHeader eyebrow="PEOPLE FIRST" title="The support desk." description="Listen, understand and help students move forward. Every conversation in context." actions={<Button variant="outline" icon="refresh" onClick={resource.refresh}>Refresh inbox</Button>} /><div className="table-toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Search ticket, student or subject..." /><StatusFilter value={status} onChange={setStatus} options={TICKET_STATUSES.map(s => ({ value: s, label: titleCase(s) }))} /><StatusFilter value={priority} onChange={setPriority} options={['low', 'normal', 'high']} label="All priorities" /></div><DataTable resource={resource} columns={columns} search={search} emptyTitle="No support requests loaded." emptyDescription="Open a request to reply, change its status, assign an agent or add an internal note." onView={r => setTicket(r.id)} /><TicketConversation ticketId={ticket} onClose={() => setTicket(null)} admin onUpdated={resource.refresh} /></>;
}

export function AuditLogs() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [detail, setDetail] = useState(null);
  const resource = useResource(() => adminService.getAuditLogs({ status, resourceType }), [status, resourceType]);
  const columns = [{ key: 'createdAt', label: 'Timestamp', render: dateTime }, { key: 'actorName', label: 'User / admin' }, { key: 'action', label: 'Action', render: titleCase }, { key: 'resource', label: 'Resource' }, { key: 'status', label: 'Status', render: v => <Badge tone={v === 'success' ? 'success' : v === 'denied' ? 'danger' : 'neutral'}>{titleCase(v)}</Badge> }, { key: 'ipAddress', label: 'IP address' }, { key: 'device', label: 'Device' }];
  return <><PageHeader eyebrow="ACCOUNTABILITY, BY DESIGN" title="The audit trail." description="A read-only view of privileged activity recorded by the backend. No browser-generated audit events." actions={<Button variant="outline" icon="refresh" onClick={resource.refresh}>Refresh logs</Button>} /><div className="table-toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Search actor, action or resource..." /><StatusFilter value={status} onChange={setStatus} options={['success', 'denied', 'failed']} /><StatusFilter value={resourceType} onChange={setResourceType} options={['student', 'academic', 'support', 'notification', 'settings']} label="All resources" /></div><DataTable resource={resource} columns={columns} search={search} onView={setDetail} emptyTitle="No audit logs loaded." emptyDescription="Actor, action, resource and device details must be supplied by the secure audit service." /><Modal open={!!detail} onClose={() => setDetail(null)} title="Audit event details" wide><dl className="detail-grid">{[...columns, { key: 'id', label: 'Event ID' }, { key: 'resourceId', label: 'Resource ID' }, { key: 'description', label: 'Details' }].map(c => <div key={c.key}><dt>{c.label}</dt><dd>{String(detail?.[c.key] ?? '--')}</dd></div>)}</dl></Modal></>;
}