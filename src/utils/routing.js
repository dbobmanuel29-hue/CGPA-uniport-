import { useEffect, useState } from 'react';
export function currentPath() { return (window.location.hash.slice(1).split('?')[0] || '/').replace(/\/$/, '') || '/'; }
export function navigate(path) { window.location.hash = path.startsWith('#') ? path.slice(1) : path; }
export function useHashRoute() {
  const [path, setPath] = useState(currentPath);
  useEffect(() => { const listener = () => setPath(currentPath()); window.addEventListener('hashchange', listener); return () => window.removeEventListener('hashchange', listener); }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    let completed = false;
    const observer = new MutationObserver(focusHeading);
    function focusHeading() {
      if (completed) return;
      const heading = document.querySelector('[data-page-heading]');
      if (heading) { heading.focus({ preventScroll: true }); completed = true; observer.disconnect(); }
    }
    observer.observe(document.getElementById('root'), { childList: true, subtree: true });
    focusHeading();
    return () => observer.disconnect();
  }, [path]);
  return path;
}
export const studentNavigation = [
  { group: 'Workspace', label: 'Overview', path: '/app', icon: 'grid' },
  { group: 'Workspace', label: 'Academic record', path: '/app/academic', icon: 'book' },
  { group: 'Workspace', label: 'GPA calculator', path: '/app/calculator', icon: 'calculator' },
  { group: 'Workspace', label: 'CGPA calculator', path: '/app/cgpa', icon: 'chart' },
  { group: 'Plan & progress', label: 'Analytics', path: '/app/analytics', icon: 'bars' },
  { group: 'Plan & progress', label: 'Target CGPA', path: '/app/target', icon: 'target' },
  { group: 'Plan & progress', label: 'CGPA projection', path: '/app/projection', icon: 'chart' },
  { group: 'Plan & progress', label: 'Academic timeline', path: '/app/timeline', icon: 'timeline' },
  { group: 'Plan & progress', label: 'Graduation', path: '/app/graduation', icon: 'graduation' },
  { group: 'Plan & progress', label: 'Course attention', path: '/app/failed', icon: 'alert' },
  { group: 'Your account', label: 'Reports', path: '/app/reports', icon: 'file' },
  { group: 'Your account', label: 'Notifications', path: '/app/notifications', icon: 'bell' },
  { group: 'Your account', label: 'Support', path: '/app/support', icon: 'help' },
  { group: 'Your account', label: 'Profile', path: '/app/profile', icon: 'user' },
  { group: 'Your account', label: 'Settings', path: '/app/settings', icon: 'settings' },
];
export const adminNavigation = [
  ['Dashboard', '', 'grid'], ['Students', '/students', 'users'], ['Academic data', '/academic', 'book'], ['Faculties', '/faculties', 'graduation'], ['Departments', '/departments', 'timeline'], ['Programmes', '/programmes', 'target'], ['Courses', '/courses', 'file'], ['Notifications', '/notifications', 'bell'], ['Support', '/support', 'message'], ['Payments', '/payments', 'card'], ['Reports', '/reports', 'chart'], ['Audit logs', '/logs', 'shield'], ['Settings', '/settings', 'settings'],
].map(([label, path, icon]) => ({ label, path: `/admin${path}`, icon, group: 'Administration' }));