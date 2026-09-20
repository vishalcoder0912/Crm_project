import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Input, Modal, PageHeader, Select, Skeleton, StatusBadge, Tabs, EmptyState, statusLabel } from '../components/ui';
import { Icon } from '../components/icons';
import { api } from '../lib/api';
import { data } from '../lib/data';
import { fmtDate } from '../lib/hooks';

const PRIORITY_TONE: Record<string, any> = { HIGH: 'rose', MEDIUM: 'amber', LOW: 'slate' };
const CHANNELS = ['CALL', 'WHATSAPP', 'EMAIL', 'VISIT'];
const PURPOSES = [
  'Quotation follow-up',
  'Measurement confirmation',
  'Price negotiation',
  'Payment reminder',
  'Installation confirmation',
  'Requotation discussion',
  'General enquiry follow-up',
];

function toLocalInput(d: Date) {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}

export default function FollowUps() {
  const [stats, setStats] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bucket, setBucket] = useState('OVERDUE');
  const [priority, setPriority] = useState('');
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [form, setForm] = useState(() => ({
    customerId: '',
    purpose: PURPOSES[0],
    channel: 'CALL',
    dueAt: toLocalInput(new Date(Date.now() + 86400000)),
    priority: 'MEDIUM',
    assignedToId: '',
    notes: '',
  }));

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, any> = { pageSize: 50 };
    if (bucket === 'COMPLETED') params.status = 'COMPLETED';
    else if (bucket !== 'ALL') params.bucket = bucket;
    if (priority) params.priority = priority;
    Promise.all([api.get('/follow-ups/stats'), api.get('/follow-ups', params)])
      .then(([st, list]) => {
        setStats(st);
        setRows(Array.isArray(list) ? list : list?.items ?? list?.data ?? []);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [bucket, priority]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    data.list('/customers').then(setCustomers).catch(() => setCustomers([]));
    data.list('/users').then(setUsers).catch(() => setUsers([]));
  }, []);

  const submit = async () => {
    if (!form.customerId) {
      setError('Please choose a customer');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.post('/follow-ups', {
        ...form,
        customerId: Number(form.customerId),
        assignedToId: form.assignedToId ? Number(form.assignedToId) : undefined,
        dueAt: new Date(form.dueAt).toISOString(),
      });
      setOpen(false);
      setForm({ ...form, customerId: '', notes: '' });
      load();
    } catch (e: any) {
      setError(e?.message ?? 'Could not create follow-up');
    } finally {
      setSaving(false);
    }
  };

  const complete = async (id: number) => {
    setActionError(null);
    try {
      await api.post(`/follow-ups/${id}/complete`, {});
      load();
    } catch (e: any) {
      setActionError(e?.message ?? 'Could not complete follow-up');
    }
  };

  const tabs = useMemo(
    () => [
      { key: 'OVERDUE', label: 'Overdue', count: stats?.overdue },
      { key: 'TODAY', label: 'Today', count: stats?.today },
      { key: 'UPCOMING', label: 'Upcoming', count: stats?.upcoming },
      { key: 'ALL', label: 'All pending', count: stats?.pending },
      { key: 'COMPLETED', label: 'Completed', count: stats?.completedThisWeek },
    ],
    [stats]
  );

  const statsCards = useMemo(
    () => [
      { label: 'Overdue', value: stats?.overdue ?? 0, tone: 'rose' as const },
      { label: 'Today', value: stats?.today ?? 0, tone: 'amber' as const },
      { label: 'Upcoming', value: stats?.upcoming ?? 0, tone: 'brand' as const },
      { label: 'Completed (7d)', value: stats?.completedThisWeek ?? 0, tone: 'emerald' as const },
    ],
    [stats]
  );

  return (
    <div className="fade-in space-y-6">
      <PageHeader
        title="Follow-ups"
        subtitle="Track every customer commitment and never miss a callback"
        actions={<Button onClick={() => setOpen(true)}><Icon name="plus" size={16} /> New follow-up</Button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statsCards.map((c) => (
          <div key={c.label} className="rounded-xl border border-line/80 bg-white p-4 shadow-[var(--shadow-card)]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{c.label}</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums text-ink">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs tabs={tabs} value={bucket} onChange={setBucket} />
        <div className="w-40">
          <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="">All priorities</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </Select>
        </div>
      </div>

      {actionError && (
        <div className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-xs font-medium text-rose-700 hover:underline">Dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="Nothing here" hint="No follow-ups match this filter" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line/80 bg-white shadow-[var(--shadow-card)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line-soft bg-canvas text-[11px] uppercase tracking-wider text-muted">
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Purpose</th>
                  <th className="px-4 py-3 font-semibold">Channel</th>
                  <th className="px-4 py-3 font-semibold">Due</th>
                  <th className="px-4 py-3 font-semibold">Owner</th>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {rows.map((r) => (
                  <tr key={r.id} className="transition hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      {r.customerId ? (
                        <Link to={`/customers/${r.customerId}`} className="font-semibold text-ink hover:text-brand-800 hover:underline">
                          {r.customer?.name ?? '—'}
                        </Link>
                      ) : (
                        <p className="font-medium text-ink">{r.customer?.name ?? '—'}</p>
                      )}
                      <p className="text-xs text-muted">{r.businessId}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-2">{r.purpose}</td>
                    <td className="px-4 py-3 text-muted">{r.channel ? statusLabel(r.channel) : '—'}</td>
                    <td className="px-4 py-3 tabular-nums text-ink-2">{fmtDate(r.dueAt)}</td>
                    <td className="px-4 py-3 text-muted">{r.assignedTo ? `${r.assignedTo.firstName} ${r.assignedTo.lastName}` : 'Unassigned'}</td>
                    <td className="px-4 py-3"><Badge tone={PRIORITY_TONE[r.priority]}>{statusLabel(r.priority)}</Badge></td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status === 'PENDING' && (
                        <button
                          onClick={() => complete(r.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                        >
                          <Icon name="check" size={14} /> Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Schedule follow-up" wide>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted">Customer</label>
            <Select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
              <option value="">Select customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Purpose</label>
            <Select value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })}>
              {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Channel</label>
            <Select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
              {CHANNELS.map((c) => <option key={c} value={c}>{statusLabel(c)}</option>)}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Due date</label>
            <Input type="datetime-local" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Priority</label>
            <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted">Assign to</label>
            <Select value={form.assignedToId} onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}>
              <option value="">Default (customer owner)</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="Add context for this follow-up…"
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </div>
        {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Create follow-up'}</Button>
        </div>
      </Modal>
    </div>
  );
}
