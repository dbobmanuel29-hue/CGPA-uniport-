import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { Icon } from './Icon';
import { friendlyError } from '../services/adapter';

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Set());
  const dismiss = useCallback(id => setToasts(items => items.filter(x => x.id !== id)), []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const push = useCallback((kind, message) => {
    const id = Date.now() + Math.random();
    setToasts(items => [...items.slice(-3), { id, kind, message }]);
    const timer = setTimeout(() => { dismiss(id); timers.current.delete(timer); }, 6000);
    timers.current.add(timer);
  }, [dismiss]);
  const api = { success: m => push('success', m), error: m => push('danger', m), warning: m => push('warning', m), info: m => push('info', m) };
  return <ToastContext.Provider value={api}>{children}<div className="toast-region" aria-live="polite">{toasts.map(t => <div className={`toast toast-${t.kind}`} role="status" key={t.id}><Icon name={t.kind === 'success' ? 'check' : 'info'} /><span>{t.message}</span><button className="icon-button" aria-label="Dismiss notification" onClick={() => dismiss(t.id)}><Icon name="close" size={16} /></button></div>)}</div></ToastContext.Provider>;
}

export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const running = useRef(false);
  const toast = useToast();
  const run = async (task, onSuccess, message) => {
    if (running.current) return;
    running.current = true; setBusy(true); setError(null);
    try {
      const result = await task();
      if (onSuccess) await onSuccess(result);
      if (message) toast.success(message);
      return result;
    } catch (err) {
      setError(err);
      if (err?.code === 'BACKEND_NOT_CONNECTED') toast.info(friendlyError(err));
      else toast.error(friendlyError(err));
    } finally { running.current = false; setBusy(false); }
  };
  return { run, busy, error, clear: () => setError(null) };
}

export function Modal({ open, onClose, title, description, children, wide = false }) {
  const ref = useRef(null);
  const id = useId();
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    if (!open || !ref.current) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    ref.current.showModal();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; if (previous instanceof HTMLElement) previous.focus(); };
  }, [open]);
  if (!open) return null;
  return <dialog className={`modal ${wide ? 'modal-wide' : ''}`} ref={ref} aria-labelledby={id} onCancel={e => { e.preventDefault(); closeRef.current(); }} onClick={e => { if (e.target === e.currentTarget) closeRef.current(); }}><div className="modal-content"><header className="modal-header"><div><h2 id={id}>{title}</h2>{description && <p>{description}</p>}</div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><Icon name="close" /></button></header><div className="modal-body">{children}</div></div></dialog>;
}

export function ActionError({ error }) { return error ? <div className="inline-alert danger" role="alert"><Icon name="alert" /><span>{friendlyError(error)}</span></div> : null; }

export function ConfirmModal({ open, title = 'Confirm action', description, actionLabel = 'Confirm', onClose, onConfirm, dangerous = false }) {
  const action = useAction();
  useEffect(() => { if (open) action.clear(); }, [open]);
  return <Modal open={open} onClose={onClose} title={title}><div className={`confirm-icon ${dangerous ? 'danger' : ''}`}><Icon name={dangerous ? 'trash' : 'info'} size={28} /></div><p className="muted">{description}</p><ActionError error={action.error} /><div className="modal-actions"><button className="button button-outline" onClick={onClose}>Cancel</button><button className={`button ${dangerous ? 'button-danger' : 'button-primary'}`} disabled={action.busy} onClick={() => action.run(onConfirm, onClose)}>{action.busy ? 'Working...' : actionLabel}</button></div></Modal>;
}

export function EmptyState({ title = 'Nothing here yet', description = 'Your information will appear here when available.', icon = 'file', action, compact = false }) {
  return <div className={`empty-state ${compact ? 'empty-compact' : ''}`}><span className="empty-icon"><Icon name={icon} size={24} /></span><h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function Skeleton({ label = 'Loading...', rows = 3 }) {
  return <div className="skeleton-wrap" role="status" aria-label={label}><span className="sr-only">{label}</span>{Array.from({ length: rows }, (_, i) => <div className="skeleton-line" style={{ width: `${94 - i % 3 * 12}%` }} key={i} />)}</div>;
}

export function ConnectionState({ resource, title, emptyTitle = 'No information yet', emptyDescription, compact = false, children }) {
  if (resource.status === 'loading') return <Skeleton label={`Loading ${title || 'information'}...`} />;
  if (resource.error) return <div className={`connection-state ${compact ? 'connection-compact' : ''}`} role="status"><span className="empty-icon"><Icon name={resource.error.code === 'BACKEND_NOT_CONNECTED' ? 'cloud' : 'alert'} size={22} /></span><div><h3>{resource.error.code === 'BACKEND_NOT_CONNECTED' ? 'Your data, connected when you are.' : `Unable to load ${title || 'information'}.`}</h3><p>{resource.error.code === 'BACKEND_NOT_CONNECTED' ? 'Backend integration is pending. No sample information is shown as your data.' : 'Please check your connection and try again.'}</p></div><button className="button button-small button-outline" onClick={resource.refresh}><Icon name="refresh" size={15} />Try again</button></div>;
  const isEmpty = resource.data == null || Array.isArray(resource.data) && !resource.data.length || resource.data?.items && !resource.data.items.length;
  if (isEmpty) return <EmptyState title={emptyTitle} description={emptyDescription} compact={compact} />;
  return typeof children === 'function' ? children(resource.data) : children;
}