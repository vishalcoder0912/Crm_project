// hello this is vishal project
import { PageHeader, StatusBadge } from '../components/ui';
import { DataTable, ActionMenu } from '../components/DataTable';
import { useCollection, fmtDate } from '../lib/hooks';
import { data } from '../lib/data';
import { Icon } from '../components/icons';

export default function StockRequests() {
  const { rows, loading, refresh } = useCollection('/stock-requests');
  const act = (p: string, id: number) => data.post(p, {}).then(refresh);

  return (
    <div className="fade-in">
      <PageHeader title="Stock Requests" subtitle="Tailoring requests fabric/accessories against an order; approval issues stock" />
      <DataTable
        columns={[
          { key: 'businessId', label: 'Request' },
          { key: 'order.businessId', label: 'Order', search: true },
          { key: 'sku.name', label: 'SKU / Product', search: true },
          { key: 'requestedQty', label: 'Qty', render: (r) => <span className="tabular-nums font-semibold">{r.requestedQty} {r.sku?.unit}</span> },
          { key: 'createdAt', label: 'Created', render: (r) => fmtDate(r.createdAt) },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          {
            key: '_actions',
            label: 'Actions',
            render: (r) => (
              <ActionMenu
                items={[
                  { label: 'Submit', icon: <Icon name="send" size={14} />, onClick: () => act(`/stock-requests/${r.id}/submit`, r.id) },
                  { label: 'Approve', icon: <Icon name="check" size={14} />, onClick: () => act(`/stock-requests/${r.id}/approve`, r.id) },
                  { label: 'Issue', icon: <Icon name="packing" size={14} />, onClick: () => act(`/stock-requests/${r.id}/issue`, r.id) },
                  { label: 'Cancel', tone: 'danger', onClick: () => act(`/stock-requests/${r.id}/cancel`, r.id) },
                ]}
              />
            ),
          },
        ]}
        rows={rows}
        loading={loading}
        searchKeys={['businessId', 'order.businessId', 'sku.name']}
        searchPlaceholder="Search stock requests…"
        emptyTitle="No stock requests"
      />
    </div>
  );
}