// hello this is vishal project
import { useState } from 'react';
import { PageHeader, FilterSelect, Toolbar, Panel, Badge } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { useCollection, fmtDate, fmtTime } from '../lib/hooks';
import { Icon } from '../components/icons';

function parse(v: any): Record<string, any> | null {
  if (!v) return null;
  if (typeof v === 'object') return v;
  try {
    const parsed = JSON.parse(String(v));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function ChangeCell({ oldValue, newValue }: { oldValue?: string; newValue?: string }) {
  const before = parse(oldValue);
  const after = parse(newValue);
  if (!before && !after) return <span className="text-muted">{newValue || oldValue || '—'}</span>;
  const keys = Array.from(new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]));
  const changed = keys.filter((k) => String((before ?? {})[k]) !== String((after ?? {})[k]));
  if (changed.length === 0) return <span className="text-muted">—</span>;
  return (
    <div className="space-y-0.5">
      {changed.slice(0, 4).map((k) => (
        <div key={k} className="text-xs">
          <span className="text-muted">{k}: </span>
          <span className="text-rose-600 line-through">{(before ?? {})[k] ?? '—'}</span>
          <span className="mx-1 text-muted">→</span>
          <span className="font-medium text-emerald-700">{(after ?? {})[k] ?? '—'}</span>
        </div>
      ))}
    </div>
  );
}

export default function AuditLogs() {
  const { rows, loading } = useCollection('/audit');
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');

  const actions = Array.from(new Set(rows.map((r) => r.action).filter(Boolean)));
  const entities = Array.from(new Set(rows.map((r) => r.entityType).filter(Boolean)));
  const list = rows.filter((r) => (!action || r.action === action) && (!entity || r.entityType === entity));

  return (
    <div className="fade-in space-y-5">
      <PageHeader
        title="Audit Logs"
        subtitle="Immutable, read-only record of every change made to business-critical records."
      />

      <Toolbar>
        <FilterSelect value={action} onChange={(e) => setAction(e.target.value)} icon={<Icon name="filter" size={14} />}>
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect value={entity} onChange={(e) => setEntity(e.target.value)}>
          <option value="">All entities</option>
          {entities.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </FilterSelect>
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted">
          <Icon name="shield" size={14} /> Read-only
        </span>
      </Toolbar>

      <DataTable
        columns={[
          {
            key: 'createdAt',
            label: 'Timestamp',
            render: (r) => (
              <span className="whitespace-nowrap tabular-nums text-ink-2">
                {fmtDate(r.createdAt)} · {fmtTime(r.createdAt)}
              </span>
            ),
          },
          {
            key: 'user',
            label: 'User',
            render: (r) => (
              <div>
                <p className="font-medium text-ink">
                  {r.user ? `${r.user.firstName} ${r.user.lastName}` : 'System'}
                </p>
                <p className="text-xs text-muted">{r.userEmail || r.user?.email || '—'}</p>
              </div>
            ),
          },
          { key: 'action', label: 'Action', render: (r) => <Badge tone="slate">{r.action}</Badge> },
          { key: 'entityType', label: 'Entity', render: (r) => r.entityType ?? '—' },
          { key: 'entityId', label: 'Entity ID', render: (r) => <span className="tabular-nums text-muted">{r.entityId ?? '—'}</span> },
          { key: 'change', label: 'Previous → New', render: (r) => <ChangeCell oldValue={r.oldValue} newValue={r.newValue} /> },
          { key: 'ipAddress', label: 'IP / Source', render: (r) => <span className="tabular-nums text-muted">{r.ipAddress ?? '—'}</span> },
        ]}
        rows={list}
        loading={loading}
        searchKeys={['action', 'entityType', 'entityId', 'userEmail']}
        searchPlaceholder="Search audit logs…"
        emptyTitle="No audit records"
        emptyHint="Tracked changes will appear here."
      />

      <Panel title="About audit logging" subtitle="How entries are captured" className="max-w-none">
        <ul className="space-y-1.5 text-[13px] text-muted">
          <li className="flex gap-2"><Icon name="check" size={15} /> Price changes, status transitions and record edits are captured automatically.</li>
          <li className="flex gap-2"><Icon name="check" size={15} /> Entries cannot be edited or deleted from the application.</li>
          <li className="flex gap-2"><Icon name="check" size={15} /> Use filters to isolate a single entity or reviewer when investigating.</li>
        </ul>
      </Panel>
    </div>
  );
}
