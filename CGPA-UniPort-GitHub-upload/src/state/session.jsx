import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { authService } from '../services/auth-service';
const SessionContext = createContext(null);
export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');
  const epoch = useRef(0);
  useEffect(() => {
    let active = true;
    let unsubscribe;
    const initialEpoch = epoch.current;
    authService.getCurrentUser().then(value => {
      if (active && epoch.current === initialEpoch) { setUser(value); setStatus('connected'); }
    }).catch(() => { if (active && epoch.current === initialEpoch) setStatus('disconnected'); });
    authService.subscribeToAuthState(value => {
      if (active) { epoch.current += 1; setUser(value); setStatus('connected'); }
    }).then(stop => {
      if (!active && typeof stop === 'function') stop();
      else unsubscribe = stop;
    }).catch(() => { /* A disconnected optional subscription never simulates a session. */ });
    return () => { active = false; if (typeof unsubscribe === 'function') unsubscribe(); };
  }, []);
  function accept(value) {
    if (!value?.id) throw new Error('The authentication adapter must return a user with an id.');
    epoch.current += 1; setUser(value); setStatus('connected');
  }
  function clear() { epoch.current += 1; setUser(null); }
  return <SessionContext.Provider value={{ user, status, accept, clear }}>{children}</SessionContext.Provider>;
}
export const useSession = () => useContext(SessionContext);