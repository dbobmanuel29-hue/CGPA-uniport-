import { createContext, useContext, useEffect, useState } from 'react';
import { getAppearance, saveAppearance } from '../utils/storage';
const ThemeContext = createContext(null);
export function AppearanceProvider({ children }) {
  const [mode, setMode] = useState(getAppearance);
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => { const media = matchMedia('(prefers-color-scheme: dark)'); const update = e => setSystemDark(e.matches); media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, []);
  const resolved = mode === 'system' ? systemDark ? 'dark' : 'light' : mode;
  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', resolved === 'dark' ? '#101b16' : '#fbfbf7');
    saveAppearance(mode);
  }, [mode, resolved]);
  return <ThemeContext.Provider value={{ mode, setMode, resolved }}>{children}</ThemeContext.Provider>;
}
export const useAppearance = () => useContext(ThemeContext);