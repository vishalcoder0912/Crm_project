// hello this is vishal project
import { useEffect, useState } from 'react';
import { PageHeader, Button, Modal, Input, Select, StatusBadge } from '../components/ui';
import { DataTable, ActionMenu } from '../components/DataTable';
import { useCollection } from '../lib/hooks';
import { data } from '../lib/data';
import { Icon } from '../components/icons';

export default function Inventory() {
  const { rows, loading, refresh } = useCollection('/inventory');
  const [adjust, setAdjust] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [opts, setOpts] = useState<any>({ operation: 'ADD', quantity: '', reason: '' });
  const [error, setError] = useState<string | null>(null);

  const [restockOpen, setRestockOpen] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [skus, setSkus] = useState<any[]>([]);
  const [req, setReq] = useState<any>({ orderId: '', skuId: '', requestedQty: '', warehouse: 'MAIN', notes: '' });
  const [reqBusy, setReqBusy] = useState(false);
  const [reqError, setReqError] = useState<string | null>(null);
  const [reqDone, setReqDone] = useState<string | null>(null);

  const isLow = (r: any) => Number(r.availableQty) <= 10;
  const lowCount = rows.filter(isLow).length;

  useEffect(() => {
    data.list('/orders?pageSize=200').then(setOrders).catch(() => setOrders([]));
    data.list('/skus?pageSize=200').then(setSkus).catch(() => setSkus([]));
  }, []);

  const openAdjust = (r: any) => {
    setError(null);
    setOpts({ operation: 'ADD', quantity: '', reason: '' });
    setAdjust(r);
  };

  const submit = async () => {
    const qty = Number(opts.quantity);
    if (!qty || qty <= 0) {
      setError('Enter a quantity greater than zero');
      return;
    }
    if (!opts.reason.trim()) {
      setError('A reason is required for stock adjustments');
      return;
    }
    const delta =
      opts.operation === 'ADD' ? qty : opts.operation === 'REMOVE' ? -qty : qty - Number(adjust.availableQty);
    if (delta === 0) {
      setError('That leaves stock unchanged');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await data.post(`/inventory/${adjust.id}/adjust`, { delta, reason: opts.reason });
      setAdjust(null);
      refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Could not apply adjustment');
    } finally {
      setBusy(false);
    }
  };

  const openRestock = () => {
    const low = [...rows].filter(isLow).sort((a, b) => Number(a.availableQty) - Number(b.availableQty))[0];
    setReqError(null);
    setReqDone(null);
    setReq({
      orderId: '',
      skuId: low?.skuId ? String(low.skuId) : '',
      requestedQty: '',
      warehouse: low?.warehouse ?? 'MAIN',
      notes: low ? `Replenish ${low.sku?.sku ?? 'low stock'} (available ${low.availableQty} ${low.unit ?? ''})`.trim() : '',
    });
    setRestockOpen(true);
  };

  const submitRestock = async () => {
    if (!req.orderId || !req.skuId || !req.requestedQty) {
      setReqError('Order, SKU and quantity are required');
      return;
    }
    setReqBusy(true);
    setReqError(null);
    try {
      const created: any = await data.post('/stock-requests', {
        orderId: Number(req.orderId),
        skuId: Number(req.skuId),
        requestedQty: Number(req.requestedQty),
        warehouse: req.warehouse || 'MAIN',
        notes: req.notes || undefined,
      });
      setReqDone(created?.businessId ?? 'Stock request created');
    } catch (e: any) {
      setReqError(e?.message ?? 'Could not create stock request');
    } finally {
      setReqBusy(false);
    }
  };

  return (
    <div className="fade-in">
      <PageHeader
        title="Inventory"
        subtitle={`${rows.length} stock lines · ${lowCount} below reorder level`}
        actions={
          lowCount > 0 && (
            <Button variant="secondary" onClick={openRestock}>
              <Icon name="stockrequests" size={15} /> Request restock
            </Button>
          )
        }
      />
      <DataTable
        columns={[
          { key: 'sku', label: 'SKU', render: (r) => <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-ink-2">{r.sku?.sku}</code> },
          { key: 'sku.name', label: 'Product', search: true },
          { key: 'warehouse', label: 'Warehouse', search: true },
          {
            key: 'availableQty',
            label: 'Available',
            render: (r) => (
              <span className={`inline-flex items-center gap-2 font-semibold tabular-nums ${isLow(r) ? 'text-rose-600' : 'text-ink'}`}>
                {r.availableQty} {r.unit}
                {isLow(r) && <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">LOW</span>}
              </span>
            ),
          },
          { key: 'reservedQty', label: 'Reserved', render: (r) => <span className="tabular-nums text-muted">{r.reservedQty}</span> },
          { key: 'issuedQty', label: 'Issued', render: (r) => <span className="tabular-nums text-muted">{r.issuedQty}</span> },
          {
            key: '_actions',
            label: 'Actions',
            render: (r) => (
              <ActionMenu
                items={[
                  { label: 'Adjust', icon: <Icon name="edit" size={14} />, onClick: () => openAdjust(r) },
                ]}
              />
            ),
          },
        ]}
        rows={rows}
        loading={loading}
        searchKeys={['sku.sku', 'sku.name', 'warehouse']}
        searchPlaceholder="Search inventory…"
        emptyTitle="No stock recorded"
      />

      <Modal open={!!adjust} onClose={() => setAdjust(null)} title={`Adjust stock · ${adjust?.sku?.sku ?? ''}`}>
        <div className="mb-4 rounded-lg bg-slate-50 px-4 py-3 text-sm">
          <p className="text-muted">Current available</p>
          <p className="text-xl font-bold text-ink">{adjust?.availableQty} {adjust?.unit}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="mb-1 block text-xs font-medium text-ink-2">Operation</label>
            <Select value={opts.operation} onChange={(e) => setOpts({ ...opts, operation: e.target.value })}>
              <option value="ADD">Add stock (+)</option>
              <option value="REMOVE">Remove (−)</option>
              <option value="SET">Set to</option>
            </Select>
          </div>
          <div><label className="mb-1 block text-xs font-medium text-ink-2">Quantity</label>
            <Input type="number" value={opts.quantity} onChange={(e) => setOpts({ ...opts, quantity: e.target.value })} />
          </div>
          <div className="col-span-2"><label className="mb-1 block text-xs font-medium text-ink-2">Reason *</label>
            <Input value={opts.reason} onChange={(e) => setOpts({ ...opts, reason: e.target.value })} placeholder="e.g. GRN from vendor, damaged, cycle count" />
          </div>
        </div>
        {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setAdjust(null)}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !opts.quantity || !opts.reason.trim()}>{busy ? 'Saving…' : 'Apply adjustment'}</Button>
        </div>
      </Modal>

      <Modal open={restockOpen} onClose={() => setRestockOpen(false)} title="Request restock" wide>
        {reqDone ? (
          <>
            <div className="flex items-start gap-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <Icon name="checkCircle" size={18} />
              <p>Stock request <span className="font-semibold">{reqDone}</span> created as DRAFT. Submit it from Stock Requests to start the approval flow.</p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRestockOpen(false)}>Close</Button>
              <Button onClick={openRestock}>Create another</Button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted">Stock requests are raised against an order. This reduces nothing until the request is approved and issued.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted">Order *</label>
                <Select value={req.orderId} onChange={(e) => setReq({ ...req, orderId: e.target.value })}>
                  <option value="">Select order…</option>
                  {orders.map((o) => <option key={o.id} value={o.id}>{o.businessId} · {o.customer?.name ?? '—'}</option>)}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">SKU *</label>
                <Select value={req.skuId} onChange={(e) => setReq({ ...req, skuId: e.target.value })}>
                  <option value="">Select SKU…</option>
                  {skus.map((s) => <option key={s.id} value={s.id}>{s.sku} · {s.name}</option>)}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Requested qty *</label>
                <Input type="number" value={req.requestedQty} onChange={(e) => setReq({ ...req, requestedQty: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Warehouse</label>
                <Input value={req.warehouse} onChange={(e) => setReq({ ...req, warehouse: e.target.value })} placeholder="MAIN" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted">Notes</label>
                <Input value={req.notes} onChange={(e) => setReq({ ...req, notes: e.target.value })} placeholder="Why this restock is needed" />
              </div>
            </div>
            {reqError && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{reqError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRestockOpen(false)}>Cancel</Button>
              <Button onClick={submitRestock} disabled={reqBusy || !req.orderId || !req.skuId || !req.requestedQty}>
                {reqBusy ? 'Creating…' : 'Create stock request'}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
