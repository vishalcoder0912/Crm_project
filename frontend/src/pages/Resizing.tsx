// hello this is vishal project
import { PageHeader, StatusBadge } from '../components/ui';
import { DataTable, ActionMenu } from '../components/DataTable';
import { useCollection, fmtDate } from '../lib/hooks';
import { data } from '../lib/data';
import { Icon } from '../components/icons';

const FLOW = ['CREATED', 'TAILORING', 'QC', 'PACKED', 'REINSTALLATION_SCHEDULED', 'COMPLETED'];

export default function Resizing() {
  const { rows, loading, refresh } = useCollection('/resizing');

  return (
    <div className="fade-in">
      <PageHeader title="Resizing & Rework" subtitle="Post-delivery rectifications and alterations" />
      <DataTable
        columns={[
          { key: 'businessId', label: 'Request' },
          { key: 'orderItem.productName', label: 'Item', search: true },
          { key: 'orderItem.orderId', label: 'Order', render: (r) => <span className="text-ink-2">#{r.orderItem?.orderId ?? '—'}</span> },
          { key: 'reason', label: 'Reason', search: true },
          { key: 'createdAt', label: 'Raised', render: (r) => fmtDate(r.createdAt) },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          {
            key: '_actions',
            label: 'Actions',
            render: (r) => {
              const idx = FLOW.indexOf(r.status);
              const next = idx >= 0 && idx < FLOW.length - 1 ? FLOW[idx + 1] : null;
              return next ? (
                <ActionMenu items={[{ label: `→ ${next.replace(/_/g, ' ')}`, icon: <Icon name="check" size={14} />, onClick: () => data.post(`/resizing/${r.id}/status`, { status: next }).then(refresh) }]} />
              ) : (
                <span className="text-xs text-slate-300">Closed</span>
              );
            },
          },
        ]}
        rows={rows}
        loading={loading}
        searchKeys={['businessId', 'orderItem.productName', 'reason']}
        searchPlaceholder="Search resizing requests…"
        emptyTitle="No resizing requests"
      />
    </div>
  );
}