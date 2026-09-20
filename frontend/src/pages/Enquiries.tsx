import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader, Button, Modal, Input, Select, StatusBadge } from '../components/ui';
import { DataTable, ActionMenu, MoneyCell } from '../components/DataTable';
import { useCollection, fmtDate, currency } from '../lib/hooks';
import { data } from '../lib/data';
import { Icon } from '../components/icons';

const NEXT: Record<string, string> = {
  NEW: 'CONTACTED',
  CONTACTED: 'MEASUREMENT_PENDING',
  MEASUREMENT_PENDING: 'MEASURED',
  MEASURED: 'QUOTATION_PENDING',
  QUOTATION_PENDING: 'QUOTATION_SENT',
  QUOTATION_SENT: 'WON',
};

const LOST_REASONS = ['Price', 'Customer cancelled', 'Competitor', 'Product unavailable', 'Timeline', 'Customer unreachable', 'Other'];

export default function Enquiries() {
  const navigate = useNavigate();
  const { rows, loading, refresh } = useCollection('/enquiries');
  const { rows: customers } = useCollection('/customers');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ customerId: '', source: 'Walk-in', notes: '' });
  const [actionError, setActionError] = useState<string | null>(null);

  const [lostFor, setLostFor] = useState<any>(null);
  const [lostReason, setLostReason] = useState(LOST_REASONS[0]);
  const [lostDetail, setLostDetail] = useState('');
  const [lostBusy, setLostBusy] = useState(false);
  const [lostError, setLostError] = useState<string | null>(null);

  const setStatus = (id: number, status: string, extra?: Record<string, unknown>) =>
    data
      .post(`/enquiries/${id}/status`, { status, ...extra })
      .then(() => { setActionError(null); refresh(); })
      .catch((e: any) => setActionError(e?.message ?? 'Action failed'));

  const create = async () => {
    if (!form.customerId) {
      setError('Please choose a customer');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await data.post('/enquiries', { ...form, customerId: Number(form.customerId) });
      setShow(false);
      setForm({ customerId: '', source: 'Walk-in', notes: '' });
      refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Could not create enquiry');
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setShow(false);
    setError(null);
  };

  const openLost = (r: any) => {
    setLostReason(LOST_REASONS[0]);
    setLostDetail('');
    setLostError(null);
    setLostFor(r);
  };

  const submitLost = async () => {
    setLostBusy(true);
    setLostError(null);
    try {
      await data.post(`/enquiries/${lostFor.id}/status`, {
        status: 'LOST',
        lostReason,
        lostReasonDetail: lostDetail || undefined,
      });
      setLostFor(null);
      refresh();
    } catch (e: any) {
      setLostError(e?.message ?? 'Could not mark as lost');
    } finally {
      setLostBusy(false);
    }
  };

  const totals = {
    won: rows.filter((r: any) => r.status === 'WON').length,
    open: rows.filter((r: any) => !['WON', 'LOST'].includes(r.status)).length,
    value: rows.filter((r: any) => ['QUOTATION_SENT', 'WON'].includes(r.status)).reduce((s: number, r: any) => s + Number(r.advanceAmount ?? 0), 0),
  };

  return (
    <div className="fade-in">
      <PageHeader
        title="Enquiries"
        subtitle={`${totals.open} open · ${totals.won} won · ${currency(totals.value)} qualified pipeline`}
        actions={
          <Button onClick={() => { setShow(true); setError(null); }}>
            <Icon name="plus" size={15} /> New enquiry
          </Button>
        }
      />
      {actionError && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{actionError}</p>}
      <DataTable
        columns={[
          { key: 'businessId', label: 'ID' },
          {
            key: 'customer',
            label: 'Customer',
            search: true,
            render: (r) => {
              const custId = r.customerId || r.customer?.id;
              const name = r.customer?.name ?? r.customerName ?? '—';
              return custId ? (
                <Link to={`/customers/${custId}`} className="font-semibold text-ink hover:text-brand-800 hover:underline">
                  {name}
                </Link>
              ) : (
                <span className="font-medium text-ink-2">{name}</span>
              );
            },
          },
          { key: 'items', label: 'Requirements', search: false, render: (r) => <span className="text-ink-2">{[...new Set((r.items ?? []).map((i: any) => i.productType).filter(Boolean))].join(', ') || `${r.items?.length ?? 0} item(s)`}</span> },
          { key: 'advanceAmount', label: 'Advance', render: (r) => <MoneyCell value={r.advanceAmount} /> },
          { key: 'source', label: 'Source' },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'notes', label: 'Notes', search: true },
          { key: 'createdAt', label: 'Created', render: (r) => fmtDate(r.createdAt) },
          {
            key: '_actions',
            label: 'Actions',
            render: (r) => {
              const next = NEXT[r.status];
              const custId = r.customerId || r.customer?.id;
              const isFinal = r.status === 'WON' || r.status === 'LOST';
              const items: any[] = [];
              if (custId) {
                items.push({ label: 'View customer', icon: <Icon name="customers" size={14} />, onClick: () => navigate(`/customers/${custId}`) });
              }
              items.push({ label: 'Create quote', icon: <Icon name="quotations" size={14} />, onClick: () => navigate('/quotations') });
              if (!isFinal) {
                if (next) items.push({ label: `→ ${next.replace(/_/g, ' ')}`, onClick: () => setStatus(r.id, next) });
                if (next === 'WON') items.push({ label: 'Won', icon: <Icon name="check" size={14} />, onClick: () => setStatus(r.id, 'WON') });
                items.push({ label: 'Lost', tone: 'danger' as const, onClick: () => openLost(r) });
              }
              return <ActionMenu items={items} />;
            },
          },
        ]}
        rows={rows}
        loading={loading}
        searchKeys={['customer.name', 'notes', 'businessId']}
        searchPlaceholder="Search enquiries…"
        emptyTitle="No enquiries yet"
      />

      <Modal open={show} onClose={close} title="New enquiry">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-2">Customer</label>
            <Select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
              <option value="">Select customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>
              ))}
            </Select>
          </div>
          <div><label className="mb-1 block text-xs font-medium text-ink-2">Source</label><Select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}><option>Walk-in</option><option>Referral</option><option>Online</option><option>Exhibition</option><option>Instagram</option><option>WhatsApp</option></Select></div>
          <div className="col-span-2"><label className="mb-1 block text-xs font-medium text-ink-2">Notes</label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={close}>Cancel</Button>
          <Button onClick={create} disabled={busy || !form.customerId}>{busy ? 'Saving…' : 'Create enquiry'}</Button>
        </div>
      </Modal>

      <Modal open={!!lostFor} onClose={() => setLostFor(null)} title={`Mark lost · ${lostFor?.businessId ?? ''}`}>
        <div className="grid gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Reason *</label>
            <Select value={lostReason} onChange={(e) => setLostReason(e.target.value)}>
              {LOST_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Detail</label>
            <Input value={lostDetail} onChange={(e) => setLostDetail(e.target.value)} placeholder="Optional context for the lost enquiry" />
          </div>
        </div>
        {lostError && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{lostError}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setLostFor(null)}>Cancel</Button>
          <Button onClick={submitLost} disabled={lostBusy}>{lostBusy ? 'Saving…' : 'Mark lost'}</Button>
        </div>
      </Modal>
    </div>
  );
}
