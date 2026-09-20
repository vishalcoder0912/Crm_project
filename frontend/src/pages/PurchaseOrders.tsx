import { useEffect, useState } from 'react';
import { PageHeader, Button, Modal, Input, Select, StatusBadge } from '../components/ui';
import { DataTable, ActionMenu, MoneyCell } from '../components/DataTable';
import { useCollection, fmtDate, currency } from '../lib/hooks';
import { data } from '../lib/data';
import { Icon } from '../components/icons';

type Line = { skuId: string; quantity: string; rate: string };

export default function PurchaseOrders() {
  const { rows, loading, refresh } = useCollection('/purchase-orders');
  const [show, setShow] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [skus, setSkus] = useState<any[]>([]);
  const [vendorId, setVendorId] = useState('');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [lines, setLines] = useState<Line[]>([{ skuId: '', quantity: '', rate: '' }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    data.list('/vendors?pageSize=200').then(setVendors).catch(() => setVendors([]));
    data.list('/skus?pageSize=200').then(setSkus).catch(() => setSkus([]));
  }, []);

  const spend = rows.filter((r: any) => ['APPROVED', 'SENT', 'PARTIALLY_RECEIVED'].includes(r.status));

  const act = (p: string) =>
    data
      .post(p, {})
      .then(() => { setActionError(null); refresh(); })
      .catch((e: any) => setActionError(e?.message ?? 'Action failed'));

  const openModal = () => {
    setVendorId('');
    setExpectedDelivery('');
    setLines([{ skuId: '', quantity: '', rate: '' }]);
    setError(null);
    setShow(true);
  };

  const setLine = (i: number, patch: Partial<Line>) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };

  const pickSku = (i: number, skuId: string) => {
    const sku = skus.find((s) => String(s.id) === skuId);
    setLine(i, { skuId, rate: sku ? String(sku.sellingPrice ?? '') : '' });
  };

  const total = lines.reduce((s, l) => s + Number(l.quantity || 0) * Number(l.rate || 0), 0);
  const valid = vendorId && lines.some((l) => l.skuId && Number(l.quantity) > 0 && Number(l.rate) >= 0 && l.rate !== '');

  const submit = async () => {
    const items = lines
      .filter((l) => l.skuId && Number(l.quantity) > 0 && l.rate !== '')
      .map((l) => ({ skuId: Number(l.skuId), quantity: Number(l.quantity), rate: Number(l.rate) }));
    if (!vendorId) { setError('Choose a vendor'); return; }
    if (items.length === 0) { setError('Add at least one line item with a quantity and rate'); return; }
    setBusy(true);
    setError(null);
    try {
      await data.post('/purchase-orders', { vendorId: Number(vendorId), expectedDelivery: expectedDelivery || undefined, items });
      setShow(false);
      refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Could not create purchase order');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fade-in">
      <PageHeader
        title="Purchase Orders"
        subtitle={`${currency(spend.reduce((s: number, r: any) => s + Number(r.totalAmount), 0))} committed to vendors`}
        actions={
          <Button onClick={openModal}>
            <Icon name="plus" size={15} /> New purchase order
          </Button>
        }
      />
      {actionError && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{actionError}</p>}
      <DataTable
        columns={[
          { key: 'businessId', label: 'PO No.' },
          { key: 'vendor.name', label: 'Vendor', search: true },
          { key: 'items', label: 'Items', render: (r) => <span className="tabular-nums text-ink-2">{r.items?.length ?? 0}</span> },
          { key: 'totalAmount', label: 'Total', render: (r) => <MoneyCell value={r.totalAmount} /> },
          { key: 'expectedDelivery', label: 'Expected', render: (r) => fmtDate(r.expectedDelivery) },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          {
            key: '_actions',
            label: 'Actions',
            render: (r) => (
              <ActionMenu
                items={[
                  { label: 'Approve', icon: <Icon name="check" size={14} />, onClick: () => act(`/purchase-orders/${r.id}/approve`) },
                  { label: 'Send', icon: <Icon name="send" size={14} />, onClick: () => act(`/purchase-orders/${r.id}/send`) },
                  { label: 'Complete', onClick: () => act(`/purchase-orders/${r.id}/complete`) },
                ]}
              />
            ),
          },
        ]}
        rows={rows}
        loading={loading}
        searchKeys={['businessId', 'vendor.name']}
        searchPlaceholder="Search purchase orders…"
        emptyTitle="No purchase orders"
      />

      <Modal open={show} onClose={() => setShow(false)} title="New purchase order" wide>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Vendor *</label>
            <Select value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
              <option value="">Select vendor…</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Expected delivery</label>
            <Input type="date" value={expectedDelivery} onChange={(e) => setExpectedDelivery(e.target.value)} />
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">Line items</label>
            <button
              onClick={() => setLines([...lines, { skuId: '', quantity: '', rate: '' }])}
              className="inline-flex items-center gap-1 text-xs font-semibold text-ink-2 hover:text-ink"
            >
              <Icon name="plus" size={13} /> Add line
            </button>
          </div>
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_5rem_6rem_1.5rem] items-center gap-2">
                <Select className="w-full" value={l.skuId} onChange={(e) => pickSku(i, e.target.value)}>
                  <option value="">Select SKU…</option>
                  {skus.map((s) => <option key={s.id} value={s.id}>{s.sku} · {s.name}</option>)}
                </Select>
                <Input type="number" placeholder="Qty" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
                <Input type="number" placeholder="Rate" value={l.rate} onChange={(e) => setLine(i, { rate: e.target.value })} />
                <button
                  onClick={() => setLines(lines.length > 1 ? lines.filter((_, idx) => idx !== i) : lines)}
                  aria-label="Remove line"
                  className="flex h-8 w-6 items-center justify-center text-slate-400 hover:text-rose-600"
                >
                  <Icon name="x" size={14} />
                </button>
              </div>
            ))}
          </div>
          <p className="mt-3 text-right text-sm text-muted">Total <span className="ml-2 font-semibold text-ink">{currency(total, 2)}</span></p>
        </div>

        {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setShow(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !valid}>{busy ? 'Creating…' : 'Create PO'}</Button>
        </div>
      </Modal>
    </div>
  );
}
