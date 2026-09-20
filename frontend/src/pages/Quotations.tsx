import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, PageHeader, Button, StatusBadge } from '../components/ui';
import { DataTable, ActionMenu, MoneyCell } from '../components/DataTable';
import { useCollection, fmtDate } from '../lib/hooks';
import { data } from '../lib/data';
import { Icon } from '../components/icons';

export default function Quotations() {
  const navigate = useNavigate();
  const { rows, loading, refresh } = useCollection('/quotations');
  const [selected, setSelected] = useState<any>(null);

  const act = (p: string, id: number) => data.post(p, {}).then(refresh);

  return (
    <div className="fade-in">
      <PageHeader
        title="Quotations"
        subtitle={`${rows.length} quotations · versions auto-generated on change`}
        actions={
          <Button variant="secondary" onClick={() => navigate('/enquiries')}>
            <Icon name="enquiries" size={15} /> From enquiries
          </Button>
        }
      />
      <DataTable
        onRowClick={(r) => setSelected(r)}
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
          { key: 'versionLabel', label: 'Version', render: (r) => <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-ink-2">{r.versions?.[r.versions.length - 1]?.versionLabel ?? r.version ?? '—'}</span> },
          { key: 'itemsCount', label: 'Items', render: (r) => <span className="tabular-nums text-ink-2">{r.versions?.[r.versions.length - 1]?.items?.length ?? r.itemsCount ?? 0}</span> },
          { key: 'totalAmount', label: 'Total', render: (r) => <MoneyCell value={r.versions?.[r.versions.length - 1]?.totalAmount ?? r.totalAmount} /> },
          { key: 'validUntil', label: 'Valid till', render: (r) => fmtDate(r.versions?.[r.versions.length - 1]?.validityDate ?? r.validUntil) },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          {
            key: '_actions',
            label: 'Actions',
            render: (r) => {
              const custId = r.customerId || r.customer?.id;
              return (
                <ActionMenu
                  items={[
                    ...(custId
                      ? [{ label: 'View customer', icon: <Icon name="customers" size={14} />, onClick: () => navigate(`/customers/${custId}`) }]
                      : []),
                    ...(r.status === 'ACCEPTED'
                      ? [{ label: 'View orders', icon: <Icon name="orders" size={14} />, onClick: () => navigate('/orders') }]
                      : []),
                    { label: 'Send', icon: <Icon name="send" size={14} />, onClick: () => act(`/quotations/${r.id}/send`, r.id) },
                    { label: 'Accept', icon: <Icon name="check" size={14} />, onClick: () => act(`/quotations/${r.id}/accept`, r.id) },
                    { label: 'Reject', tone: 'danger', onClick: () => act(`/quotations/${r.id}/reject`, r.id) },
                    { label: 'Versions', onClick: () => setSelected({ ...r, showVersions: true }) },
                  ]}
                />
              );
            },
          },
        ]}
        rows={rows}
        loading={loading}
        searchKeys={['businessId', 'customer.name', 'customerName']}
        searchPlaceholder="Search quotations…"
        emptyTitle="No quotations yet"
      />

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="fade-in relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-ink">{selected.businessId} · {selected.versions?.[selected.versions.length - 1]?.versionLabel ?? selected.version ?? 'R1'}</h3>
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
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Items</dt><dd className="font-medium">{selected.versions?.[selected.versions.length - 1]?.items?.length ?? selected.itemsCount ?? '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Total amount</dt><dd className="font-semibold"><MoneyCell value={selected.versions?.[selected.versions.length - 1]?.totalAmount ?? selected.totalAmount} /></dd></div>
              <div className="flex justify-between"><dt className="text-muted">Valid till</dt><dd className="text-ink-2">{fmtDate(selected.versions?.[selected.versions.length - 1]?.validityDate ?? selected.validUntil)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Created</dt><dd className="text-ink-2">{fmtDate(selected.createdAt)}</dd></div>
            </dl>
            <div className="mt-6 flex justify-between gap-2">
              {selected.status === 'ACCEPTED' ? (
                <Button variant="secondary" onClick={() => navigate('/orders')}>
                  <Icon name="orders" size={14} /> Go to orders
                </Button>
              ) : <div />}
              <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}