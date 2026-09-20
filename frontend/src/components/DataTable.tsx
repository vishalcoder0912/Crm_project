import { ReactNode, useMemo, useState } from 'react';
import { Row, Column } from '../types';
import { Spinner, EmptyState, StatusBadge, inputClass } from './ui';

export function getByPath(row: Row, path: string): any {
  if (path.includes('.')) {
    return path.split('.').reduce<any>((acc, key) => (acc == null ? undefined : acc[key]), row);
  }
  return row[path];
}

function defaultRender(row: Row, col: Column<Row>) {
  const v = getByPath(row, col.key);
  if (v === null || v === undefined || v === '') return <span className="text-slate-400">—</span>;
  return <span className="text-ink-2">{String(v)}</span>;
}

export function DataTable({
  columns,
  rows,
  loading,
  searchKeys,
  searchPlaceholder = 'Search…',
  rowKey = 'id',
  onRowClick,
  emptyTitle = 'Nothing here yet',
  emptyHint,
  dense,
}: {
  columns: Column[];
  rows: Row[];
  loading?: boolean;
  searchKeys?: string[];
  searchPlaceholder?: string;
  rowKey?: string;
  onRowClick?: (row: Row) => void;
  emptyTitle?: string;
  emptyHint?: string;
  dense?: boolean;
}) {
  const [q, setQ] = useState('');

  const visible = useMemo(() => {
    if (!q.trim() || !searchKeys?.length) return rows;
    const needle = q.trim().toLowerCase();
    return rows.filter((r) =>
      searchKeys.some((k) => {
        const v = getByPath(r, k);
        return v !== null && v !== undefined && String(v).toLowerCase().includes(needle);
      })
    );
  }, [q, rows, searchKeys]);

  return (
    <div>
      {searchKeys && searchKeys.length > 0 && (
        <div className="mb-3 max-w-sm">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder}
            className={inputClass}
          />
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className={`data-table w-full min-w-full text-left text-sm ${dense ? 'text-[13px]' : ''}`}>
          <thead>
            <tr className="border-b border-line">
              <th className="px-4 py-3">#</th>
              {columns.map((c) => (
                <th key={c.key} className={`px-4 py-3 ${c.className ?? ''}`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {!loading &&
              visible.map((row, i) => (
                <tr
                  key={row[rowKey] ?? i}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={onRowClick ? 'cursor-pointer transition' : 'transition'}
                >
                  <td className="px-4 py-3 text-xs tabular-nums text-muted">{String(i + 1).padStart(2, '0')}</td>
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-3 align-middle ${c.className ?? ''}`}>
                      {c.render ? c.render(row) : defaultRender(row, c)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
        {loading && <Spinner />}
        {!loading && visible.length === 0 && (
          <EmptyState
            title={q ? 'No matches for your search' : emptyTitle}
            hint={emptyHint}
            icon={
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <path d="M8 8h8M8 12h8M8 16h5" />
              </svg>
            }
          />
        )}
      </div>
      {!loading && (
        <p className="mt-2 text-xs text-slate-400">
          {visible.length} {visible.length === 1 ? 'record' : 'records'}
          {q && ' (filtered)'}
        </p>
      )}
    </div>
  );
}

export function StatusCell({ value }: { value?: string }) {
  return <StatusBadge status={value} />;
}

export function MoneyCell({ value, currency = '₹' }: { value?: number | string | null; currency?: string }) {
  const n = Number(value ?? 0);
  return <span className="font-medium tabular-nums text-ink">{currency}{n.toLocaleString('en-IN')}</span>;
}

export function DateCell({ value }: { value?: string | null }) {
  if (!value) return <span className="text-slate-300">—</span>;
  const d = new Date(value);
  if (isNaN(d.getTime())) return <span className="text-muted">{String(value)}</span>;
  return <span className="whitespace-nowrap tabular-nums text-ink-2">{d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>;
}

export function ActionMenu({ items }: { items: { label: string; icon?: ReactNode; onClick: () => void; tone?: 'default' | 'danger' }[] }) {
  return (
    <div className="flex items-center gap-1.5">
      {items.map((it, i) => (
        <button
          key={i}
          onClick={(e) => {
            e.stopPropagation();
            it.onClick();
          }}
          title={it.label}
          className={`inline-flex items-center rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${
            it.tone === 'danger'
              ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
              : 'border-line bg-white text-ink-2 hover:border-brand-300 hover:bg-brand-50'
          }`}
        >
          {it.icon}
          {it.label}
        </button>
      ))}
    </div>
  );
}