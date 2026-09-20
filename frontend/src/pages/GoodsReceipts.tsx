import { useEffect, useMemo, useState } from 'react';
import { PageHeader, Button, Modal, Input, Select, StatusBadge } from '../components/ui';
import { DataTable, MoneyCell } from '../components/DataTable';
import { useCollection, fmtDate } from '../lib/hooks';
import { data } from '../lib/data';
import { Icon } from '../components/icons';

export default function GoodsReceipts() {
  const { rows, loading, refresh } = useCollection('/goods-receipts');
  const [open, setOpen] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [poId, setPoId] = useState('');
  const [qty, setQty] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    data.list('/purchase-orders?pageSize=200').then(setOrders).catch(() => setOrders([]));
  }, []);

  const po = useMemo(() => orders.find((o) => String(o.id) === poId), [orders, poId]);

  const openModal = () => {
    setPoId('');
    setQty({});
    setError(null);
    setDone(null);
    setOpen(true);
  };

  const pickPo = (value: string) => {
    setPoId(value);
    setError(null);
    const chosen = orders.find((o) => String(o.id) === value);
    const next: Record<string, string> = {};
    for (const it of chosen?.items ?? []) {
      const remaining = Number(it.quantity) - Number(it.receivedQty ?? 0);
      next[it.skuId] = remaining > 0 ? String(remaining) : '';
    }
    setQty(next);
  };

  const lines = (po?.items ?? []).filter((it: any) => Number(qty[it.skuId]) > 0);

  const submit = async () => {
    if (!poId) { setError('Choose a purchase order'); return; }
    if (lines.length === 0) { setError('Enter a received quantity for at least one line'); return; }
    setBusy(true);
    setError(null);
    try {
      const created: any = await data.post('/goods-receipts', {
        poId: Number(poId),
        items: lines.map((it: any) => ({ skuId: it.skuId, receivedQty: Number(qty[it.skuId]) })),
      });
      setDone(created?.businessId ?? 'Goods receipt created');
      refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Could not create goods receipt');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fade-in">
      <PageHeader
        title="Goods Receipts"
        subtitle="Receiving stock from purchase orders updates the PO and adds to inventory"
        actions={
          <Button onClick={openModal}>
            <Icon name="plus" size={15} /> Receive goods
          </Button>
        }
      />
      <DataTable
        columns={[
          { key: 'businessId', label: 'GRN No.' },
          { key: 'purchaseOrder.businessId', label: 'PO', search: true },
          { key: 'vendor.name', label: 'Vendor', search: true },
          { key: 'items', label: 'Lines', render: (r) => <span className="tabular-nums text-ink-2">{r.items?.length ?? 0}</span> },
          { key: 'receivedDate', label: 'Received', render: (r) => fmtDate(r.receivedDate) },
          { key: 'verifiedBy', label: 'Verified by', render: (r) => <span className="text-ink-2">{r.verifiedBy ? `${r.verifiedBy.firstName} ${r.verifiedBy.lastName}` : '—'}</span> },
        ]}
        rows={rows}
        loading={loading}
        searchKeys={['businessId', 'purchaseOrder.businessId', 'vendor.name']}
        searchPlaceholder="Search goods receipts…"
        emptyTitle="No goods receipts yet"
      />

      <Modal open={open} onClose={() => setOpen(false)} title="Receive goods against a PO" wide>
        {done ? (
          <>
            <div className="flex items-start gap-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <Icon name="checkCircle" size={18} />
              <p>Goods receipt <span className="font-semibold">{done}</span> created. Purchase order receipt and inventory were updated.</p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>Close</Button>
              <Button onClick={openModal}>Receive another</Button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-muted">Purchase order *</label>
              <Select value={poId} onChange={(e) => pickPo(e.target.value)}>
                <option value="">Select purchase order…</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>{o.businessId} · {o.vendor?.name ?? '—'} · {o.status}</option>
                ))}
              </Select>
            </div>

            {po && (
              <div className="overflow-hidden rounded-lg border border-line">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line-soft bg-canvas text-[11px] uppercase tracking-wider text-muted">
                      <th className="px-3 py-2 font-semibold">SKU</th>
                      <th className="px-3 py-2 font-semibold">Ordered</th>
                      <th className="px-3 py-2 font-semibold">Received</th>
                      <th className="px-3 py-2 font-semibold">Now receiving</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {(po.items ?? []).map((it: any) => (
                      <tr key={it.skuId}>
                        <td className="px-3 py-2">
                          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-ink-2">{it.sku?.sku ?? it.skuId}</code>
                          <span className="ml-2 text-ink-2">{it.sku?.name ?? ''}</span>
                        </td>
                        <td className="px-3 py-2 tabular-nums text-muted">{it.quantity}</td>
                        <td className="px-3 py-2 tabular-nums text-muted">{it.receivedQty ?? 0}</td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            value={qty[it.skuId] ?? ''}
                            onChange={(e) => setQty({ ...qty, [it.skuId]: e.target.value })}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={busy || !poId || lines.length === 0}>
                {busy ? 'Receiving…' : 'Receive goods'}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
