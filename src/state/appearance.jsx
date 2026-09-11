import { createContext, useContext, useEffect, useState } from 'react';
import { getAppearance, saveAppearance } from '../utils/storage';

const ThemeContext = createContext(null);

function getSystemTheme() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function AppearanceProvider({ children }) {
  const [mode, setMode] = useState(getAppearance);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = event => setSystemTheme(event.matches ? 'dark' : 'light');

    // Re-read the current device/browser preference whenever the provider mounts.
    setSystemTheme(media.matches ? 'dark' : 'light');
    media.addEventListener?.('change', update);

    return () => media.removeEventListener?.('change', update);
  }, []);

  const resolved = mode === 'system' ? systemTheme : mode;

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', resolved === 'dark' ? '#101b16' : '#fbfbf7');

    saveAppearance(mode);
  }, [mode, resolved]);

  return <ThemeContext.Provider value={{ mode, setMode, resolved }}>{children}</ThemeContext.Provider>;
}

export const useAppearance = () => useContext(ThemeContext);
