export const number = (value, digits = 2) => value === null || value === undefined || !Number.isFinite(Number(value)) ? '--' : Number(value).toLocaleString('en-NG', { minimumFractionDigits: digits, maximumFractionDigits: digits });
export const date = value => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '--';
export const dateTime = value => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '--';
export const titleCase = value => String(value || '').replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
export const initials = value => String(value || 'Student').trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase();
export const uid = () => globalThis.crypto?.randomUUID?.() || `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const money = (value, currency = 'NGN') => value === null || value === undefined ? '--' : new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(value);