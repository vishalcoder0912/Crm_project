import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, StatusBadge, FilterSelect, Toolbar, Badge } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { useCollection, fmtDate } from '../lib/hooks';
import { Icon } from '../components/icons';

const CHANNELS = [
  { key: 'WHATSAPP', label: 'WhatsApp', icon: 'whatsapp' },
  { key: 'EMAIL', label: 'Email', icon: 'mail' },
  { key: 'SMS', label: 'SMS', icon: 'message' },
  { key: 'CALL', label: 'Call', icon: 'phone' },
  { key: 'NOTE', label: 'Note', icon: 'fileText' },
];

export default function Communications() {
  const { rows, loading } = useCollection('/communications');
  const [type, setType] = useState('');
  const [direction, setDirection] = useState('');

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) => (!type || r.type === type) && (!direction || r.direction === direction)
      ),
    [rows, type, direction]
  );

  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach((r) => {
      map[r.type] = (map[r.type] ?? 0) + 1;
    });
    return map;
  }, [rows]);

  return (
    <div className="fade-in space-y-5">
      <PageHeader
        title="Communications"
        subtitle="Every customer interaction across WhatsApp, email, SMS, calls and internal notes."
      />

      <Toolbar>
        <div className="flex flex-wrap gap-2">
          {CHANNELS.map((c) => (
            <button
              key={c.key}
              onClick={() => setType(type === c.key ? '' : c.key)}
              className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition ${
                type === c.key
                  ? 'border-brand-500 bg-selected text-ink'
                  : 'border-line bg-white text-ink-2 hover:border-brand-300'
              }`}
            >
              <Icon name={c.icon} size={15} />
              {c.label}
              <span className="text-muted">{byType[c.key] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <FilterSelect value={direction} onChange={(e) => setDirection(e.target.value)}>
            <option value="">All directions</option>
            <option value="OUTBOUND">Outbound</option>
            <option value="INBOUND">Inbound</option>
          </FilterSelect>
        </div>
      </Toolbar>

      <DataTable
        columns={[
          {
            key: 'type',
            label: 'Channel',
            render: (r) => (
              <Badge tone={r.type === 'WHATSAPP' ? 'emerald' : r.type === 'EMAIL' ? 'sky' : 'slate'}>
                {r.type}
              </Badge>
            ),
          },
          { key: 'direction', label: 'Direction', render: (r) => <StatusBadge status={r.direction} /> },
          {
            key: 'customer',
            label: 'Customer',
            render: (r) => {
              const custId = r.customerId ?? r.customer?.id;
              const name = r.customer?.name ?? '—';
              return (
                <div>
                  {custId ? (
                    <Link to={`/customers/${custId}`} className="font-semibold text-ink hover:text-brand-800 hover:underline">
                      {name}
                    </Link>
                  ) : (
                    <p className="font-medium text-ink">{name}</p>
                  )}
                  <p className="text-xs text-muted">{r.customer?.phone ?? r.recipientPhone ?? ''}</p>
                </div>
              );
            },
          },
          {
            key: 'message',
            label: 'Message',
            render: (r) => (
              <div className="max-w-md">
                {r.subject && <p className="text-[13px] font-medium text-ink-2">{r.subject}</p>}
                <p className="truncate text-[13px] text-muted">{r.message}</p>
              </div>
            ),
          },
          {
            key: 'order',
            label: 'Order',
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
          { key: 'deliveryStatus', label: 'Delivery', render: (r) => <StatusBadge status={r.deliveryStatus} dot={false} /> },
          { key: 'createdAt', label: 'Sent', render: (r) => fmtDate(r.createdAt) },
        ]}
        rows={filtered}
        loading={loading}
        searchKeys={['subject', 'message', 'customer.name', 'recipientPhone', 'recipientEmail']}
        searchPlaceholder="Search communications…"
        emptyTitle="No communications"
        emptyHint="Logged customer interactions will appear here."
      />
    </div>
  );
}
