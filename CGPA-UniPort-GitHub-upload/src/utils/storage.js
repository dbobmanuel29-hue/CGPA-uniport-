const KEY = 'cgpa-uniport-appearance';
export function getAppearance() { try { const v = localStorage.getItem(KEY); return ['light', 'dark', 'system'].includes(v) ? v : 'light'; } catch { return 'light'; } }
export function saveAppearance(value) { try { localStorage.setItem(KEY, value); } catch { /* Preferences remain in memory if storage is unavailable. */ } }