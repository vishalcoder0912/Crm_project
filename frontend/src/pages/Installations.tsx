import { useEffect, useState } from 'react';
import { PageHeader, Button, Modal, Select, StatusBadge } from '../components/ui';
import { DataTable, ActionMenu } from '../components/DataTable';
import { useCollection, fmtDate } from '../lib/hooks';
import { data } from '../lib/data';
import { Icon } from '../components/icons';

export default function Installations() {
  const { rows, loading, refresh } = useCollection('/installations');
  const [assign, setAssign] = useState<any>(null);
  const [emp, setEmp] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);

  useEffect(() => {
    data.list('/field-employees?pageSize=200').then(setEmployees).catch(() => setEmployees([]));
    data.list('/vehicles?pageSize=200').then(setVehicles).catch(() => setVehicles([]));
  }, []);

  const act = (p: string) =>
    data
      .post(p, {})
      .then(() => { setActionError(null); refresh(); })
      .catch((e: any) => setActionError(e?.message ?? 'Action failed'));

  const openAssign = (r: any) => {
    setError(null);
    setEmp('');
    setVehicleId(r.vehicleId ? String(r.vehicleId) : '');
    setAssign(r);
  };

  const submitAssign = async () => {
    if (!emp && !vehicleId) {
      setError('Choose a team member or a vehicle');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (emp) {
        await data.post(`/installations/${assign.id}/employees`, { fieldEmployeeId: Number(emp) });
      }
      if (vehicleId) {
        await data.post(`/installations/${assign.id}/assign`, { vehicleId: Number(vehicleId) });
      }
      setAssign(null);
      refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Could not assign');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fade-in">
      <PageHeader title="Installations" subtitle="Field teams, scheduling, and on-site completion" />
      {actionError && (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{actionError}</p>
      )}
      <DataTable
        columns={[
          { key: 'businessId', label: 'Job' },
          { key: 'order.businessId', label: 'Order', search: true },
          { key: 'customer.name', label: 'Customer', search: true },
          { key: 'site.city', label: 'City', search: true },
          { key: 'scheduledDate', label: 'Scheduled', render: (r) => fmtDate(r.scheduledDate) },
          {
            key: 'fieldEmployees',
            label: 'Team',
            render: (r) => (
              <div className="flex -space-x-1.5">
                {(r.fieldEmployees ?? []).slice(0, 3).map((e: any, i: number) => (
                  <span key={i} title={e.fieldEmployee?.name} className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-800 ring-2 ring-white">
                    {(e.fieldEmployee?.name ?? '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                  </span>
                ))}
                {!r.fieldEmployees?.length && <span className="text-xs text-slate-300">Unassigned</span>}
              </div>
            ),
          },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          {
            key: '_actions',
            label: 'Actions',
            render: (r) => (
              <ActionMenu
                items={[
                  { label: 'Assign', icon: <Icon name="customers" size={14} />, onClick: () => openAssign(r) },
                  { label: 'Start', onClick: () => act(`/installations/${r.id}/start`) },
                  { label: 'Complete', icon: <Icon name="check" size={14} />, onClick: () => act(`/installations/${r.id}/complete`) },
                ]}
              />
            ),
          },
        ]}
        rows={rows}
        loading={loading}
        searchKeys={['businessId', 'order.businessId', 'customer.name', 'site.city']}
        searchPlaceholder="Search installations…"
        emptyTitle="No installations scheduled"
      />

      <Modal open={!!assign} onClose={() => setAssign(null)} title={`Assign team · ${assign?.businessId}`}>
        <div className="grid gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Team member</label>
            <Select value={emp} onChange={(e) => setEmp(e.target.value)}>
              <option value="">Select field employee…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}{e.role ? ` · ${e.role}` : ''}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Vehicle</label>
            <Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              <option value="">No vehicle change</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.registrationNo} · {v.vehicleType}</option>
              ))}
            </Select>
          </div>
        </div>
        {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setAssign(null)}>Cancel</Button>
          <Button onClick={submitAssign} disabled={busy || (!emp && !vehicleId)}>{busy ? 'Saving…' : 'Assign'}</Button>
        </div>
      </Modal>
    </div>
  );
}
