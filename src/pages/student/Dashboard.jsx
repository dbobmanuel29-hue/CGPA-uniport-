import { useEffect, useMemo } from 'react';
import { PageHeader, Button, Badge, Panel, Stat } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { ConnectionState, EmptyState, Skeleton } from '../../components/feedback';
import { LineChart, Progress } from '../../components/charts';
import { useResource } from '../../hooks/useResource';
import { academicService } from '../../services/academic-service';
import { notificationService } from '../../services/notification-service';
import { number, date } from '../../utils/formatting';
import { FALLBACK_LEVELS, FALLBACK_SEMESTERS, FALLBACK_SESSIONS, findFallback } from '../../data/uniport-catalogue';

export default function Dashboard() {
  const resource = useResource(() => academicService.getDashboard());
  const profileResource = useResource(() => academicService.getProfile());
  const resultsResource = useResource(() => academicService.getResults());
  const policyResource = useResource(() => academicService.getGradingRules());
  const graduationResource = useResource(() => academicService.getGraduationProgress());
  const data = resource.data || {};
  const summary = data.summary || {};
  const profile = profileResource.data || null;
  const results = resultsResource.data || [];
  const policy = policyResource.data || {};
  const graduation = graduationResource.data || {};

  useEffect(() => {
    let unsubscribe;
    notificationService.subscribeToNotifications(() => resource.refresh()).then(stop => { unsubscribe = stop; }).catch(() => {});
    return () => unsubscribe?.();
  }, [resource.refresh]);

  const classification = useMemo(() => {
    const rules = Array.isArray(policy.classifications) ? [...policy.classifications].sort((a, b) => b.min - a.min) : [];
    return rules.find(rule => Number(summary.cgpa || 0) >= Number(rule.min))?.label || '';
  }, [policy.classifications, summary.cgpa]);

  const semesterStats = useMemo(() => {
    const groups = new Map();
    results.forEach(result => {
      const key = `${result.sessionId || 'session'}:${result.semesterId || result.semesterName || 'semester'}`;
      if (!groups.has(key)) groups.set(key, { key, label: result.semesterName || result.semesterId || 'Semester', sessionName: result.sessionName || '--', rows: [], firstDate: result.createdAt || '' });
      groups.get(key).rows.push(result);
      if (result.createdAt && (!groups.get(key).firstDate || result.createdAt < groups.get(key).firstDate)) groups.get(key).firstDate = result.createdAt;
    });
    return [...groups.values()].sort((a, b) => String(a.firstDate).localeCompare(String(b.firstDate))).map(group => {
      const credits = group.rows.reduce((sum, row) => sum + Number(row.credits || 0), 0);
      const qualityPoints = group.rows.reduce((sum, row) => sum + Number(row.qualityPoints ?? Number(row.credits || 0) * Number(row.points || 0)), 0);
      return { ...group, gpa: credits ? qualityPoints / credits : 0, credits };
    });
  }, [results]);

  const currentSemester = useMemo(() => {
    const fallback = {
      name: profile?.currentSemesterName || findFallback(FALLBACK_SEMESTERS, profile?.currentSemesterId)?.name || '--',
      sessionName: profile?.currentSessionName || findFallback(FALLBACK_SESSIONS, profile?.currentSessionId)?.name || '--',
      levelName: profile?.currentLevelName || findFallback(FALLBACK_LEVELS, profile?.currentLevelId)?.name || '--'
    };
    const currentRows = results.filter(result =>
      (!profile?.currentSemesterId || result.semesterId === profile.currentSemesterId) &&
      (!profile?.currentSessionId || result.sessionId === profile.currentSessionId)
    );
    const credits = currentRows.reduce((sum, row) => sum + Number(row.credits || 0), 0);
    const qualityPoints = currentRows.reduce((sum, row) => sum + Number(row.qualityPoints ?? Number(row.credits || 0) * Number(row.points || 0)), 0);
    return {
      ...fallback,
      courseCount: currentRows.length,
      gpa: credits ? qualityPoints / credits : 0
    };
  }, [profile, results]);

  const actions = [['plus', 'Add result', '/app/academic?add=1'], ['book', 'My courses', '/app/academic'], ['calculator', 'Calculate GPA', '/app/calculator'], ['bars', 'Analytics', '/app/analytics'], ['target', 'Target CGPA', '/app/target'], ['file', 'Generate report', '/app/reports'], ['help', 'Contact support', '/app/support']];
  const hasAcademicProfile = Boolean(profile?.programmeId || profile?.facultyId);
  const hasResults = results.length > 0 || Boolean(summary.totalCredits);
  const dashboardLoading = resource.status === 'loading' || profileResource.status === 'loading' || resultsResource.status === 'loading';
  const progressPercent = graduation.percent ?? data.academicProgress?.percent ?? null;
  const completedCredits = graduation.completedCredits ?? data.academicProgress?.completedCredits ?? summary.totalCredits ?? 0;
  const remainingCredits = graduation.remainingCredits ?? data.academicProgress?.remainingCredits ?? null;
  const gpaMax = summary.maxPoint || policy.maxPoint || 5;

  return <>
    <PageHeader eyebrow="YOUR UNIPORT ACADEMIC WORKSPACE" title="Welcome back, Student." description="Track your courses, enter your results, and see your GPA and CGPA update as your academic journey grows." actions={<Button href="#/app/academic?add=1" icon="plus">Add a result</Button>} />
    {dashboardLoading ? <Skeleton label="Loading your academic workspace..." rows={3} /> : null}
    {resource.error ? <ConnectionState resource={resource} title="academic workspace" compact /> : null}
    {!resource.error && resource.status !== 'loading' && !hasAcademicProfile ? <Panel title="Set up your academic profile" description="Start here if this is your first time. Select your faculty, department, programme, admission session, current level, current session and semester. These details tell CGPA+ where each result belongs."><Button href="#/onboarding" endIcon="arrow">Set up my profile</Button></Panel> : null}
    <div className="stats-grid"><Stat label="Current CGPA" value={number(summary.cgpa)} suffix={gpaMax ? `/ ${gpaMax}` : '/ 5'} icon="chart" accent hint={classification || summary.classification || 'Add results to calculate your CGPA'} /><Stat label="Current semester GPA" value={number(currentSemester.gpa)} icon="calculator" hint="Calculated from results in your current semester" /><Stat label="Total credit units" value={number(summary.totalCredits, 0)} icon="book" hint="Credit units from your academic record" /><Stat label="Quality points" value={number(summary.qualityPoints)} icon="spark" hint="Credits multiplied by grade points" /></div>
    <div className="dashboard-grid"><Panel title="Your GPA, over time" description="See how your semester performance changes.">{semesterStats.length ? <LineChart values={semesterStats.map(v => v.gpa)} labels={semesterStats.map(v => v.label)} max={gpaMax} /> : <EmptyState compact icon="chart" title="Your GPA trend starts here." description="Save your first semester result to see your performance over time." action={<Button variant="outline" className="button-small" href="#/app/academic?add=1">Add a result</Button>} />}</Panel><Panel title="Your current semester" action={<Badge tone={hasAcademicProfile ? 'success' : 'neutral'}>{currentSemester.name || 'Not configured'}</Badge>}><dl className="semester-details"><div><dt>Academic session</dt><dd>{currentSemester.sessionName || '--'}</dd></div><div><dt>Current level</dt><dd>{currentSemester.levelName || '--'}</dd></div><div><dt>Current semester</dt><dd>{currentSemester.name || '--'}</dd></div><div><dt>Courses with results</dt><dd>{currentSemester.courseCount ?? '--'}</dd></div><div><dt>Semester GPA</dt><dd>{number(currentSemester.gpa)}</dd></div></dl><a className="small-link" href="#/app/academic">Manage my courses and results<Icon name="arrow" size={14} /></a></Panel><Panel title="Academic progress" description="Your saved results determine your completed credit units."><Progress value={progressPercent} label="Credit progress" /><div className="credit-summary"><div><strong>{completedCredits}</strong><span>Completed credits</span></div><div><strong>{remainingCredits == null ? '--' : remainingCredits}</strong><span>Remaining credits</span></div></div><a className="small-link" href="#/app/graduation">View graduation plan<Icon name="arrow" size={14} /></a></Panel><Panel title="The bigger picture" description="Keep an eye on your goal and classification."><div className="progress-cgpa"><strong>{number(summary.cgpa)}</strong><span>Current CGPA</span></div><Progress value={gpaMax ? (Number(summary.cgpa || 0) / gpaMax) * 100 : null} label={classification || summary.classification || 'Academic classification pending'} /><div className="target-placeholder"><Icon name="target" size={18} /><div><strong>Have a CGPA goal?</strong><a href="#/app/target">Set a target CGPA<Icon name="arrow" size={13} /></a></div></div></Panel></div>
    <div className="dashboard-bottom"><Panel title="Recent results" action={<a className="small-link" href="#/app/academic">View all<Icon name="arrow" size={13} /></a>}>{hasResults && data.recentResults?.length ? <div className="table-scroll"><table><thead><tr><th>Course</th><th>Credit units</th><th>Grade</th><th>Session</th></tr></thead><tbody>{data.recentResults.map(r => <tr key={r.id}><td><strong>{r.code}</strong><small className="table-subtitle">{r.title}</small></td><td>{r.credits}</td><td><Badge>{r.grade}</Badge></td><td>{r.sessionName || '--'}</td></tr>)}</tbody></table></div> : <EmptyState compact icon="book" title="No results yet" description="Add your semester results here. CGPA+ will calculate your GPA and CGPA automatically." action={<Button variant="outline" className="button-small" href="#/app/academic?add=1">Add your first result</Button>} />}</Panel><Panel title="Need help with your academics?" description="If something is wrong with your results, profile, calculation, account or anything else, contact the CGPA+ support team directly. You can create a request and continue the conversation from your dashboard support area." action={<Button href="#/app/support" icon="help">Contact support</Button>}><div className="recent-notification"><Icon name="help" size={18} /><div><strong>We're here to help.</strong><p>Report an issue, explain what happened, and track our response from your support inbox.</p></div></div></Panel><Panel title="Your notifications" action={<a className="small-link" href="#/app/notifications">Open inbox<Icon name="arrow" size={13} /></a>}>{data.notifications?.length ? data.notifications.map(n => <div className="recent-notification" key={n.id}><Icon name="bell" size={16} /><div><strong>{n.title}</strong><p>{n.message}</p><small>{date(n.createdAt)}</small></div></div>) : <EmptyState compact icon="bell" title="No new notifications" description="Important reminders and announcements will appear here." />}</Panel></div>
    <section className="quick-actions-section"><h2>What would you like to do?</h2><div className="quick-actions">{actions.map(([icon, label, href]) => <a href={`#${href}`} key={label}><span><Icon name={icon} size={18} /></span>{label}<Icon name="diagonal" size={13} /></a>)}</div></section>
  </>;
}
