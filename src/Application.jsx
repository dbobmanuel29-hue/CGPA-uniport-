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
  '/': { title: 'CGPA+ UniPort | GPA & CGPA Calculator for UniPort Students', element: <Home /> }, '/about': { title: 'About CGPA+ UniPort', element: <About /> }, '/features': { title: 'Features', element: <Features /> }, '/how-it-works': { title: 'How CGPA+ works', element: <HowItWorks /> }, '/support': { title: 'Help center', element: <PublicSupport /> }, '/terms': { title: 'Terms of service', element: <LegalPage type="terms" /> }, '/privacy': { title: 'Privacy policy', element: <LegalPage type="privacy" /> }, '/cookies': { title: 'Cookie policy', element: <CookiePolicy /> }, '/thank-you': { title: 'Thank you', element: <ThankYou /> }, '/login': { title: 'Sign in', element: <Auth mode="login" /> }, '/register': { title: 'Create account', element: <Auth mode="register" /> }, '/forgot-password': { title: 'Reset password', element: <Auth mode="forgot-password" /> }, '/onboarding': { title: 'Your UniPort profile', element: <Onboarding /> }, '/app': { title: 'Your workspace', element: <Dashboard /> }, '/app/academic': { title: 'Academic record', element: <Academic /> }, '/app/calculator': { title: 'GPA calculator', element: <Gpa /> }, '/app/cgpa': { title: 'CGPA calculator', element: <Cgpa /> }, '/app/target': { title: 'Target CGPA calculator', element: <Target /> }, '/app/projection': { title: 'CGPA projection calculator', element: <Projection /> }, '/app/analytics': { title: 'Academic analytics', element: <Analytics /> }, '/app/timeline': { title: 'Academic timeline', element: <Timeline /> }, '/app/graduation': { title: 'Graduation planning', element: <Graduation /> }, '/app/failed': { title: 'Course attention', element: <CourseAttention /> }, '/app/reports': { title: 'Academic reports', element: <Reports /> }, '/app/notifications': { title: 'Notifications', element: <Notifications /> }, '/app/support': { title: 'Support requests', element: <Support /> }, '/app/profile': { title: 'Your profile', element: <Profile /> }, '/app/settings': { title: 'Settings', element: <Settings /> }, '/admin': { title: 'Admin dashboard', element: <AdminDashboard /> }, '/admin/students': { title: 'Student directory', element: <AdminStudents /> }, '/admin/academic': { title: 'Academic data', element: <AdminAcademic /> }, '/admin/faculties': { title: 'Faculties', element: <AcademicCrud entity="faculties" /> }, '/admin/departments': { title: 'Departments', element: <AcademicCrud entity="departments" /> }, '/admin/programmes': { title: 'Programmes', element: <AcademicCrud entity="programmes" /> }, '/admin/courses': { title: 'Courses', element: <AcademicCrud entity="courses" /> }, '/admin/notifications': { title: 'Admin notifications', element: <AdminNotifications /> }, '/admin/support': { title: 'Support desk', element: <AdminSupport /> }, '/admin/reports': { title: 'Admin reports', element: <AdminReports /> }, '/admin/logs': { title: 'Audit trail', element: <AuditLogs /> }, '/admin/settings': { title: 'Admin settings', element: <AdminSettings /> },
};

class PageBoundary extends Component { state = { error: false }; static getDerivedStateFromError() { return { error: true }; } render() { if (this.state.error) return <EmptyState title="Something interrupted this page." description="Your records have not been changed. Please try again." icon="alert" action={<Button onClick={() => window.location.hash = '#/'}>Return home</Button>} />; return this.props.children; } }
function ReadingProgress() { const progress = useScrollProgress(); return <div className="read-progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>; }
function Router() {
  const path = useHashRoute(); const session = useSession(); const route = ROUTES[path];
  const publicCalculator = PUBLIC_CALCULATORS.has(path);
  const studentProtected = path === '/app' || (path.startsWith('/app/') && !publicCalculator);
  const restricted = studentProtected || path.startsWith('/admin') || path === '/onboarding';
  useEffect(() => { if (session.status === 'loading') return; if (restricted) { if (!session.user) { navigate('/login'); return; } if (path.startsWith('/admin') && session.user.role !== 'admin') navigate('/app'); } }, [path, session.user, session.status, restricted]);
  useRevealObserver();
  useEffect(() => { document.title = path === '/' ? 'CGPA+ UniPort | GPA & CGPA Calculator for UniPort Students' : `${route?.title || 'Page not found'} | CGPA+ UniPort`; }, [path, route]);
  if (restricted && session.status === 'loading') return <div className="route-loading"><Skeleton label="Checking your session..." rows={4} /></div>;
  const page = <PageBoundary key={path}><Suspense fallback={<div className="route-loading"><Skeleton label="Loading your next page..." rows={5} /></div>}>{route?.element || <div className="not-found"><span className="eyebrow">404 / PAGE NOT FOUND</span><h1 tabIndex={-1} data-page-heading>Let's get you back on track.</h1><p>The page you requested does not exist in CGPA+ UniPort.</p><div className="form-actions"><Button href="#/" endIcon="arrow">Return home</Button><Button variant="outline" href="#/support">Visit help center</Button></div></div>}</Suspense></PageBoundary>;
  if (path === '/app' || path.startsWith('/app/')) { if (publicCalculator && !session.user) return <PublicLayout path={path}><ReadingProgress />{page}</PublicLayout>; return <WorkspaceLayout path={path}>{page}</WorkspaceLayout>; }
  if (path === '/admin' || path.startsWith('/admin/')) return <WorkspaceLayout path={path} admin>{page}</WorkspaceLayout>;
  if (['/login', '/register', '/forgot-password', '/onboarding'].includes(path)) return page;
  return <PublicLayout path={path}><ReadingProgress />{page}</PublicLayout>;
}
export default function Application() { return <AppearanceProvider><ToastProvider><SessionProvider><CalculatorProvider><CookieConsent /><Router /></CalculatorProvider></SessionProvider></ToastProvider></AppearanceProvider>; }
