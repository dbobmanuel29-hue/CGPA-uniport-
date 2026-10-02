import { useMemo, useState } from 'react';
import { PageHeader, Stat, Panel, Button, Badge } from '../../components/ui';
import { ConnectionState, Modal } from '../../components/feedback';
import { LineChart, BarChart } from '../../components/charts';
import { Icon } from '../../components/Icon';
import { adminService } from '../../services/admin-service';
import { useResource } from '../../hooks/useResource';
import { dateTime, number } from '../../utils/formatting';

const monthKey = value => {
  const d = new Date(value || 0);
  return Number.isNaN(d.getTime()) ? null : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const monthLabel = key => {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleString(undefined, { month: 'short' });
};
const lastSixMonths = () => {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleString(undefined, { month: 'short' }) };
  });
};

export default function AdminDashboard() {
  const resource = useResource(() => adminService.getDashboard());
  const studentsResource = useResource(() => adminService.getStudents({}));
  const stats = resource.data?.stats || {};
  const dashboardStudents = Array.isArray(resource.data?.students) ? resource.data.students : [];
  const students = dashboardStudents.length ? dashboardStudents : (Array.isArray(studentsResource.data) ? studentsResource.data : studentsResource.data?.items || []);
  const months = useMemo(() => lastSixMonths(), []);
  const analytics = useMemo(() => {
    const registrations = months.map(month => students.filter(student => monthKey(student.createdAt) === month.key).length);
    const userGrowth = [];
    let cumulative = 0;
    months.forEach((month) => {
      cumulative = students.filter(student => {
        const key = monthKey(student.createdAt);
        return key && key <= month.key;
      }).length;
      userGrowth.push(cumulative);
    });
    const activeUsers = months.map(month => students.filter(student => {
      const key = monthKey(student.createdAt);
      return student.accountStatus === 'active' && key && key <= month.key;
    }).length);
    return { registrations, userGrowth, activeUsers };
  }, [students, months]);
  // The dashboard still uses the authoritative Firebase Authentication count
  // when it arrives. While that slower verification request is running, show
  // the already-loaded Firestore student directory count instead of leaving
  // the card blank. This makes the Total students card appear much sooner.
  const totalStudents = Number(stats.totalStudents ?? (students.length || 0));
  const activeStudents = students.length ? students.filter(student => student.accountStatus === 'active').length : Number(stats.activeStudents || 0);
  const nonActiveStudents = students.filter(student => student.accountStatus !== 'active');
  const newStudents = students.length ? students.filter(student => {
    const created = new Date(student.createdAt || 0);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return !Number.isNaN(created.getTime()) && created >= cutoff;
  }).length : Number(stats.newStudents || 0);
  const labels = [['totalStudents', 'Total students', 'users', totalStudents], ['activeStudents', 'Active students', 'user', activeStudents], ['nonActiveStudents', 'Non-active', 'alert', nonActiveStudents.length], ['newStudents', 'New students', 'plus', newStudents], ['verifiedAccounts', 'Verified accounts', 'shield', stats.verifiedAccounts || 0], ['supportRequests', 'Support requests', 'message', stats.supportRequests || 0]];
  const [detailKey, setDetailKey] = useState(null);
  const detailMeta = {
    totalStudents: { title: 'Total students', description: 'Every student account currently recognized by Firebase Authentication.', icon: 'users' },
    activeStudents: { title: 'Active students', description: 'Student accounts currently marked active.', icon: 'user' },
    nonActiveStudents: { title: 'Non-active students', description: 'Accounts that are disabled or have a non-active status.', icon: 'alert' },
    newStudents: { title: 'New students', description: 'Student accounts created within the last 30 days.', icon: 'plus' },
    verifiedAccounts: { title: 'Verified accounts', description: 'Student accounts whose Firebase Authentication email is verified.', icon: 'shield' },
    supportRequests: { title: 'Support requests', description: 'Support tickets currently open or in progress.', icon: 'message' },
  };
  const detailRows = useMemo(() => {
    if (!detailKey) return [];
    if (detailKey === 'supportRequests') return resource.data?.supportRequests || [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return students.filter(student => {
      if (detailKey === 'activeStudents') return student.accountStatus === 'active';
      if (detailKey === 'nonActiveStudents') return student.accountStatus !== 'active';
      if (detailKey === 'newStudents') {
        const created = new Date(student.createdAt || 0);
        return !Number.isNaN(created.getTime()) && created >= cutoff;
      }
      if (detailKey === 'verifiedAccounts') return student.emailVerified === true;
      return true;
    }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [detailKey, resource.data?.supportRequests, students]);
  const activeDetail = detailKey ? detailMeta[detailKey] : null;
  const closeDetail = () => setDetailKey(null);
  const renderDetailRows = () => detailRows.length ? <div className="admin-stat-detail-list">{detailRows.map(row => {
    const support = detailKey === 'supportRequests';
    return <div className="admin-stat-detail-row" key={row.id}>
      <span className="admin-stat-detail-icon"><Icon name={activeDetail.icon} size={17} /></span>
      <span className="admin-stat-detail-main">
        <strong>{row.fullName || row.subject || row.action || 'Unnamed student'}</strong>
        <small>{row.email || row.requesterEmail || dateTime(row.createdAt)}</small>
        <small>{support ? (row.message || row.category || 'Support request') : (row.statusReason || row.accountStatus || (row.emailVerified ? 'Verified account' : 'Student account'))}</small>
      </span>
      {row.status && <Badge tone={row.status === 'open' ? 'warning' : 'neutral'}>{row.status.replace('_', ' ')}</Badge>}
      {!support && <Badge tone={row.accountStatus === 'active' ? 'success' : row.accountStatus === 'suspended' ? 'danger' : 'neutral'}>{row.emailVerified ? 'Verified' : row.accountStatus || 'Unverified'}</Badge>}
    </div>;
  })}</div> : <div className="admin-stat-detail-empty"><span className="empty-icon"><Icon name={activeDetail.icon} size={22} /></span><strong>No records to show</strong><p>This count is currently zero.</p></div>;

  const chart = (title, render) => <Panel title={title}><ConnectionState resource={studentsResource.status === 'loading' ? studentsResource : { ...studentsResource, status: students.length ? 'success' : studentsResource.status }} title={title.toLowerCase()} emptyTitle="No platform analytics yet.">{render}</ConnectionState></Panel>;
  const chartLabels = months.map(month => month.label);
  return <><PageHeader eyebrow="CGPA+ UNIPORT ADMINISTRATION" title="A clear view of the platform." description="Students, academic data, notifications and support. The operational picture, in one place." actions={<Button variant="outline" icon="refresh" onClick={() => { resource.refresh(); studentsResource.refresh(); }}>Refresh overview</Button>} /><div className="stats-grid stats-three">{labels.map(([key, label, icon, value], i) => <button type="button" className={`admin-stat-trigger ${i === 0 ? 'is-accent' : ''}`} key={key} onClick={() => setDetailKey(key)} aria-label={`Open ${label.toLowerCase()} details`}><Stat label={label} value={number(value, 0)} icon={icon} accent={i === 0} hint="Click to view details" /></button>)}</div><div className="two-panel-grid">{chart('User growth', <LineChart values={analytics.userGrowth} labels={chartLabels} max={Math.max(1, ...analytics.userGrowth)} />)}{chart('Registration trends', <BarChart values={analytics.registrations} labels={chartLabels} />)}{chart('Active users', <LineChart values={analytics.activeUsers} labels={chartLabels} max={Math.max(1, ...analytics.activeUsers)} color="var(--chart-blue)" />)}</div><div className="admin-recent-grid">{[['recentStudents', 'Recent students', '/admin/students', 'user'], ['recentTickets', 'Recent support requests', '/admin/support', 'message'], ['activity', 'Recent system activity', '/admin/logs', 'shield']].map(([key, title, href, icon]) => <Panel title={title} key={key} action={<a className="small-link" href={`#${href}`}><Icon name="arrow" size={14} /></a>}><ConnectionState resource={{ ...resource, data: resource.data?.[key] }} title={title.toLowerCase()} emptyTitle="Nothing to show yet." emptyDescription="Activity will appear when supplied by the backend.">{rows => <div className="admin-activity-list">{rows.slice(0, 5).map(row => <a href={`#${href}`} key={row.id}><Icon name={icon} size={18} /><span><strong>{row.fullName || row.subject || row.action}</strong><small>{row.email || dateTime(row.createdAt)}</small></span>{row.status && <Badge>{row.status}</Badge>}</a>)}</div>}</ConnectionState></Panel>)}</div><div className="admin-non-active-panel"><Panel title={`Non-active students (${nonActiveStudents.length})`} action={<a className="small-link" href="#/admin/students">View directory <Icon name="arrow" size={14} /></a>}><ConnectionState resource={{ ...studentsResource, status: studentsResource.status === 'loading' ? 'loading' : studentsResource.status === 'error' ? 'error' : 'success', data: nonActiveStudents }} title="non-active students" emptyTitle="No non-active students." emptyDescription="When every student account is active, this section clears automatically."><div className="admin-non-active-list">{nonActiveStudents.map(row => <a className="admin-non-active-row" href="#/admin/students" key={row.id}><span className="admin-non-active-main"><strong>{row.fullName || 'Unnamed student'}</strong><small>{row.email || 'No email available'}</small><small>{row.statusReason}</small></span><Badge tone={row.accountStatus === 'suspended' ? 'danger' : 'neutral'}>{row.accountStatus || 'unknown'}</Badge></a>)}</div></ConnectionState></Panel></div><div className="admin-quick-links"><a href="#/admin/students"><Icon name="users" size={19} /><span>View student directory</span><Icon name="arrow" size={16} /></a><a href="#/admin/academic"><Icon name="book" size={19} /><span>Manage academic data</span><Icon name="arrow" size={16} /></a><a href="#/admin/notifications"><Icon name="bell" size={19} /><span>Compose an announcement</span><Icon name="arrow" size={16} /></a></div><Modal open={!!detailKey} onClose={closeDetail} title={activeDetail?.title || 'Details'} description={activeDetail?.description} wide>{renderDetailRows()}</Modal></>;
}