import { useEffect, useMemo, useState } from 'react';
import { PageHeader, Stat, Panel, Button, Badge, Notice } from '../../components/ui';
import { ConnectionState } from '../../components/feedback';
import { LineChart, BarChart } from '../../components/charts';
import { Icon } from '../../components/Icon';
import { adminService } from '../../services/admin-service';
import { useResource } from '../../hooks/useResource';
import { dateTime, number } from '../../utils/formatting';
import { getFirebase } from '../../integration/firebase-client.js';

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


function TestimonialsAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [name, setName] = useState('');
  const [textValue, setTextValue] = useState('');
  const [rating, setRating] = useState(5);
  const [photoUrl, setPhotoUrl] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [genuineConsent, setGenuineConsent] = useState(false);

  async function request(path, method = 'GET', body) {
    const sdk = await getFirebase();
    const currentUser = sdk?.auth?.currentUser;
    if (!currentUser) throw new Error('Please sign in again to manage testimonials.');
    const token = await currentUser.getIdToken();
    const response = await fetch(path, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) throw new Error(payload.error || 'The testimonial request failed.');
    return payload;
  }

  async function refresh() {
    setLoading(true);
    try { const payload = await request('/api/admin/testimonials'); setItems(payload.testimonials || []); setError(''); }
    catch (e) { setError(e.message || 'Could not load testimonials.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { refresh(); }, []);

  async function act(item, action) {
    setBusyId(item.id); setError(''); setNotice('');
    try {
      await request('/api/admin/testimonials', 'POST', { action, id: item.id });
      setNotice(action === 'delete' ? 'Testimonial deleted.' : action === 'approve' ? 'Review approved and now eligible to appear publicly.' : 'Review rejected.');
      await refresh();
    } catch (e) { setError(e.message || 'That action could not be completed.'); }
    finally { setBusyId(''); }
  }

  async function addTestimonial(event) {
    event.preventDefault(); setError(''); setNotice(''); setBusyId('new');
    try {
      await request('/api/admin/testimonials', 'POST', { action: 'create', name, text: textValue, rating, photoUrl, genuineConsent });
      setName(''); setTextValue(''); setRating(5); setPhotoUrl(''); setGenuineConsent(false); setShowForm(false);
      setNotice('Testimonial published.');
      await refresh();
    } catch (e) { setError(e.message || 'The sample testimonial could not be added.'); }
    finally { setBusyId(''); }
  }

  return <section className="admin-testimonials-section">
    <div className="admin-testimonials-heading"><div><span className="eyebrow">HOMEPAGE CONTENT</span><h2>Testimonials & student reviews</h2><p>Add genuine student feedback with permission, or approve and remove submitted reviews.</p></div><div className="admin-testimonials-actions"><Button variant="outline" icon="refresh" onClick={refresh} busy={loading}>Refresh</Button><Button variant="lime" icon="plus" onClick={() => setShowForm(value => !value)}>{showForm ? 'Close form' : 'Add testimonial'}</Button></div></div>
    {error && <Notice tone="error" icon="alert">{error}</Notice>}
    {notice && <Notice tone="success" icon="check">{notice}</Notice>}
    {showForm && <form className="admin-testimonial-form" onSubmit={addTestimonial}>
      <div className="admin-testimonial-form-title"><strong>Add a student testimonial</strong><span>Only publish feedback genuinely shared by a student, with permission to display their name and photo.</span></div>
      <label>Name shown<input value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={80} required placeholder="e.g. UniPort student" /></label>
      <label>Review text<textarea value={textValue} onChange={e => setTextValue(e.target.value)} minLength={10} maxLength={1000} rows={3} required placeholder="Enter the student’s actual feedback..." /></label>
      <div className="admin-testimonial-form-row"><label>Star rating<select value={rating} onChange={e => setRating(Number(e.target.value))}>{[5,4,3,2,1].map(value => <option key={value} value={value}>{value} star{value === 1 ? '' : 's'}</option>)}</select></label><label>Photo URL (optional)<input type="url" value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="https://..." /></label></div>
      <label className="admin-testimonial-consent"><input type="checkbox" checked={genuineConsent} onChange={e => setGenuineConsent(e.target.checked)} required /> I confirm this is genuine student feedback and I have permission to publish the name and photo provided.</label><button type="submit" disabled={busyId === 'new' || !genuineConsent}>{busyId === 'new' ? 'Adding…' : 'Publish testimonial'}</button>
    </form>}
    {loading ? <p className="admin-testimonial-loading">Loading testimonials…</p> : !items.length ? <p className="admin-testimonial-loading">No testimonials to manage yet.</p> : <div className="admin-testimonial-list">{items.map(item => <article className="admin-testimonial-row" key={item.id}>
      <span className="admin-testimonial-avatar">{item.photoUrl ? <img src={item.photoUrl} alt="" loading="lazy" /> : (item.name || 'S').slice(0,1).toUpperCase()}</span>
      <div className="admin-testimonial-main"><div className="admin-testimonial-person"><strong>{item.name}</strong><span className={item.isSample ? 'is-sample' : item.status === 'approved' ? 'is-approved' : item.status === 'rejected' ? 'is-rejected' : 'is-pending'}>{item.isSample ? 'Legacy sample — hidden publicly' : (item.status || 'pending')}</span><span className="admin-testimonial-stars">{'★'.repeat(Number(item.rating) || 0)}</span></div><p>{item.text}</p><small>{item.isSample ? 'Delete this old placeholder; it is hidden from the homepage' : item.email || 'Student review'}</small></div>
      <div className="admin-testimonial-row-actions">{!item.isSample && item.status !== 'approved' && <button type="button" disabled={!!busyId} onClick={() => act(item,'approve')}>Approve</button>}{!item.isSample && item.status !== 'rejected' && <button type="button" disabled={!!busyId} onClick={() => act(item,'reject')}>Reject</button>}<button type="button" className="delete" disabled={!!busyId} onClick={() => { if (window.confirm(`Delete this ${item.isSample ? 'old placeholder' : 'student testimonial'}?`)) act(item,'delete'); }}>{busyId === item.id ? 'Working…' : 'Delete'}</button></div>
    </article>)}</div>}
  </section>;
}

export default function AdminDashboard() {
  const resource = useResource(() => adminService.getDashboard());
  const stats = resource.data?.stats || {};
  // Keep every dashboard metric and chart on the same authoritative snapshot.
  // This prevents a fast Firestore list from briefly showing an older count before
  // the Firebase Authentication count arrives.
  const students = Array.isArray(resource.data?.students) ? resource.data.students : [];
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
    cutoff.setHours(cutoff.getHours() - 24);
    return !Number.isNaN(created.getTime()) && created >= cutoff;
  }).length : Number(stats.newStudents || 0);
  const labels = [['totalStudents', 'Total students', 'users', totalStudents], ['activeStudents', 'Active students', 'user', activeStudents], ['nonActiveStudents', 'Non-active', 'alert', nonActiveStudents.length], ['newStudents', 'New students', 'plus', newStudents], ['verifiedAccounts', 'Verified accounts', 'shield', stats.verifiedAccounts || 0], ['supportRequests', 'Support requests', 'message', stats.supportRequests || 0]];
  const [detailKey, setDetailKey] = useState(null);
  const detailMeta = {
    totalStudents: { title: 'Total students', description: 'Every student account currently recognized by Firebase Authentication.', icon: 'users' },
    activeStudents: { title: 'Active students', description: 'Student accounts currently marked active.', icon: 'user' },
    nonActiveStudents: { title: 'Non-active students', description: 'Accounts that are disabled or have a non-active status.', icon: 'alert' },
    newStudents: { title: 'New students', description: 'Student accounts created within the last 24 hours.', icon: 'plus' },
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

  const chart = (title, render) => <Panel title={title}><ConnectionState resource={{ ...resource, data: students }} title={title.toLowerCase()} emptyTitle="No platform analytics yet.">{render}</ConnectionState></Panel>;
  const chartLabels = months.map(month => month.label);
  return <><PageHeader eyebrow="CGPA+ UNIPORT ADMINISTRATION" title="A clear view of the platform." description="Students, academic data, notifications and support. The operational picture, in one place." actions={<Button variant="outline" icon="refresh" busy={resource.status === 'loading'} onClick={() => resource.refresh()} aria-label={resource.status === 'loading' ? 'Refreshing overview' : 'Refresh overview'}>{resource.status === 'loading' ? 'Refreshing overview…' : 'Refresh overview'}</Button>} />{resource.error && <Notice tone="error" icon="alert">The overview could not be refreshed. {resource.error?.message || 'Check your connection and try again.'} <button type="button" className="small-link" onClick={() => resource.refresh()}>Try again</button></Notice>}<div className="stats-grid stats-three">{labels.map(([key, label, icon, value], i) => <button type="button" className={`admin-stat-trigger ${i === 0 ? 'is-accent' : ''}`} key={key} onClick={() => setDetailKey(key)} aria-label={`Open ${label.toLowerCase()} details`}><Stat label={label} value={number(value, 0)} icon={icon} accent={i === 0} hint="Click to view details" /></button>)}</div><div className="two-panel-grid">{chart('User growth', <LineChart values={analytics.userGrowth} labels={chartLabels} max={Math.max(1, ...analytics.userGrowth)} />)}{chart('Registration trends', <BarChart values={analytics.registrations} labels={chartLabels} />)}{chart('Active users', <LineChart values={analytics.activeUsers} labels={chartLabels} max={Math.max(1, ...analytics.activeUsers)} color="var(--chart-blue)" />)}</div><div className="admin-recent-grid">{[['recentStudents', 'Recent students', '/admin/students', 'user'], ['recentTickets', 'Recent support requests', '/admin/support', 'message'], ['activity', 'Recent system activity', '/admin/logs', 'shield']].map(([key, title, href, icon]) => <Panel title={title} key={key} action={<a className="small-link" href={`#${href}`}><Icon name="arrow" size={14} /></a>}><ConnectionState resource={{ ...resource, data: resource.data?.[key] }} title={title.toLowerCase()} emptyTitle="Nothing to show yet." emptyDescription="Activity will appear when supplied by the backend.">{rows => <div className="admin-activity-list">{rows.slice(0, 5).map(row => <a href={`#${href}`} key={row.id}><Icon name={icon} size={18} /><span><strong>{row.fullName || row.subject || row.action}</strong><small>{row.email || dateTime(row.createdAt)}</small></span>{row.status && <Badge>{row.status}</Badge>}</a>)}</div>}</ConnectionState></Panel>)}</div><div className="admin-non-active-panel"><Panel title={`Non-active students (${nonActiveStudents.length})`} action={<a className="small-link" href="#/admin/students">View directory <Icon name="arrow" size={14} /></a>}><ConnectionState resource={{ status: resource.status, data: nonActiveStudents, error: resource.error }} title="non-active students" emptyTitle="No non-active students." emptyDescription="When every student account is active, this section clears automatically."><div className="admin-non-active-list">{nonActiveStudents.map(row => <a className="admin-non-active-row" href="#/admin/students" key={row.id}><span className="admin-non-active-main"><strong>{row.fullName || 'Unnamed student'}</strong><small>{row.email || 'No email available'}</small><small>{row.statusReason}</small></span><Badge tone={row.accountStatus === 'suspended' ? 'danger' : 'neutral'}>{row.accountStatus || 'unknown'}</Badge></a>)}</div></ConnectionState></Panel></div><div className="admin-quick-links"><a href="#/admin/students"><Icon name="users" size={19} /><span>View student directory</span><Icon name="arrow" size={16} /></a><a href="#/admin/academic"><Icon name="book" size={19} /><span>Manage academic data</span><Icon name="arrow" size={16} /></a><a href="#/admin/notifications"><Icon name="bell" size={19} /><span>Compose an announcement</span><Icon name="arrow" size={16} /></a></div><TestimonialsAdmin />{detailKey && <div className="admin-stat-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) closeDetail(); }}>
    <section className="admin-stat-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-stat-dialog-title">
      <header className="admin-stat-dialog-header">
        <div>
          <h2 id="admin-stat-dialog-title">{activeDetail?.title || 'Details'}</h2>
          <p>{activeDetail?.description || ''}</p>
        </div>
        <button type="button" className="icon-button" onClick={closeDetail} aria-label="Close details"><Icon name="close" /></button>
      </header>
      <div className="admin-stat-dialog-body">{renderDetailRows()}</div>
    </section>
  </div>}</>;
}