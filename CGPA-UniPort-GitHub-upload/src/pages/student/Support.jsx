import { useState } from 'react';
import { PageHeader, Button, Badge, Notice } from '../../components/ui';
import { DataTable, SearchBox, StatusFilter } from '../../components/table';
import { NewTicket, TicketConversation, TICKET_STATUSES, ticketTone } from '../../components/tickets';
import { supportService } from '../../services/support-service';
import { useResource } from '../../hooks/useResource';
import { date, titleCase } from '../../utils/formatting';

export default function Support() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [ticket, setTicket] = useState(null);
  const resource = useResource(() => supportService.getTickets({ status, scope: 'student' }), [status]);
  const columns = [{ key: 'id', label: 'Request ID' }, { key: 'subject', label: 'Subject' }, { key: 'category', label: 'Category', render: titleCase }, { key: 'status', label: 'Status', render: s => <Badge tone={ticketTone(s)}>{titleCase(s)}</Badge> }, { key: 'priority', label: 'Priority', render: titleCase }, { key: 'createdAt', label: 'Created', render: date }];
  return <><PageHeader eyebrow="YOU DON'T HAVE TO FIGURE IT OUT ALONE" title="How can we help?" description="Raise a request, follow its progress and keep the conversation in one place." actions={<Button icon="plus" onClick={() => setOpen(true)}>New support request</Button>} /><div className="table-toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Search your requests..." /><StatusFilter value={status} onChange={setStatus} options={TICKET_STATUSES.map(s => ({ value: s, label: titleCase(s) }))} /></div><DataTable columns={columns} resource={resource} search={search} emptyTitle="No support requests yet." emptyDescription="When you submit a request through the connected service, you can follow it here." onView={r => setTicket(r.id)} /><Notice icon="help">Looking for a quick answer? <a href="#/support">Explore the help center and frequently asked questions.</a></Notice><NewTicket open={open} onClose={() => setOpen(false)} onCreated={resource.refresh} /><TicketConversation ticketId={ticket} onClose={() => setTicket(null)} onUpdated={resource.refresh} /></>;
}