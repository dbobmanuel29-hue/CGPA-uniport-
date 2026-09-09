import { Component, lazy, Suspense, useEffect } from 'react';
import { PublicLayout, WorkspaceLayout } from './components/navigation';
import { ToastProvider, EmptyState, Skeleton } from './components/feedback';
import { Button } from './components/ui';
import { AppearanceProvider } from './state/appearance';
import { SessionProvider } from './state/session';
import { CalculatorProvider } from './state/calculator';
import { useHashRoute, navigate } from './utils/routing';
import { backendConfigured } from './services/adapter';
import { useSession } from './state/session';
import { useRevealObserver, useScrollProgress } from './hooks/useReveal';
import Home from './pages/public/Home';

const loadNamed = (loader, name) => lazy(() => loader().then(module => ({ default: module[name] })));
const publicPages = () => import('./pages/public/Pages');
const calculators = () => import('./pages/student/Calculators');
const journeys = () => import('./pages/student/Journey');
const operations = () => import('./pages/admin/Operations');
const About = loadNamed(publicPages, 'About');
const Features = loadNamed(publicPages, 'Features');
const HowItWorks = loadNamed(publicPages, 'HowItWorks');
const PublicSupport = loadNamed(publicPages, 'PublicSupport');
const LegalPage = loadNamed(publicPages, 'LegalPage');
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
const AdminNotifications = loadNamed(operations, 'AdminNotifications');
const AdminSupport = loadNamed(operations, 'AdminSupport');
const AdminPayments = loadNamed(operations, 'AdminPayments');
const AdminReports = loadNamed(operations, 'AdminReports');
const AuditLogs = loadNamed(operations, 'AuditLogs');
const AdminSettings = lazy(() => import('./pages/admin/Settings'));

const ROUTES = {
  '/': { title: 'Your Academic Journey, Simplified', element: <Home /> },
  '/about': { title: 'About', element: <About /> },
  '/features': { title: 'Features', element: <Features /> },
  '/how-it-works': { title: 'How it works', element: <HowItWorks /> },
  '/support': { title: 'Help center', element: <PublicSupport /> },
  '/terms': { title: 'Terms of service', element: <LegalPage type="terms" /> },
  '/privacy': { title: 'Privacy policy', element: <LegalPage type="privacy" /> },
  '/login': { title: 'Sign in', element: <Auth mode="login" /> },
  '/register': { title: 'Create account', element: <Auth mode="register" /> },
  '/forgot-password': { title: 'Reset password', element: <Auth mode="forgot-password" /> },
  '/onboarding': { title: 'Your UniPort profile', element: <Onboarding /> },
  '/app': { title: 'Your workspace', element: <Dashboard /> },
  '/app/academic': { title: 'Academic record', element: <Academic /> },
  '/app/calculator': { title: 'GPA calculator', element: <Gpa /> },
  '/app/cgpa': { title: 'CGPA calculator', element: <Cgpa /> },
  '/app/target': { title: 'Target CGPA', element: <Target /> },
  '/app/projection': { title: 'CGPA projection', element: <Projection /> },
  '/app/analytics': { title: 'Analytics', element: <Analytics /> },
  '/app/timeline': { title: 'Academic timeline', element: <Timeline /> },
  '/app/graduation': { title: 'Graduation planning', element: <Graduation /> },
  '/app/failed': { title: 'Course attention', element: <CourseAttention /> },
  '/app/reports': { title: 'Academic reports', element: <Reports /> },
  '/app/notifications': { title: 'Notifications', element: <Notifications /> },
  '/app/support': { title: 'Support requests', element: <Support /> },
  '/app/profile': { title: 'Your profile', element: <Profile /> },
  '/app/settings': { title: 'Settings', element: <Settings /> },
  '/admin': { title: 'Admin dashboard', element: <AdminDashboard /> },
  '/admin/students': { title: 'Student directory', element: <AdminStudents /> },
  '/admin/academic': { title: 'Academic data', element: <AdminAcademic /> },
  '/admin/faculties': { title: 'Faculties', element: <AcademicCrud entity="faculties" /> },
  '/admin/departments': { title: 'Departments', element: <AcademicCrud entity="departments" /> },
  '/admin/programmes': { title: 'Programmes', element: <AcademicCrud entity="programmes" /> },
  '/admin/courses': { title: 'Courses', element: <AcademicCrud entity="courses" /> },
  '/admin/notifications': { title: 'Admin notifications', element: <AdminNotifications /> },
  '/admin/support': { title: 'Support desk', element: <AdminSupport /> },
  '/admin/payments': { title: 'Payments', element: <AdminPayments /> },
  '/admin/reports': { title: 'Admin reports', element: <AdminReports /> },
  '/admin/logs': { title: 'Audit trail', element: <AuditLogs /> },
  '/admin/settings': { title: 'Admin settings', element: <AdminSettings /> },
};

class PageBoundary extends Component {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    if (this.state.error) return <EmptyState title="Something interrupted this page." description="Your records have not been changed. Please reload the page and try again." icon="alert" action={<Button onClick={() => window.location.reload()}>Reload page</Button>} />;
    return this.props.children;
  }
}

function ReadingProgress() {
  const progress = useScrollProgress();
  return <div className="read-progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>;
}

function Router() {
  const path = useHashRoute();
  const session = useSession();
  const route = ROUTES[path];
  useEffect(() => {
    if (!backendConfigured()) return;
    if (path === '/login' || path === '/register' || path === '/forgot-password' || path === '/onboarding' || !path.startsWith('/app') && !path.startsWith('/admin')) return;
    if (!session.user) { navigate('/login'); return; }
    if (path.startsWith('/admin') && session.user.role !== 'admin') navigate('/app');
  }, [path, session.user]);
  useRevealObserver();
  useEffect(() => { document.title = `${route?.title || 'Page not found'} | CGPA+ UniPort`; }, [path, route]);
  const page = <PageBoundary key={path}><Suspense fallback={<div className="route-loading"><Skeleton label="Loading your next page..." rows={5} /></div>}>{route?.element || <div className="not-found"><span className="eyebrow">A SMALL DETOUR</span><h1 tabIndex={-1} data-page-heading>Let's get you back on track.</h1><p>This page is not part of your CGPA+ journey.</p><Button href="#/" endIcon="arrow">Return home</Button></div>}</Suspense></PageBoundary>;
  if (path === '/app' || path.startsWith('/app/')) return <WorkspaceLayout path={path}>{page}</WorkspaceLayout>;
  if (path === '/admin' || path.startsWith('/admin/')) return <WorkspaceLayout path={path} admin>{page}</WorkspaceLayout>;
  if (['/login', '/register', '/forgot-password', '/onboarding'].includes(path)) return page;
  return <PublicLayout path={path}><ReadingProgress />{page}</PublicLayout>;
}

export default function Application() {
  return <AppearanceProvider><ToastProvider><SessionProvider><CalculatorProvider><Router /></CalculatorProvider></SessionProvider></ToastProvider></AppearanceProvider>;
}