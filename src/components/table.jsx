import { useMemo, useState } from 'react';
import { Icon } from './Icon';
import { ConnectionState } from './feedback';
import { Button, Select } from './ui';

export function DataTable({ columns, resource, search = '', emptyTitle = 'No records yet', emptyDescription = 'Records supplied by the backend will appear here.', onView, onEdit, onDelete, rowKey = 'id', filter = () => true, pageSize = 8 }) {
  const [sort, setSort] = useState({ key: '', dir: 1 });
  const [page, setPage] = useState(1);
  const raw = Array.isArray(resource.data) ? resource.data : resource.data?.items || [];
  const rows = useMemo(() => {
    let data = raw.filter(row => filter(row) && (!search || columns.some(c => String(row[c.key] ?? '').toLowerCase().includes(search.toLowerCase()))));
    if (sort.key) data = [...data].sort((a, b) => String(a[sort.key] ?? '').localeCompare(String(b[sort.key] ?? ''), undefined, { numeric: true }) * sort.dir);
    return data;
  }, [raw, search, sort, filter]);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages);
  const visible = rows.slice((current - 1) * pageSize, current * pageSize);
  const displayResource = resource.status === 'success' ? { ...resource, data: rows } : resource;
  const actions = onView || onEdit || onDelete;
  return <div className="data-table"><div className="table-scroll" tabIndex={0} role="region" aria-label="Scrollable records table"><table><thead><tr>{columns.map(col => <th key={col.key} aria-sort={sort.key === col.key ? sort.dir === 1 ? 'ascending' : 'descending' : 'none'}><button onClick={() => { setSort({ key: col.key, dir: sort.key === col.key ? -sort.dir : 1 }); setPage(1); }}>{col.label}<Icon name="sort" size={12} /></button></th>)}{actions && <th>Actions</th>}</tr></thead>{resource.status === 'success' && visible.length > 0 && <tbody>{visible.map((row, i) => <tr key={row[rowKey] || i}>{columns.map(col => <td key={col.key}>{col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '--')}</td>)}{actions && <td><div className="row-actions">{onView && <button className="icon-button" title="View details" aria-label={`View ${row.name || row.code || 'record'}`} onClick={() => onView(row)}><Icon name="eye" size={16} /></button>}{onEdit && <button className="icon-button" title="Edit" aria-label={`Edit ${row.name || row.code || 'record'}`} onClick={() => onEdit(row)}><Icon name="edit" size={16} /></button>}{onDelete && <button className="icon-button danger" title="Delete" aria-label={`Delete ${row.name || row.code || 'record'}`} onClick={() => onDelete(row)}><Icon name="trash" size={16} /></button>}</div></td>}</tr>)}</tbody>}</table></div>{(resource.status !== 'success' || !visible.length) && <ConnectionState resource={displayResource} title="records" emptyTitle={emptyTitle} emptyDescription={emptyDescription} />}<footer className="table-pagination"><span>{rows.length ? `${(current - 1) * pageSize + 1}-${Math.min(current * pageSize, rows.length)} of ${rows.length} records` : '0 records'}</span><div><Button variant="outline" className="button-small" icon="back" disabled={current <= 1} onClick={() => setPage(current - 1)}><span className="pagination-word">Previous</span></Button><span>Page {current} of {pages}</span><Button variant="outline" className="button-small" endIcon="arrow" disabled={current >= pages} onClick={() => setPage(current + 1)}><span className="pagination-word">Next</span></Button></div></footer></div>;
}

export function SearchBox({ value, onChange, placeholder = 'Search records...' }) { return <label className="search-box"><Icon name="search" size={17} /><input type="search" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} /></label>; }
export function StatusFilter({ value, onChange, options, label = 'All statuses' }) { return <Select aria-label={label} value={value} onChange={e => onChange(e.target.value)}><option value="">{label}</option>{options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}</Select>; }