import { PageHeader, StatusBadge } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { useCollection, fmtDate } from '../lib/hooks';

export default function Packing() {
  const { rows, loading } = useCollection('/packing');
  const totalPackets = rows.reduce((s: number, r: any) => s + Number(r.totalPackets ?? 0), 0);

  return (
    <div className="fade-in">
      <PageHeader title="Packing" subtitle={`${rows.length} slips · ${totalPackets} packets prepared`} />
      <DataTable
        columns={[
          { key: 'businessId', label: 'Slip' },
          { key: 'order.businessId', label: 'Order', search: true },
          { key: 'customer.name', label: 'Customer', search: true },
          { key: 'totalPackets', label: 'Packets', render: (r) => <span className="tabular-nums text-ink-2">{r.totalPackets}</span> },
          { key: 'packets', label: 'Items', render: (r) => <span className="tabular-nums text-ink-2">{(r.packets ?? []).reduce((s: number, p: any) => s + (p.items?.length ?? 0), 0)}</span> },
          { key: 'preparedAt', label: 'Packed', render: (r) => fmtDate(r.preparedAt) },
          { key: 'preparedBy', label: 'Prepared by', render: (r) => <span className="text-ink-2">{r.preparedBy ? `${r.preparedBy.firstName} ${r.preparedBy.lastName}` : '—'}</span> },
        ]}
        rows={rows}
        loading={loading}
        searchKeys={['businessId', 'order.businessId', 'customer.name']}
        searchPlaceholder="Search packing slips…"
        emptyTitle="No packing slips yet"
      />
    </div>
  );
}