import { configureServices, getServiceAdapter } from '../services/adapter.js';

const STORAGE_KEY = 'cgpa-plus-support-rate-limit';
const WINDOW_MS = 60 * 60 * 1000;
const COOLDOWN_MS = 30 * 1000;
const MAX_REQUESTS = 3;

function readState() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { timestamps: Array.isArray(value.timestamps) ? value.timestamps.filter(Boolean) : [], last: Number(value.last || 0) };
  } catch { return { timestamps: [], last: 0 }; }
}

function writeState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

export async function registerSupportRateLimit() {
  const original = getServiceAdapter('support', 'createPublicRequest');
  if (typeof original !== 'function') return;
  configureServices({ support: {
    createPublicRequest: async payload => {
      const now = Date.now();
      const state = readState();
      const timestamps = state.timestamps.filter(timestamp => now - timestamp < WINDOW_MS);
      if (state.last && now - state.last < COOLDOWN_MS) {
        throw Object.assign(new Error('Please wait 30 seconds before sending another support request.'), { code: 'support/rate-limited' });
      }
      if (timestamps.length >= MAX_REQUESTS) {
        throw Object.assign(new Error('You have reached the support request limit. Please try again later.'), { code: 'support/rate-limited' });
      }
      const result = await original(payload);
      writeState({ timestamps: [...timestamps, now], last: now });
      return result;
    }
  } });
}
