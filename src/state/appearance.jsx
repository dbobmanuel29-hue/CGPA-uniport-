import { createContext, useContext, useEffect, useState } from 'react';
import { getAppearance, saveAppearance } from '../utils/storage';

const ThemeContext = createContext(null);

export function AppearanceProvider({ children }) {
  const [mode, setMode] = useState(() => {
    const saved = getAppearance();
    const initial = saved === 'dark' ? 'dark' : 'light';
    // Apply the stored theme before React paints the first screen so dark mode
    // never flashes the light palette during startup.
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = initial;
      document.documentElement.style.colorScheme = initial;
    }
    return initial;
  });

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', mode === 'dark' ? '#101b16' : '#fbfbf7');
    saveAppearance(mode);
  }, [mode]);

  return <ThemeContext.Provider value={{ mode, setMode, resolved: mode }}>{children}</ThemeContext.Provider>;
}

export const useAppearance = () => useContext(ThemeContext);
