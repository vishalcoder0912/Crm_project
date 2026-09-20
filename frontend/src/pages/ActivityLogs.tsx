import { useMemo, useState } from 'react';
import { PageHeader, FilterSelect, Toolbar, Panel, Badge, EmptyState } from '../components/ui';
import { useCollection, fmtDate, fmtTime, daysSince } from '../lib/hooks';
import { Icon } from '../components/icons';

const SESSION_ACTIONS = ['LOGIN', 'LOGOUT', 'REFRESH_TOKEN', 'TOKEN_REFRESH'];

const ACTION_META: Record<string, { verb: string; icon: string; tone: 'emerald' | 'sky' | 'amber' | 'rose' | 'slate' }> = {
  CREATE: { verb: 'created', icon: 'plus', tone: 'emerald' },
  UPDATE: { verb: 'updated', icon: 'edit', tone: 'sky' },
  DELETE: { verb: 'deleted', icon: 'x', tone: 'rose' },
  STATUS_CHANGE: { verb: 'status changed', icon: 'refresh', tone: 'amber' },
  PRICE_CHANGE: { verb: 'price updated', icon: 'rupee', tone: 'amber' },
};

const friendlyEntity = (e?: string) => (e ?? 'record').replace(/_/g, ' ');

export default function ActivityLogs() {
  const { rows, loading } = useCollection('/audit');
  const [entity, setEntity] = useState('');

  const activity = useMemo(
    () => rows.filter((r) => !SESSION_ACTIONS.includes(String(r.action).toUpperCase())),
    [rows]
  );
  const entities = Array.from(new Set(activity.map((r) => r.entityType).filter(Boolean)));
  const list = activity.filter((r) => !entity || r.entityType === entity);

  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    list.forEach((r) => {
      const key = fmtDate(r.createdAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return Array.from(map.entries());
  }, [list]);

  return (
    <div className="fade-in space-y-5">
      <PageHeader
        title="Activity Logs"
        subtitle="Operational activity across orders, quotations, production and payments — sessions excluded."
      />

      <Toolbar>
        <FilterSelect value={entity} onChange={(e) => setEntity(e.target.value)} icon={<Icon name="filter" size={14} />}>
          <option value="">All activity</option>
          {entities.map((e) => (
            <option key={e} value={e}>
              {friendlyEntity(e)}
            </option>
          ))}
        </FilterSelect>
        <span className="ml-auto text-xs text-muted">{list.length} events</span>
      </Toolbar>

      <Panel title="Operational timeline" subtitle="Newest first" bodyClassName="p-5">
        {!loading && list.length === 0 && (
          <EmptyState
            title="No operational activity"
            hint="Business events will appear here as work progresses."
            icon={<Icon name="history" size={40} />}
          />
        )}
        <div className="space-y-6">
          {groups.map(([day, items]) => (
            <div key={day}>
              <div className="mb-3 flex items-center gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  {daysSince(items[0].createdAt) === 0 ? 'Today' : daysSince(items[0].createdAt) === 1 ? 'Yesterday' : day}
                </span>
                <span className="h-px flex-1 bg-line-soft" />
              </div>
              <div className="space-y-3">
                {items.map((r) => {
                  const meta = ACTION_META[String(r.action).toUpperCase()] ?? {
                    verb: String(r.action).toLowerCase().replace(/_/g, ' '),
                    icon: 'zap',
                    tone: 'slate' as const,
                  };
                  return (
                    <div key={r.id} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-canvas text-muted">
                        <Icon name={meta.icon} size={15} />
                      </span>
                      <div className="min-w-0 flex-1 border-b border-line-soft pb-3">
                        <p className="text-[13px] text-ink">
                          <span className="font-semibold capitalize">{friendlyEntity(r.entityType)}</span>
                          {r.entityId ? <span className="text-muted"> #{r.entityId}</span> : null}{' '}
                          <span className="text-ink-2">{meta.verb}</span>
                          <span className="text-muted">
                            {' '}
                            by {r.user ? `${r.user.firstName} ${r.user.lastName}` : 'System'}
                          </span>
                        </p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <Badge tone={meta.tone}>{r.action}</Badge>
                          <span className="text-[11px] text-muted">{fmtTime(r.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
