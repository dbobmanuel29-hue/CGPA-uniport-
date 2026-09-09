import { useEffect, useState } from 'react';
import { PageHeader, Button, Badge, Tabs } from '../../components/ui';
import { ConnectionState, ConfirmModal, useAction } from '../../components/feedback';
import { Icon } from '../../components/Icon';
import { useResource } from '../../hooks/useResource';
import { notificationService } from '../../services/notification-service';
import { dateTime, titleCase } from '../../utils/formatting';
import { StatusFilter } from '../../components/table';

export default function Notifications() {
  const [view, setView] = useState('all');
  const [type, setType] = useState('');
  const [deleting, setDeleting] = useState(null);
  const action = useAction();
  const readFilter = view === 'all' ? undefined : view === 'read';
  const resource = useResource(() => notificationService.getNotifications({ read: readFilter, type }), [readFilter, type]);
  useEffect(() => notificationService.subscribeToNotifications(() => resource.refresh()), [resource.refresh]);
  return <><PageHeader eyebrow="A LITTLE HEADS-UP" title="Your notification center." description="Academic reminders, announcements and the updates that matter to you." actions={<Button variant="outline" icon="check" busy={action.busy} onClick={() => action.run(() => notificationService.markAllAsRead(), resource.refresh, 'Notifications marked as read.')}>Mark all as read</Button>} /><div className="notification-toolbar"><Tabs options={['all', 'unread', 'read']} value={view} onChange={setView} /><StatusFilter value={type} onChange={setType} label="All categories" options={[{ value: 'academic', label: 'Academic reminder' }, { value: 'result', label: 'Result reminder' }, { value: 'system', label: 'System notification' }, { value: 'support', label: 'Support notification' }, { value: 'announcement', label: 'Announcement' }]} /></div><div className="panel"><ConnectionState resource={resource} title="notifications" emptyTitle="A quiet inbox. A clear head." emptyDescription="No notifications match your current view.">{data => <div className="notification-list">{(data.items || data).map(n => <article key={n.id} className={`notification-item ${n.read ? 'is-read' : 'is-unread'}`}><span className="notification-symbol"><Icon name={n.type === 'support' ? 'message' : 'bell'} size={20} /></span><div><div className="notification-title"><h2>{n.title}</h2>{!n.read && <Badge tone="success" dot>Unread</Badge>}</div><p>{n.message || n.body}</p><footer><span>{titleCase(n.type)}</span><span>{dateTime(n.createdAt)}</span></footer></div><div className="row-actions">{!n.read && <button className="icon-button" title="Mark as read" aria-label={`Mark ${n.title} as read`} disabled={action.busy} onClick={() => action.run(() => notificationService.markAsRead(n.id), resource.refresh)}><Icon name="check" size={17} /></button>}<button className="icon-button" title="Delete notification" aria-label={`Delete ${n.title}`} onClick={() => setDeleting(n)}><Icon name="trash" size={16} /></button></div></article>)}</div>}</ConnectionState></div><ConfirmModal open={!!deleting} title="Delete notification?" description="This notification is only removed after the backend confirms deletion." actionLabel="Delete" dangerous onClose={() => setDeleting(null)} onConfirm={async () => { if (!deleting) return; await notificationService.deleteNotification(deleting.id); setDeleting(null); resource.refresh(); }} /></>;
}