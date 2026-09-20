// hello this is vishal project
import { useEffect, useState } from 'react';
import { Badge, Button, EmptyState, Input, Modal, PageHeader, Skeleton } from '../components/ui';
import { Icon } from '../components/icons';
import { data } from '../lib/data';

export default function Branches() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', code: '', city: '' });

  const load = () => {
    setLoading(true);
    data
      .list('/branches?pageSize=100')
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submit = async () => {
    if (!form.name || !form.code) {
      setError('Name and code are required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await data.post('/branches', { ...form, code: form.code.toUpperCase() });
      setOpen(false);
      setForm({ name: '', code: '', city: '' });
      load();
    } catch (e: any) {
      setError(e?.message ?? 'Could not create branch');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fade-in space-y-6">
      <PageHeader
        title="Branches"
        subtitle="Operating locations and their customer base"
        actions={<Button onClick={() => setOpen(true)}><Icon name="plus" size={16} /> New branch</Button>}
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No branches" hint="Create your first branch to get started" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((b) => (
            <div key={b.id} className="rounded-xl border border-line/80 bg-white p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-800">
                    <Icon name="building" size={20} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">{b.name}</p>
                    <p className="text-xs text-muted">{b.businessId} · {b.code}</p>
                  </div>
                </div>
                <Badge tone={b.isActive ? 'emerald' : 'slate'}>{b.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
              <p className="mt-3 text-sm text-muted">{b.city ?? '—'}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line-soft pt-3 text-center">
                <div>
                  <p className="text-lg font-bold tabular-nums text-ink">{b._count?.customers ?? 0}</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted">Customers</p>
                </div>
                <div>
                  <p className="text-lg font-bold tabular-nums text-ink">{b._count?.users ?? 0}</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted">Staff</p>
                </div>
                <div>
                  <p className="text-lg font-bold tabular-nums text-ink">{b._count?.followUps ?? 0}</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted">Follow-ups</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New branch">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Branch name</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Pune" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Code</label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="PUN" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">City</label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Pune" />
            </div>
          </div>
        </div>
        {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Create branch'}</Button>
        </div>
      </Modal>
    </div>
  );
}
