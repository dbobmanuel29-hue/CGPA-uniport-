const KEY = 'cgpa-uniport-appearance';
export function getAppearance() { try { const v = localStorage.getItem(KEY); return v === 'dark' ? 'dark' : 'light'; } catch { return 'light'; } }
export function saveAppearance(value) { try { localStorage.setItem(KEY, value === 'dark' ? 'dark' : 'light'); } catch { /* Preferences remain in memory if storage is unavailable. */ } }
