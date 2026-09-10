import { Component, lazy, Suspense, useEffect } from 'react';
import { PublicLayout, WorkspaceLayout } from './components/navigation';
import { ToastProvider, EmptyState, Skeleton } from './components/feedback';
import { Button } from './components/ui';
import { AppearanceProvider } from './state/appearance';
import { SessionProvider } from './state/session';
import { CalculatorProvider } from './state/calculator';
import { useHashRoute, navigate } from './utils/routing';
import { useSession } from './state/session';
import { useRevealObserver, useScrollProgress } from './hooks/useReveal';
import Home from './pages/public/Home';
import LegalPage from './pages/public/LegalPage';
import { CookiePolicy, ThankYou } from './pages/public/CompliancePages';
import CookieConsent from './components/CookieConsent';
import ExcelResultImporter from './components/ExcelResultImporter';

const loadNamed = (loader, name) => lazy(() => loader().then(module => ({ default: module[name] })));
const publicPages = () => import('./pages/public/Pages');
const calculators = () => import('./pages/student/Calculators');
const journeys = () => import('./pages/student/Journey');
const adminSupportAndAudit = () => import('./pages/admin/SupportAndAudit');
const About = loadNamed(publicPages, 'About');
const Features = loadNamed(publicPages, 'Features');
const HowItWorks = loadNamed(publicPages, 'HowItWorks');
const PublicSupport = lazy(() => import('./pages/public/PublicSupport'));
const Auth = lazy(() => import('./pages/auth/Auth'));
const Onboarding = lazy(() => import('./pages/onboarding/Onboarding'));
const Dashboard = lazy(() => import('./pages/student/Dashboard'));
const Academic = lazy(() => import('./pages/student/Academic'));
const ImportResults = lazy(() => import('./pages/student/ImportResults'));
const Gpa = loadNamed(calculators, 'GpaCalculator');
const Cgpa = loadNamed(calculators, 'CgpaCalculator');
const Target = loadNamed(calculators, 'TargetCalculator');
const Projection = loadNamed(calculators, 'ProjectionCalculator');
const Analytics = lazy(() => import('./pages/student/Analytics'));
const Timeline = loadNamed(journeys, 'Timeline');
const Graduation = loadNamed(journeys, 'Graduation');
const CourseAttention = loadNamed(journeys, 'CourseAttention');
const Reports = lazy(() => import('./pages/student/Reports'));
const Notifications = lazy(() => import('./pages/student/Notifications'));
const Support = lazy(() => import('./pages/student/Support'));
const Profile = lazy(() => import('./pages/student/Profile'));
const Settings = lazy(() => import('./pages/student/Settings'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminStudents = lazy(() => import('./pages/admin/Students'));
const AdminAcademic = lazy(() => import('./pages/admin/AcademicData'));
const AcademicCrud = loadNamed(() => import('./pages/admin/AcademicData'), 'AcademicCrud');
const AdminNotifications = lazy(() => import('./pages/admin/Notifications'));
const AdminSupport = loadNamed(adminSupportAndAudit, 'AdminSupport');
const AdminReports = lazy(() => import('./pages/admin/Reports'));
const AuditLogs = loadNamed(adminSupportAndAudit, 'AuditLogs');
const AdminSettings = lazy(() => import('./pages/admin/Settings'));

const PUBLIC_CALCULATORS = new Set(['/app/calculator', '/app/cgpa', '/app/target', '/app/projection']);
const ROUTES = {
  '/': { title: 'CGPA+ UniPort | GPA & CGPA Calculator for UniPort Students', element: <Home /> }, '/about': { title: 'About CGPA+ UniPort', element: <About /> }, '/features': { title: 'Features', element: <Features /> }, '/how-it-works': { title: 'How CGPA+ works', element: <HowItWorks /> }, '/support': { title: 'Help center', element: <PublicSupport /> }, '/terms': { title: 'Terms of service', element: <LegalPage type="terms" /> }, '/privacy': { title: 'Privacy policy', element: <LegalPage type="privacy" /> }, '/cookies': { title: 'Cookie policy', element: <CookiePolicy /> }, '/thank-you': { title: 'Thank you', element: <ThankYou /> }, '/login': { title: 'Sign in', element: <Auth mode="login" /> }, '/register': { title: 'Create account', element: <Auth mode="register" /> }, '/forgot-password': { title: 'Reset password', element: <Auth mode="forgot-password" /> }, '/onboarding': { title: 'Your UniPort profile', element: <Onboarding /> }, '/app': { title: 'Your workspace', element: <Dashboard /> }, '/app/academic': { title: 'Academic record', element: <Academic /> }, '/app/import': { title: 'Import academic results', element: <ImportResults /> }, '/app/calculator': { title: 'GPA calculator', element: <Gpa /> }, '/app/cgpa': { title: 'CGPA calculator', element: <Cgpa /> }, '/app/target': { title: 'Target CGPA calculator', element: <Target /> }, '/app/projection': { title: 'CGPA projection calculator', element: <Projection /> }, '/app/analytics': { title: 'Academic analytics', element: <Analytics /> }, '/app/timeline': { title: 'Academic timeline', element: <Timeline /> }, '/app/graduation': { title: 'Graduation planning', element: <Graduation /> }, '/app/failed': { title: 'Course attention', element: <CourseAttention /> }, '/app/reports': { title: 'Academic reports', element: <Reports /> }, '/app/notifications': { title: 'Notifications', element: <Notifications /> }, '/app/support': { title: 'Support requests', element: <Support /> }, '/app/profile': { title: 'Your profile', element: <Profile /> }, '/app/settings': { title: 'Settings', element: <Settings /> }, '/admin': { title: 'Admin dashboard', element: <AdminDashboard /> }, '/admin/students': { title: 'Student directory', element: <AdminStudents /> }, '/admin/academic': { title: 'Academic data', element: <AdminAcademic /> }, '/admin/faculties': { title: 'Faculties', element: <AcademicCrud entity="faculties" /> }, '/admin/departments': { title: 'Departments', element: <AcademicCrud entity="departments" /> }, '/admin/programmes': { title: 'Programmes', element: <AcademicCrud entity="programmes" /> }, '/admin/courses': { title: 'Courses', element: <AcademicCrud entity="courses" /> }, '/admin/notifications': { title: 'Admin notifications', element: <AdminNotifications /> }, '/admin/support': { title: 'Support desk', element: <AdminSupport /> }, '/admin/reports': { title: 'Admin reports', element: <AdminReports /> }, '/admin/logs': { title: 'Audit trail', element: <AuditLogs /> }, '/admin/settings': { title: 'Admin settings', element: <AdminSettings /> },
};

function CreatorShowcase() {
  return <>
    <style>{` .cgpa-creator{padding:88px 20px;background:#0d1110;color:#fff}.cgpa-creator-inner{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1.35fr) minmax(280px,.65fr);gap:56px;align-items:center}.cgpa-creator-eyebrow{font-size:12px;letter-spacing:.16em;text-transform:uppercase;opacity:.65;margin:0 0 16px}.cgpa-creator h2{font-size:clamp(32px,5vw,58px);line-height:1.02;margin:0 0 22px;letter-spacing:-.04em}.cgpa-creator h2 span{opacity:.62}.cgpa-creator p{font-size:17px;line-height:1.75;max-width:720px;color:rgba(255,255,255,.72);margin:0 0 18px}.cgpa-creator-story{border-left:2px solid rgba(255,255,255,.2);padding-left:22px}.cgpa-creator-story strong{display:block;font-size:20px;margin-bottom:8px}.cgpa-creator-story span{display:block;color:rgba(255,255,255,.6);line-height:1.6}.cgpa-creator-card{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.045);border-radius:24px;padding:30px;box-shadow:0 20px 60px rgba(0,0,0,.2)}.cgpa-creator-card .name{font-size:28px;font-weight:700;margin-bottom:6px}.cgpa-creator-card .role{color:rgba(255,255,255,.6);margin-bottom:22px}.cgpa-creator-card .label{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:8px}.cgpa-creator-link{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:13px 18px;border-radius:999px;background:#d7ff3f;color:#10130d;text-decoration:none;font-weight:700;margin-top:8px}@media(max-width:760px){.cgpa-creator{padding:64px 18px}.cgpa-creator-inner{grid-template-columns:1fr;gap:34px}.cgpa-creator p{font-size:16px}.cgpa-creator-story{padding-left:16px}.cgpa-creator-card{padding:24px}} `}</style>
    <section className="cgpa-creator" aria-labelledby="cgpa-creator-title"><div className="cgpa-creator-inner"><div><p className="cgpa-creator-eyebrow">The story behind CGPA+</p><h2 id="cgpa-creator-title">Built by a student.<br /><span>For UniPort students.</span></h2><p>I'm <strong>Bobmanuel</strong>, a Computer Science student at the University of Port Harcourt. I built CGPA+ because I experienced the problem myself: students needed a simple way to calculate and understand their GPA and CGPA, while the school's website did not provide that calculation experience.</p><p>So instead of waiting for someone else to solve it, I built a platform for UniPort students to calculate, track and plan their academic journey.</p><div className="cgpa-creator-story"><strong>CGPA+ is a student-built solution to a student problem.</strong><span>It is an independent project and is not an official University of Port Harcourt website.</span></div></div><aside className="cgpa-creator-card"><div className="name">Bobmanuel</div><div className="role">Full Stack Web Developer • Computer Science Student</div><div className="label">Need a website or digital product?</div><p>I also build websites and digital products for people and businesses.</p><a className="cgpa-creator-link" href="https://bobmanuel.name.ng/" target="_blank" rel="noreferrer">View my portfolio →</a></aside></div></section>
  </>;
}

class PageBoundary extends Component { state = { error: false }; static getDerivedStateFromError() { return { error: true }; } render() { if (this.state.error) return <EmptyState title="Something interrupted this page." description="Your records have not been changed. Please try again." icon="alert" action={<Button onClick={() => window.location.hash = '#/'}>Return home</Button>} />; return this.props.children; } }
function ReadingProgress() { const progress = useScrollProgress(); return <div className="read-progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>; }
function Router() {
  const path = useHashRoute(); const session = useSession(); const route = ROUTES[path]; const publicCalculator = PUBLIC_CALCULATORS.has(path); const studentProtected = path === '/app' || (path.startsWith('/app/') && !publicCalculator); const restricted = studentProtected || path.startsWith('/admin') || path === '/onboarding';
  useEffect(() => { if (session.status === 'loading') return; if (restricted) { if (!session.user) { navigate('/login'); return; } if (path.startsWith('/admin') && session.user.role !== 'admin') navigate('/app'); } }, [path, session.user, session.status, restricted]);
  useRevealObserver();
  useEffect(() => { document.title = path === '/' ? 'CGPA+ UniPort | GPA & CGPA Calculator for UniPort Students' : `${route?.title || 'Page not found'} | CGPA+ UniPort`; }, [path, route]);
  if (restricted && session.status === 'loading') return <div className="route-loading"><Skeleton label="Checking your session..." rows={4} /></div>;
  const page = <PageBoundary key={path}><Suspense fallback={<div className="route-loading"><Skeleton label="Loading your next page..." rows={5} /></div>}>{route?.element || <div className="not-found"><span className="eyebrow">404 / PAGE NOT FOUND</span><h1 tabIndex={-1} data-page-heading>Let's get you back on track.</h1><p>The page you requested does not exist in CGPA+ UniPort.</p><div className="form-actions"><Button href="#/" endIcon="arrow">Return home</Button><Button variant="outline" href="#/support">Visit help center</Button></div></div>}</Suspense></PageBoundary>;
  if (path === '/app' || path.startsWith('/app/')) { if (publicCalculator && !session.user) return <PublicLayout path={path}><ReadingProgress />{page}</PublicLayout>; return <WorkspaceLayout path={path}>{page}</WorkspaceLayout>; }
  if (path === '/admin' || path.startsWith('/admin/')) return <WorkspaceLayout path={path} admin>{page}</WorkspaceLayout>;
  if (['/login', '/register', '/forgot-password', '/onboarding'].includes(path)) return page;
  return <PublicLayout path={path}><ReadingProgress />{page}{path === '/' && <CreatorShowcase />}</PublicLayout>;
}
export default function Application() { return <AppearanceProvider><ToastProvider><SessionProvider><CalculatorProvider><CookieConsent /><Router /></CalculatorProvider></SessionProvider></ToastProvider></AppearanceProvider>; }
