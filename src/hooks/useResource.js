import { useEffect, useRef, useState, useCallback } from 'react';

export function useResource(loader, dependencies = [], enabled = true) {
  const loaderRef = useRef(loader); loaderRef.current = loader;
  const [version, setVersion] = useState(0);
  const [state, setState] = useState({ status: enabled ? 'loading' : 'idle', data: null, error: null });
  useEffect(() => {
    let active = true;
    if (!enabled) { setState({ status: 'idle', data: null, error: null }); return; }
    setState({ status: 'loading', data: null, error: null });
    Promise.resolve().then(() => loaderRef.current()).then(data => {
      if (active) setState({ status: 'success', data, error: null });
    }).catch(error => { if (active) setState({ status: 'error', data: null, error }); });
    return () => { active = false; };
  }, [version, enabled, ...dependencies]);
  const refresh = useCallback(() => setVersion(v => v + 1), []);
  return { ...state, refresh };
}