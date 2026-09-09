import { useId, useState } from 'react';
import { Icon } from './Icon';
import { useResource } from '../hooks/useResource';
import { titleCase } from '../utils/formatting';
import { UNIVERSITY } from '../data/uniport';

export function Button({ children, href, variant = 'primary', icon, endIcon, className = '', busy = false, disabled = false, type = 'button', ...props }) {
  const content = <>{busy ? <span className="spinner" /> : icon ? <Icon name={icon} size={17} /> : null}{children}{endIcon && <Icon name={endIcon} size={17} />}</>;
  return href ? <a className={`button button-${variant} ${className}`} href={disabled || busy ? undefined : href} aria-disabled={disabled || busy || undefined} {...props}>{content}</a> : <button type={type} className={`button button-${variant} ${className}`} disabled={busy || disabled} {...props}>{content}</button>;
}
export function Badge({ children, tone = 'neutral', dot = false }) { return <span className={`badge badge-${tone}`}>{dot && <span className="status-dot" />}{children}</span>; }
export function Field({ label, children, hint, error, optional }) { return <label className="field"><span className="field-label">{label}{optional && <small>Optional</small>}</span>{children}{error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}</label>; }
export function Input({ className = '', ...props }) { return <input className={`input ${className}`} {...props} />; }
export function Select({ children, className = '', ...props }) { return <select className={`input select ${className}`} {...props}>{children}</select>; }
export function Textarea({ className = '', ...props }) { return <textarea className={`input textarea ${className}`} {...props} />; }
export function PasswordInput({ ...props }) { const [visible, setVisible] = useState(false); return <span className="password-field"><Input {...props} type={visible ? 'text' : 'password'} /><button type="button" className="icon-button" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={() => setVisible(!visible)}><Icon name="eye" size={18} /></button></span>; }

export function AsyncSelect({ label, loader, dependencies = [], enabled = true, value, onChange, required = true, placeholder = 'Select an option', id }) {
  const resource = useResource(loader, dependencies, enabled);
  const rows = Array.isArray(resource.data) ? resource.data : resource.data?.items || [];
  const text = !enabled ? 'Select the previous field first' : resource.status === 'loading' ? 'Loading academic data...' : resource.error ? 'Academic data will be loaded here' : rows.length ? placeholder : 'No academic data available yet';
  return (
    <div className="async-field" aria-busy={resource.status === 'loading'}>
      <Field label={label} hint={enabled && resource.error ? 'Requires a connected academic catalogue.' : undefined}>
        <Select id={id} value={value || ''} onChange={onChange} required={required} disabled={!enabled || !rows.length}>
          <option value="">{text}</option>
          {rows.map(row => <option key={row.id} value={row.id}>{row.name || row.label || row.code}</option>)}
        </Select>
      </Field>
      {enabled && resource.error && <button type="button" className="select-retry" onClick={resource.refresh} aria-label={`Retry loading ${label.toLowerCase()}`}><Icon name="refresh" size={11} />Retry loading</button>}
    </div>
  );
}

export function Toggle({ label, description, checked, onChange }) {
  const id = useId();
  return <div className="toggle-row"><label htmlFor={id}><strong>{label}</strong>{description && <span>{description}</span>}</label><button id={id} type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`toggle ${checked ? 'is-on' : ''}`}><span /></button></div>;
}

export function PageHeader({ eyebrow, title, description, actions }) {
  return <header className="page-header"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1 tabIndex={-1} data-page-heading>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="header-actions">{actions}</div>}</header>;
}

export function Panel({ title, description, action, children, className = '' }) { return <section className={`panel ${className}`}>{title && <header className="panel-header"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</header>}{children}</section>; }

export function Stat({ label, value = '--', suffix, icon = 'chart', hint, accent = false }) { return <div className={`stat ${accent ? 'stat-accent' : ''}`}><div className="stat-label">{label}<Icon name={icon} size={18} /></div><div className="stat-value">{value}<small>{suffix}</small></div>{hint && <p>{hint}</p>}</div>; }

export function Tabs({ options, value, onChange, label = 'View' }) { return <div className="tabs" aria-label={label}>{options.map(option => { const o = typeof option === 'string' ? { value: option, label: titleCase(option) } : option; return <button key={o.value} type="button" aria-pressed={value === o.value} className={value === o.value ? 'active' : ''} onClick={() => onChange(o.value)}>{o.label}</button>; })}</div>; }

export function UniversityLock() { return <div className="university-lock"><span className="university-symbol"><Icon name="graduation" size={25} /></span><div><span>Your university</span><strong>{UNIVERSITY.name}</strong><small>{UNIVERSITY.location}</small></div><Icon name="lock" size={17} /></div>; }

export function Notice({ children, tone = 'info', icon = 'info' }) { return <div className={`inline-alert ${tone}`}><Icon name={icon} size={17} /><div>{children}</div></div>; }