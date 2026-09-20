import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Avatar, Badge, Button, EmptyState, KpiCard, Panel, Skeleton, StatusBadge, Tabs } from '../components/ui';
import { Icon } from '../components/icons';
import { data } from '../lib/data';
import { currency, fmtDate } from '../lib/hooks';

export default function CustomerDetail() {
  const { id } = useParams();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [related, setRelated] = useState<{ enquiries: any[]; orders: any[]; payments: any[]; followUps: any[]; communications: any[]; measurements: any[]; quotations: any[] }>({
    enquiries: [],
    orders: [],
    payments: [],
    followUps: [],
    communications: [],
    measurements: [],
    quotations: [],
  });

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      data.one(`/customers/${id}`),
      data.list(`/enquiries?customerId=${id}&pageSize=100`),
      data.list('/orders?pageSize=200'),
      data.list('/payments?pageSize=200'),
      data.list(`/follow-ups?customerId=${id}&pageSize=100`),
      data.list(`/communications?customerId=${id}&pageSize=100`),
      data.list(`/measurements?customerId=${id}&pageSize=100`),
      data.list('/quotations?pageSize=200'),
    ])
      .then(([cust, enquiries, orders, payments, followUps, communications, measurements, quotations]) => {
        setCustomer(cust);
        setRelated({
          enquiries,
          orders: orders.filter((o: any) => o.customerId === Number(id)),
          payments: payments.filter((p: any) => p.customerId === Number(id)),
          followUps,
          communications,
          measurements,
          quotations: quotations.filter((q: any) => q.customerId === Number(id)),
        });
      })
      .catch(() => setCustomer(null))
      .finally(() => setLoading(false));
  }, [id]);

  const totals = useMemo(() => {
    const orderValue = related.orders.reduce((s, o) => s + Number(o.totalAmount ?? 0), 0);
    const paid = related.payments.filter((p) => p.status === 'CONFIRMED').reduce((s, p) => s + Number(p.amount ?? 0), 0);
    const outstanding = related.orders.reduce((s, o) => s + Number(o.balanceAmount ?? 0), 0);
    const pendingFollowUps = related.followUps.filter((f) => f.status === 'PENDING').length;
    return { orderValue, paid, outstanding, pendingFollowUps };
  }, [related]);

  if (loading && !customer) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }
  if (!customer) return <EmptyState title="Customer not found" hint="It may have been removed" />;

  const c = customer;
  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'enquiries', label: 'Enquiries', count: related.enquiries.length },
    { key: 'quotations', label: 'Quotations', count: related.quotations.length },
    { key: 'orders', label: 'Orders', count: related.orders.length },
    { key: 'payments', label: 'Payments', count: related.payments.length },
    { key: 'followups', label: 'Follow-ups', count: related.followUps.length },
    { key: 'comms', label: 'Communications', count: related.communications.length },
  ];

  const timeline = [
    ...related.enquiries.map((e) => ({ id: `e${e.id}`, icon: 'enquiries', title: `Enquiry ${e.businessId}`, sub: e.status, at: e.createdAt })),
    ...related.orders.map((o) => ({ id: `o${o.id}`, icon: 'orders', title: `Order ${o.businessId}`, sub: o.status, at: o.createdAt })),
    ...related.payments.map((p) => ({ id: `p${p.id}`, icon: 'payments', title: `Payment ${currency(p.amount)}`, sub: p.status, at: p.paymentDate })),
    ...related.followUps.map((f) => ({ id: `f${f.id}`, icon: 'bell', title: f.purpose, sub: f.status, at: f.dueAt })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 10);

  return (
    <div className="fade-in space-y-6">
      <Link to="/customers" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-brand-800">
        <Icon name="arrowLeft" size={16} /> Back to customers
      </Link>

      <div className="relative overflow-hidden rounded-xl border border-line/80 bg-white p-6 shadow-[var(--shadow-card)]">
        <div className="absolute inset-x-0 top-0 h-24 brand-gradient opacity-10" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Avatar name={c.name} size={64} />
            <div>
              <h1 className="text-xl font-bold text-ink">{c.name}</h1>
              <p className="text-sm text-muted">{c.businessId}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted">
                <span className="inline-flex items-center gap-1.5"><Icon name="phone" size={14} /> {c.phone}</span>
                {c.email && <span className="inline-flex items-center gap-1.5"><Icon name="mail" size={14} /> {c.email}</span>}
                {c.address && <span className="inline-flex items-center gap-1.5"><Icon name="building" size={14} /> {c.address}</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink-2 transition hover:bg-slate-50">
              <Icon name="phone" size={15} /> Call
            </a>
            <a href={`https://wa.me/91${String(c.phone).replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100">
              <Icon name="whatsapp" size={15} /> WhatsApp
            </a>
            {c.email && (
              <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink-2 transition hover:bg-slate-50">
                <Icon name="mail" size={15} /> Email
              </a>
            )}
            <Link to="/enquiries" className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink-2 transition hover:bg-slate-50">
              <Icon name="enquiries" size={15} /> New enquiry
            </Link>
            <Link to="/quotations" className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink-2 transition hover:bg-slate-50">
              <Icon name="quotations" size={15} /> New quote
            </Link>
            <Button onClick={() => setTab('followups')}><Icon name="bell" size={15} /> Follow-up</Button>
          </div>
        </div>
        <div className="relative mt-4 flex flex-wrap gap-2">
          {c.assignedEmployee && <Badge tone="brand">Owner: {typeof c.assignedEmployee === 'object' ? `${c.assignedEmployee.firstName} ${c.assignedEmployee.lastName}` : c.assignedEmployee}</Badge>}
          {c.branch && <Badge tone="sky">Branch: {c.branch.name ?? c.branch}</Badge>}
          {c.notes && <Badge tone="slate">{c.notes}</Badge>}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Order value" value={currency(totals.orderValue)} icon={<Icon name="orders" />} tone="brand" onClick={() => setTab('orders')} />
        <KpiCard label="Paid" value={currency(totals.paid)} icon={<Icon name="wallet" />} tone="emerald" onClick={() => setTab('payments')} />
        <KpiCard label="Outstanding" value={currency(totals.outstanding)} icon={<Icon name="clock" />} tone="amber" onClick={() => setTab('orders')} />
        <KpiCard label="Pending follow-ups" value={totals.pendingFollowUps} icon={<Icon name="bell" />} tone={totals.pendingFollowUps > 0 ? 'rose' : 'slate'} onClick={() => setTab('followups')} />
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'overview' && (
        <div className="grid gap-6 xl:grid-cols-3">
          <Panel className="xl:col-span-2" title="Activity timeline" subtitle="Everything that happened with this customer" icon={<Icon name="clock" />}>
            <div className="space-y-4">
              {timeline.length === 0 && <p className="text-sm text-muted">No activity yet.</p>}
              {timeline.map((t) => {
                const isOrder = t.id.startsWith('o');
                const isEnquiry = t.id.startsWith('e');
                const isPayment = t.id.startsWith('p');
                const isFollowUp = t.id.startsWith('f');
                const linkTarget = isOrder
                  ? `/orders?open=${t.title.replace('Order ', '')}`
                  : isEnquiry
                  ? '/enquiries'
                  : isPayment
                  ? '/payments'
                  : isFollowUp
                  ? '/follow-ups'
                  : null;

                return (
                  <div key={t.id} className="flex gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-muted">
                      <Icon name={t.icon} size={15} />
                    </span>
                    <div className="min-w-0 flex-1 border-b border-slate-50 pb-3">
                      {linkTarget ? (
                        <Link to={linkTarget} className="text-sm font-medium text-ink hover:text-brand-800 hover:underline">
                          {t.title} →
                        </Link>
                      ) : (
                        <p className="text-sm font-medium text-ink">{t.title}</p>
                      )}
                      <p className="text-xs text-muted">{(t.sub || '').replace(/_/g, ' ')} · {fmtDate(t.at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
          <div className="space-y-6">
            <Panel title="Sites" subtitle={`${(c.sites ?? []).length} location(s)`} icon={<Icon name="building" />}>
              <div className="space-y-3">
                {(c.sites ?? []).length === 0 && <p className="text-sm text-muted">No sites on record.</p>}
                {(c.sites ?? []).map((s: any) => (
                  <div key={s.id} className="rounded-xl border border-line-soft p-3">
                    <p className="text-sm font-medium text-ink">{s.name}</p>
                    <p className="text-xs text-muted">{s.address ?? '—'}</p>
                    <p className="mt-1 text-xs text-muted">{s.city} {s.pincode}</p>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="Measurements" subtitle={`${related.measurements.length} visits`} icon={<Icon name="inventory" />}>
              <div className="space-y-3">
                {related.measurements.length === 0 && <p className="text-sm text-muted">No measurements.</p>}
                {related.measurements.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between">
                    <span className="text-sm text-ink-2">{m.businessId}</span>
                    <StatusBadge status={m.status} />
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      )}

      {tab !== 'overview' && (
        <Panel
          title={tabs.find((t) => t.key === tab)?.label}
          subtitle="Related records (click to view details)"
          icon={<Icon name="grid" />}
        >
          {tab === 'enquiries' && (
            <SimpleList
              rows={related.enquiries}
              empty="No enquiries"
              to={() => '/enquiries'}
              render={(e) => ({ title: e.businessId, sub: e.source ?? e.productType ?? '—', status: e.status })}
            />
          )}
          {tab === 'quotations' && (
            <SimpleList
              rows={related.quotations}
              empty="No quotations"
              to={() => '/quotations'}
              render={(q) => ({ title: q.businessId, sub: currency(q.totalAmount ?? q.versions?.[0]?.totalAmount ?? 0), status: q.status })}
            />
          )}
          {tab === 'orders' && (
            <SimpleList
              rows={related.orders}
              empty="No orders"
              to={(o) => `/orders?open=${o.businessId}`}
              render={(o) => ({ title: o.businessId, sub: currency(o.totalAmount), status: o.status })}
            />
          )}
          {tab === 'payments' && (
            <SimpleList
              rows={related.payments}
              empty="No payments"
              to={() => '/payments'}
              render={(p) => ({ title: p.businessId ?? p.paymentNo ?? 'Payment', sub: `${currency(p.amount)} · ${p.paymentType ?? p.type ?? ''}`, status: p.status })}
            />
          )}
          {tab === 'followups' && (
            <SimpleList
              rows={related.followUps}
              empty="No follow-ups"
              to={() => '/follow-ups'}
              render={(f) => ({ title: f.purpose, sub: `due ${fmtDate(f.dueAt)}`, status: f.status })}
            />
          )}
          {tab === 'comms' && (
            <SimpleList
              rows={related.communications}
              empty="No communications"
              to={() => '/communications'}
              render={(m) => ({ title: m.subject ?? m.type, sub: m.message ?? '—', status: m.type })}
            />
          )}
        </Panel>
      )}
    </div>
  );
}

function SimpleList({
  rows,
  empty,
  to,
  render,
}: {
  rows: any[];
  empty: string;
  to?: (row: any) => string;
  render: (row: any) => { title: string; sub: string; status?: string };
}) {
  if (rows.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <div className="divide-y divide-line-soft">
      {rows.map((r) => {
        const v = render(r);
        const link = to ? to(r) : null;
        return (
          <div key={r.id} className="flex items-center justify-between gap-3 py-3 transition hover:bg-slate-50/70 px-2 rounded-lg">
            <div className="min-w-0">
              {link ? (
                <Link to={link} className="truncate text-sm font-semibold text-ink hover:text-brand-800 hover:underline">
                  {v.title} →
                </Link>
              ) : (
                <p className="truncate text-sm font-medium text-ink">{v.title}</p>
              )}
              <p className="truncate text-xs text-muted">{v.sub}</p>
            </div>
            {v.status && <StatusBadge status={v.status} />}
          </div>
        );
      })}
    </div>
  );
}
