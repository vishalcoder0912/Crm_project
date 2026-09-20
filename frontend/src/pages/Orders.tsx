// hello this is vishal project
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader, Button, StatusBadge } from '../components/ui';
import { DataTable, ActionMenu, MoneyCell } from '../components/DataTable';
import { useCollection, fmtDate } from '../lib/hooks';
import { data } from '../lib/data';
import { Icon } from '../components/icons';

const ORDER_FLOW = ['CONFIRMED', 'PROCUREMENT_PENDING', 'MATERIAL_AVAILABLE', 'TAILORING', 'READY_FOR_QC', 'QC_PASSED', 'PACKED', 'INSTALLATION_SCHEDULED', 'INSTALLATION_IN_PROGRESS', 'DELIVERED', 'COMPLETED', 'CLOSED'];

export default function Orders() {
  const navigate = useNavigate();
  const { rows, loading, refresh } = useCollection('/orders');
  const [selected, setSelected] = useState<any>(null);
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    const id = params.get('open');
    if (id && rows.length) {
      const hit = rows.find((r: any) => r.businessId === id);
      if (hit) setSelected(hit);
    }
  }, [params, rows]);

  const nextStatus = (r: any) => {
    const idx = ORDER_FLOW.indexOf(r.status);
    return idx >= 0 && idx < ORDER_FLOW.length - 1 ? ORDER_FLOW[idx + 1] : null;
  };

  return (
    <div className="fade-in">
      <PageHeader
        title="Orders"
        subtitle={`${rows.length} orders · auto-updates payment & delivery status`}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate('/quotations')}>
              <Icon name="quotations" size={15} /> From quotations
            </Button>
            <Button variant="secondary" onClick={() => navigate('/payments')}>
              <Icon name="payments" size={15} /> View payments
            </Button>
          </div>
        }
      />
      <DataTable
        onRowClick={(r) => setSelected(r)}
        columns={[
          { key: 'businessId', label: 'Order ID' },
          {
            key: 'customer',
            label: 'Customer',
            search: true,
            render: (r) => {
              const custId = r.customerId || r.customer?.id;
              const name = r.customer?.name ?? r.customerName ?? '—';
              return custId ? (
                <Link
                  to={`/customers/${custId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-semibold text-ink hover:text-brand-800 hover:underline"
                >
                  {name}
                </Link>
              ) : (
                <span className="font-medium text-ink-2">{name}</span>
              );
            },
          },
          { key: 'items', label: 'Items', render: (r) => <span className="tabular-nums text-ink-2">{r.items?.length ?? r.itemsCount ?? 0}</span> },
          { key: 'totalAmount', label: 'Total', render: (r) => <MoneyCell value={r.totalAmount} /> },
          { key: 'balanceAmount', label: 'Balance', render: (r) => <MoneyCell value={r.balanceAmount} /> },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'paymentStatus', label: 'Payment', render: (r) => <StatusBadge status={r.paymentStatus} /> },
          {
            key: '_actions',
            label: 'Actions',
            render: (r) => {
              const nx = nextStatus(r);
              const custId = r.customerId || r.customer?.id;
              return (
                <ActionMenu
                  items={[
                    ...(custId
                      ? [{ label: 'View customer', icon: <Icon name="customers" size={14} />, onClick: () => navigate(`/customers/${custId}`) }]
                      : []),
                    { label: 'Payments', icon: <Icon name="payments" size={14} />, onClick: () => navigate('/payments') },
                    { label: 'Tailoring', icon: <Icon name="tailoring" size={14} />, onClick: () => navigate('/tailoring') },
                    { label: 'Installation', icon: <Icon name="installations" size={14} />, onClick: () => navigate('/installations') },
                    ...(nx
                      ? [{ label: `→ ${nx.replace(/_/g, ' ')}`, onClick: () => data.post(`/orders/${r.id}/status`, { status: nx }).then(refresh) }]
                      : []),
                    { label: 'Details', icon: <Icon name="quotations" size={14} />, onClick: () => setSelected(r) },
                  ]}
                />
              );
            },
          },
        ]}
        rows={rows}
        loading={loading}
        searchKeys={['businessId', 'customer.name', 'customerName']}
        searchPlaceholder="Search orders…"
        emptyTitle="No orders yet"
      />

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="fade-in relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-ink">{selected.businessId}</h3>
                {(selected.customerId || selected.customer?.id) ? (
                  <Link
                    to={`/customers/${selected.customerId || selected.customer?.id}`}
                    className="text-sm font-medium text-brand-800 hover:underline"
                  >
                    {selected.customer?.name ?? selected.customerName ?? '—'} (View profile →)
                  </Link>
                ) : (
                  <p className="text-sm text-muted">{selected.customer?.name ?? selected.customerName ?? '—'}</p>
                )}
              </div>
              <StatusBadge status={selected.status} />
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Items</dt><dd className="font-medium">{selected.items?.length ?? selected.itemsCount ?? '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Created</dt><dd className="text-ink-2">{fmtDate(selected.createdAt)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Total</dt><dd className="font-semibold"><MoneyCell value={selected.totalAmount} /></dd></div>
              <div className="flex justify-between"><dt className="text-muted">Advance</dt><dd><MoneyCell value={selected.advanceAmount} /></dd></div>
              <div className="flex justify-between"><dt className="text-muted">Balance</dt><dd className="font-semibold text-rose-600"><MoneyCell value={selected.balanceAmount} /></dd></div>
              <div className="flex justify-between"><dt className="text-muted">Payment</dt><dd><StatusBadge status={selected.paymentStatus} /></dd></div>
            </dl>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-line-soft pt-3">
              <span className="w-full text-xs font-semibold uppercase tracking-wider text-muted">Jump to module</span>
              <button
                onClick={() => navigate('/payments')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs font-medium text-ink-2 hover:bg-slate-100"
              >
                <Icon name="payments" size={13} /> Payments
              </button>
              <button
                onClick={() => navigate('/tailoring')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs font-medium text-ink-2 hover:bg-slate-100"
              >
                <Icon name="tailoring" size={13} /> Tailoring
              </button>
              <button
                onClick={() => navigate('/qc')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs font-medium text-ink-2 hover:bg-slate-100"
              >
                <Icon name="qc" size={13} /> Quality Control
              </button>
              <button
                onClick={() => navigate('/installations')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs font-medium text-ink-2 hover:bg-slate-100"
              >
                <Icon name="installations" size={13} /> Installations
              </button>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setParams({}); setSelected(null); }}>Close</Button>
              <Button variant="secondary" onClick={() => data.list(`/orders/${selected.id}/status-history`).then((h: any[]) => { setSelected({ ...selected, history: h }); })}>
                Load history
              </Button>
            </div>
            {selected.history && (
              <div className="mt-4 border-t border-line-soft pt-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Status history</p>
                <div className="space-y-1.5">
                  {(selected.history as any[]).map((h: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-ink-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-400" /> {h.fromStatus ?? '—'} → <span className="font-medium text-ink">{h.toStatus}</span>
                      </span>
                      <span className="text-xs text-muted">{fmtDate(h.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}