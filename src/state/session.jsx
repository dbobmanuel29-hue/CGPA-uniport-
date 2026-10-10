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
import { registerFunctionalSettingsFixes } from '../integration/functional-settings-fixes.js';
import { registerAuthPersistenceFix } from '../integration/auth-persistence-fix.js';
import { registerGoogleAuthFix } from '../integration/google-auth-fix.js';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');
  const epoch = useRef(0);
  useEffect(() => {
    let active = true;
    let unsubscribe;
    let adaptersReady = false;

    (async () => {
      try {
        await registerFirebaseBackend();

        // Read any identity Firebase has already restored, but don't depend on this
        // synchronous snapshot: Firebase may still be restoring persisted auth state.
        const value = await authService.getCurrentUser();
        if (!active) return;
        if (value?.accountStatus === 'deleted') {
          await authService.logout().catch(() => {});
          if (active) setUser(null);
        } else if (value) {
          setUser(value);
        }

        // Attach the auth listener BEFORE initializing unrelated adapters. Firebase's
        // first auth-state event can now reveal the signed-in account while those
        // services finish setting up, instead of waiting behind all of them.
        const stop = await authService.subscribeToAuthState(next => {
          if (!active) return;
          if (next?.accountStatus === 'deleted') {
            authService.logout().catch(() => {});
            epoch.current += 1;
            setUser(null);
            if (adaptersReady) setStatus('connected');
            return;
          }
          epoch.current += 1;
          setUser(next);
          if (adaptersReady) setStatus('connected');
        });
        if (!active && typeof stop === 'function') stop();
        else unsubscribe = stop;

        await Promise.all([
          registerAuthPersistenceFix(),
          registerGoogleAuthFix(),
          registerStudentBackendFixes(),
          registerStudentResultFixes(),
          registerStudentReadFix(),
          registerAdminFixes(),
          registerAdminDeleteFix(),
          registerSparkBackendFixes(),
          registerCloudinaryAdapter(),
          registerFunctionalSettingsFixes()
        ]);
        registerNotificationAdminFixes();
        if (!active) return;

        // The user identity can render early; protected routes still wait until all
        // backend adapters are ready before the session is marked connected.
        adaptersReady = true;
        setStatus('connected');
      } catch {
        if (active) setStatus('disconnected');
      }
    })();

    return () => {
      active = false;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  function accept(value) {
    if (!value?.id) throw new Error('The authentication adapter must return a user with an id.');
    epoch.current += 1;
    setUser(value);
    setStatus('connected');
  }
  function clear() {
    epoch.current += 1;
    setUser(null);
  }
  return <SessionContext.Provider value={{ user, status, accept, clear }}>{children}</SessionContext.Provider>;
}
export const useSession = () => useContext(SessionContext);
