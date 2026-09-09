import { useId } from 'react';
import { number } from '../utils/formatting';

export function LineChart({ values = [], labels = [], max = 5, color = 'var(--green)', ariaLabel = 'GPA trend', secondary = [] }) {
  const id = useId().replace(/:/g, '');
  const w = 520, h = 190, left = 28, right = 8, top = 14, bottom = 25;
  const x = i => left + (values.length > 1 ? i / (values.length - 1) : 0.5) * (w - left - right);
  const y = value => top + (1 - value / max) * (h - top - bottom);
  const coords = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  return <figure className="chart-figure"><svg className="line-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={ariaLabel}><defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".14" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>{[0, 1, 2, 3, 4, 5].map(v => <g key={v}><line x1={left} x2={w - right} y1={y(v / 5 * max)} y2={y(v / 5 * max)} className="chart-grid" /><text x={left - 10} y={y(v / 5 * max) + 3} textAnchor="end" className="chart-label">{number(v / 5 * max, 0)}</text></g>)}{values.length > 0 && <><polygon points={`${x(0)},${y(0)} ${coords} ${x(values.length - 1)},${y(0)}`} fill={`url(#${id})`} /><polyline points={coords} fill="none" stroke={color} strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round" className="chart-line" />{values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3.7" fill={color} stroke="var(--surface)" strokeWidth="2"><title>{labels[i]}: {number(v)}</title></circle>)}</>}{secondary.length > 0 && <polyline points={secondary.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" stroke="var(--chart-blue)" strokeWidth="2" strokeDasharray="5 5" />}{labels.map((label, i) => <text key={`${label}-${i}`} x={x(i)} y={h - 6} textAnchor="middle" className="chart-label">{label}</text>)}</svg>{!values.length && <div className="chart-no-data">Your next chapter starts with a result.</div>}<figcaption className="sr-only">{values.length ? values.map((v, i) => `${labels[i] || i + 1}: ${number(v)}`).join('; ') : 'No data available.'}</figcaption></figure>;
}

export function BarChart({ values = [], labels = [], max, ariaLabel = 'Comparison chart' }) {
  const limit = max || Math.max(...values, 1);
  return <figure className="bar-chart" role="img" aria-label={ariaLabel}>{values.length ? values.map((v, i) => <div className="bar-column" key={i}><span className="bar-value">{number(v, v % 1 ? 2 : 0)}</span><div className="bar-space"><div className="bar" style={{ height: `${Math.min(100, Math.max(0, v / limit * 100))}%`, animationDelay: `${i * 80}ms` }} /></div><span className="chart-label">{labels[i]}</span></div>) : <div className="chart-empty-text">No comparison data available.</div>}</figure>;
}

export function DonutChart({ items = [], center, small = false }) {
  const sum = items.reduce((acc, i) => acc + i.value, 0);
  let offset = 0;
  const colors = ['#234d40', '#7fab78', '#c5de9b', '#e4cc94', '#db906d', '#a94442'];
  return <div className={`donut-wrap ${small ? 'donut-small' : ''}`}><div className="donut"><svg viewBox="0 0 100 100" role="img" aria-label={items.length ? items.map(i => `${i.label}: ${i.value}`).join(', ') : 'No distribution data'}><circle cx="50" cy="50" r="37" fill="none" stroke="var(--soft)" strokeWidth="13" />{sum > 0 && items.map((item, i) => { const length = item.value / sum * 232.478; const part = <circle key={item.label} cx="50" cy="50" r="37" fill="none" stroke={item.color || colors[i % colors.length]} strokeWidth="13" strokeDasharray={`${length} ${232.478 - length}`} strokeDashoffset={-offset} transform="rotate(-90 50 50)" />; offset += length; return part; })}</svg><div className="donut-center"><strong>{center ?? (items.length ? sum : '--')}</strong><span>total</span></div></div><div className="chart-legend">{items.map((item, i) => <span key={item.label}><i style={{ background: item.color || colors[i % colors.length] }} />{item.label}<b>{item.value}</b></span>)}</div></div>;
}

export function Progress({ value, label, detail, accent = false }) { const safe = value == null ? 0 : Math.max(0, Math.min(100, value)); return <div className="progress"><div className="progress-label"><span>{label}</span><strong>{detail || (value == null ? '--' : `${number(safe, 0)}%`)}</strong></div><div className={`progress-track ${accent ? 'progress-lime' : ''}`} role="progressbar" aria-label={label || 'Progress'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value == null ? undefined : safe}><span style={{ width: `${safe}%` }} /></div></div>; }