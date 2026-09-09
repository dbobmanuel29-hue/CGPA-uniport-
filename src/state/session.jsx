import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { authService } from '../services/auth-service';
import { registerFirebaseBackend } from '../integration/firebase-adapters.js';
import { registerStudentBackendFixes } from '../integration/student-backend-fixes.js';
import { registerStudentResultFixes } from '../integration/student-result-fixes.js';
import { registerStudentReadFix } from '../integration/student-read-fix.js';
import { registerAdminFixes } from '../integration/admin-fix.js';
import { registerAdminDeleteFix } from '../integration/admin-delete-fix.js';
import { registerSparkBackendFixes } from '../integration/spark-backend-fixes.js';
import { registerCloudinaryAdapter } from '../integration/cloudinary-adapter.js';
import { registerNotificationAdminFixes } from '../integration/notification-admin-fixes.js';
import { registerAuthPersistenceFix } from '../integration/auth-persistence-fix.js';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');
  const epoch = useRef(0);
  useEffect(() => {
    let active = true; let unsubscribe; const initialEpoch = epoch.current;
    (async () => {
      try {
        await registerFirebaseBackend(); await registerAuthPersistenceFix(); await registerStudentBackendFixes(); await registerStudentResultFixes(); await registerStudentReadFix(); await registerAdminFixes(); await registerAdminDeleteFix(); await registerSparkBackendFixes(); await registerCloudinaryAdapter(); registerNotificationAdminFixes();
        if (!active) return;
        const value = await authService.getCurrentUser();
        if (value?.accountStatus === 'deleted') { await authService.logout().catch(() => {}); if (active) { setUser(null); setStatus('connected'); } return; }
        if (active && epoch.current === initialEpoch) { setUser(value); setStatus('connected'); }
        const stop = await authService.subscribeToAuthState(next => { if (!active) return; if (next?.accountStatus === 'deleted') { authService.logout().catch(() => {}); epoch.current += 1; setUser(null); setStatus('connected'); return; } epoch.current += 1; setUser(next); setStatus('connected'); });
        if (!active && typeof stop === 'function') stop(); else unsubscribe = stop;
      } catch { if (active && epoch.current === initialEpoch) setStatus('disconnected'); }
    })();
    return () => { active = false; if (typeof unsubscribe === 'function') unsubscribe(); };
  }, []);
  function accept(value) { if (!value?.id) throw new Error('The authentication adapter must return a user with an id.'); epoch.current += 1; setUser(value); setStatus('connected'); }
  function clear() { epoch.current += 1; setUser(null); }
  return <SessionContext.Provider value={{ user, status, accept, clear }}>{children}</SessionContext.Provider>;
}
export const useSession = () => useContext(SessionContext);