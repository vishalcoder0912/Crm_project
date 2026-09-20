import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader, Button, Modal, Select, StatusBadge } from '../components/ui';
import { DataTable, ActionMenu } from '../components/DataTable';
import { useCollection, fmtDate } from '../lib/hooks';
import { data } from '../lib/data';
import { Icon } from '../components/icons';

export default function Tailoring() {
  const navigate = useNavigate();
  const { rows, loading, refresh } = useCollection('/tailoring');
  const [assignTo, setAssignTo] = useState<any>(null);
  const [userId, setUserId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    data.list('/users?pageSize=200').then(setUsers).catch(() => setUsers([]));
  }, []);

  const act = (p: string) =>
    data
      .post(p, {})
      .then(() => { setActionError(null); refresh(); })
      .catch((e: any) => setActionError(e?.message ?? 'Action failed'));

  const openAssign = (r: any) => {
    setError(null);
    setUserId(r.assignedToId ? String(r.assignedToId) : '');
    setAssignTo(r);
  };

  const submitAssign = async () => {
    if (!userId) { setError('Choose a tailor'); return; }
    setBusy(true);
    setError(null);
    try {
      await data.post(`/tailoring/${assignTo.id}/assign`, { assignedToId: Number(userId) });
      setAssignTo(null);
      refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Could not assign');
    } finally {
      setBusy(false);
    }
  };

  const pendingQc = rows.filter((r: any) => r.status === 'COMPLETED').length;

  return (
    <div className="fade-in">
      <PageHeader
        title="Tailoring Orders"
        subtitle={`${pendingQc} awaiting QC inspection`}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate('/orders')}>
              <Icon name="orders" size={15} /> View orders
            </Button>
            <Button variant="secondary" onClick={() => navigate('/qc')}>
              <Icon name="qc" size={15} /> Quality Control
            </Button>
          </div>
        }
      />
      {actionError && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{actionError}</p>}
      <DataTable
        columns={[
          { key: 'businessId', label: 'Job' },
          {
            key: 'order',
            label: 'Order',
            search: true,
            render: (r) => {
              const orderNo = r.order?.businessId ?? r.orderBusinessId;
              return orderNo ? (
                <Link to={`/orders?open=${orderNo}`} className="font-medium text-brand-800 hover:underline">
                  {orderNo}
                </Link>
              ) : (
                '—'
              );
            },
          },
          { key: 'sku.name', label: 'Item', search: true },
          { key: 'quantity', label: 'Qty', render: (r) => <span className="tabular-nums text-ink-2">{r.quantity}</span> },
          { key: 'assignedTo', label: 'Tailor', render: (r) => <span className="text-ink-2">{r.assignedTo ? (typeof r.assignedTo === 'object' ? `${r.assignedTo.firstName} ${r.assignedTo.lastName}` : r.assignedTo) : '—'}</span> },
          { key: 'createdAt', label: 'Created', render: (r) => fmtDate(r.createdAt) },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          {
            key: '_actions',
            label: 'Actions',
            render: (r) => {
              const orderNo = r.order?.businessId ?? r.orderBusinessId;
              return (
                <ActionMenu
                  items={[
                    ...(orderNo
                      ? [{ label: 'View order', icon: <Icon name="orders" size={14} />, onClick: () => navigate(`/orders?open=${orderNo}`) }]
                      : []),
                    { label: 'QC inspection', icon: <Icon name="qc" size={14} />, onClick: () => navigate('/qc') },
                    { label: 'Assign', icon: <Icon name="customers" size={14} />, onClick: () => openAssign(r) },
                    { label: 'Start', onClick: () => act(`/tailoring/${r.id}/start`) },
                    { label: 'Complete', icon: <Icon name="check" size={14} />, onClick: () => act(`/tailoring/${r.id}/complete`) },
                  ]}
                />
              );
            },
          },
        ]}
        rows={rows}
        loading={loading}
        searchKeys={['businessId', 'order.businessId', 'sku.name', 'assignedTo.firstName']}
        searchPlaceholder="Search tailoring jobs…"
        emptyTitle="No tailoring orders"
      />

      <Modal open={!!assignTo} onClose={() => setAssignTo(null)} title={`Assign · ${assignTo?.businessId}`}>
        <label className="mb-1 block text-xs font-medium text-muted">Tailor</label>
        <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="">Select tailor…</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
        </Select>
        {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setAssignTo(null)}>Cancel</Button>
          <Button onClick={submitAssign} disabled={busy || !userId}>
            {busy ? 'Assigning…' : 'Assign'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}