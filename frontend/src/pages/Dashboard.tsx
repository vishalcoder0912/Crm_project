import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, EmptyState, FilterSelect, KpiCard, Panel, Progress, Skeleton, StatusBadge, Tabs, statusLabel } from '../components/ui';
import { Icon } from '../components/icons';
import { BreakdownBars, FunnelPipeline, GrowthBars, PipelineBoard, RevenueArea } from '../components/charts';
import { data } from '../lib/data';
import { api } from '../lib/api';
import { currency, daysSince, fmtTime, isToday, relativeTime } from '../lib/hooks';

const ACTIVITY_ICONS: Record<string, string> = {
  CREATE: 'plus',
  UPDATE: 'edit',
  STATUS_CHANGE: 'refresh',
  PRICE_CHANGE: 'rupee',
  DELETE: 'x',
  COMPLETE: 'check',
  CONFIRM: 'check',
  SCHEDULE: 'calendar',
};
const NON_BUSINESS = ['LOGIN', 'LOGOUT'];

function pctChange(series: any[], key: string): number | null {
  if (!series || series.length < 2) return null;
  const last = Number(series[series.length - 1]?.[key] ?? 0);
  const prev = Number(series[series.length - 2]?.[key] ?? 0);
  if (prev === 0) return last > 0 ? 100 : null;
  return Math.round(((last - prev) / prev) * 100);
}

const STAGE_GROUPS = [
  { key: 'CONFIRMED', label: 'Confirmed', statuses: ['CONFIRMED'] },
  { key: 'PROCUREMENT', label: 'Procurement', statuses: ['PROCUREMENT_PENDING', 'MATERIAL_AVAILABLE'] },
  { key: 'TAILORING', label: 'Tailoring', statuses: ['TAILORING'] },
  { key: 'QC', label: 'Quality', statuses: ['READY_FOR_QC', 'QC_PASSED', 'QC_FAILED'] },
  { key: 'INSTALLATION', label: 'Installation', statuses: ['PACKED', 'INSTALLATION_SCHEDULED', 'INSTALLATION_IN_PROGRESS', 'PARTIALLY_DELIVERED'] },
];

const FUNNEL_LABELS: Record<string, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  MEASUREMENT_PENDING: 'Measurement',
  MEASURED: 'Measured',
  QUOTATION_PENDING: 'Quoting',
  QUOTATION_SENT: 'Quoted',
  WON: 'Won',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [s, setS] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [branchId, setBranchId] = useState('');
  const [fuTab, setFuTab] = useState('OVERDUE');
  const [fu, setFu] = useState<Record<string, any[]>>({});
  const [period, setPeriod] = useState('6M');

  const load = useCallback(() => {
    setLoading(true);
    data
      .summary('/dashboard/summary', branchId ? { branchId } : undefined)
      .then(setS)
      .catch(() => setS(null))
      .finally(() => setLoading(false));
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    Promise.all(
      ['OVERDUE', 'TODAY', 'UPCOMING'].map((b) =>
        api
          .get('/follow-ups', { bucket: b, pageSize: 5 })
          .then((r) => [b, Array.isArray(r) ? r : r?.items ?? r?.data ?? []] as const)
          .catch(() => [b, []] as const)
      )
    ).then((pairs) => setFu(Object.fromEntries(pairs)));
  }, []);

  if (loading && !s) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid gap-6 xl:grid-cols-3">
          <Skeleton className="h-80 rounded-xl xl:col-span-2" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!s) return <EmptyState title="Could not load dashboard" hint="Check the API connection and try again" />;

  const c = s.counts ?? {};
  const rev = s.revenue ?? {};
  const f = s.followUps ?? {};
  const branches: any[] = s.branches ?? [];
  const atRisk: any[] = s.atRiskEnquiries ?? [];
  const team: any[] = s.teamWorkload ?? [];
  const branchPerf: any[] = (s.branchPerformance ?? []).filter((b: any) => b.orders > 0);
  const sources = (s.enquirySources ?? []).map((x: any) => ({ name: x.source, value: x.count })).sort((a: any, b: any) => b.value - a.value);
  const lost = (s.lostReasons ?? []).map((x: any) => ({ name: x.reason, value: x.count })).sort((a: any, b: any) => b.value - a.value);
  const lostTotal = lost.reduce((sum: number, l: any) => sum + l.value, 0);
  const maxBranchValue = Math.max(...branchPerf.map((b: any) => b.value), 1);

  const revenueSeries = s.revenueSeries ?? [];
  const revenueDelta = pctChange(revenueSeries, 'revenue');
  const awaitingQuotes = (s.quotationStatus ?? [])
    .filter((q: any) => ['DRAFT', 'SENT', 'NEGOTIATION'].includes(q.status))
    .reduce((sum: number, q: any) => sum + q.count, 0);

  const byStatus = new Map((s.ordersByStage ?? []).map((o: any) => [o.status, o]));
  const stages = STAGE_GROUPS.map((g) => {
    let count = 0;
    let value = 0;
    for (const st of g.statuses) {
      const r: any = byStatus.get(st);
      if (r) {
        count += r.count;
        value += r.value;
      }
    }
    return { key: g.key, label: g.label, count, value };
  });

  const attention = [
    { n: f.overdue ?? 0, label: 'overdue follow-ups', to: '/follow-ups', tone: 'rose' },
    { n: c.deliveriesPending ?? 0, label: 'deliveries pending', to: '/orders', tone: 'slate' },
    { n: awaitingQuotes, label: 'quotations awaiting', to: '/quotations', tone: 'slate' },
    { n: atRisk.length, label: 'enquiries at risk', to: '/enquiries', tone: 'rose' },
  ].filter((a) => a.n > 0);

  const activity: any[] = s.recentActivity ?? [];
  const sessionsToday = activity.filter((a) => NON_BUSINESS.includes(a.action) && isToday(a.createdAt)).length;
  const businessActivity = activity.filter((a) => !NON_BUSINESS.includes(a.action)).slice(0, 6);
  const lowStock: any[] = s.lowStockItems ?? [];

  const exportCsv = () => {
    const rows = [['Order', 'Customer', 'Status', 'Amount', 'Created']];
    for (const o of s.recentOrders ?? []) {
      rows.push([o.businessId, o.customer?.name ?? '', statusLabel(o.status), String(o.totalAmount ?? 0), o.createdAt ?? '']);
    }
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aradhana-recent-orders.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const fuBuckets = [
    { key: 'OVERDUE', label: 'Overdue', count: f.overdue ?? 0 },
    { key: 'TODAY', label: 'Today', count: f.today ?? 0 },
    { key: 'UPCOMING', label: 'Upcoming', count: f.upcoming ?? 0 },
  ];

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">Sales &amp; Operations Command Center</h1>
          <p className="mt-1 text-sm text-muted">Monitor customer activity, sales pipeline and operational priorities.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect icon={<Icon name="building" size={14} />} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">All branches</option>
            {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </FilterSelect>
          <FilterSelect icon={<Icon name="calendar" size={14} />} value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="30D">This month</option>
            <option value="6M">Last 6 months</option>
            <option value="12M">Last 12 months</option>
          </FilterSelect>
          <Button variant="secondary" onClick={exportCsv}>
            <Icon name="download" size={15} /> Export
          </Button>
        </div>
      </div>

      {/* Priority strip */}
      <div className="rounded-xl border border-brand-200 bg-brand-50 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-800">Attention</p>
            {attention.length === 0 ? (
              <p className="mt-2 flex items-center gap-2 text-[13px] font-medium text-ink-2">
                <Icon name="checkCircle" size={16} className="text-emerald-600" /> Everything is on track — no overdue items.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1.5">
                {attention.map((a) => (
                  <Link key={a.label} to={a.to} className="group flex items-baseline gap-2 transition hover:opacity-80">
                    <span className="text-[15px] font-bold tabular-nums text-ink">{String(a.n).padStart(2, '0')}</span>
                    <span className="text-[13px] text-ink-2/80 group-hover:underline">{a.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link
            to="/follow-ups"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-[13px] font-semibold text-ink transition hover:bg-brand-400"
          >
            Review priorities <Icon name="arrowRight" size={15} />
          </Link>
        </div>
      </div>

      {/* KPI metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard
          label="Open Enquiries"
          value={String(c.openEnquiries ?? 0).padStart(2, '0')}
          sub={`${c.enquiries ?? 0} total`}
          icon={<Icon name="enquiries" size={17} />}
          onClick={() => navigate('/enquiries')}
          footer={<Link to="/enquiries" className="text-xs font-medium text-brand-800 hover:underline">View enquiries →</Link>}
        />
        <KpiCard
          label="Quotations"
          value={c.quotations ?? 0}
          sub={`${c.acceptedQuotations ?? 0} accepted`}
          icon={<Icon name="quotations" size={17} />}
          onClick={() => navigate('/quotations')}
          footer={<Link to="/quotations" className="text-xs font-medium text-brand-800 hover:underline">View quotations →</Link>}
        />
        <KpiCard
          label="Confirmed Revenue"
          value={currency(rev.confirmedPaymentTotal)}
          delta={revenueDelta != null ? `${revenueDelta >= 0 ? '↑' : '↓'} ${Math.abs(revenueDelta)}% MoM` : undefined}
          deltaTone={revenueDelta != null && revenueDelta < 0 ? 'rose' : 'emerald'}
          icon={<Icon name="wallet" size={17} />}
          onClick={() => navigate('/payments')}
          footer={<Link to="/payments" className="text-xs font-medium text-brand-800 hover:underline">View payments →</Link>}
        />
        <KpiCard
          label="Outstanding"
          value={currency(rev.outstanding)}
          sub={`${c.deliveriesPending ?? 0} deliveries pending`}
          icon={<Icon name="clock" size={17} />}
          onClick={() => navigate('/orders')}
          footer={<Link to="/orders" className="text-xs font-medium text-brand-800 hover:underline">View orders →</Link>}
        />
        <KpiCard
          label="Follow-ups"
          value={(f.overdue ?? 0) + (f.today ?? 0) + (f.upcoming ?? 0)}
          sub={`${f.overdue ?? 0} overdue · ${f.today ?? 0} today`}
          icon={<Icon name="bell" size={17} />}
          onClick={() => navigate('/follow-ups')}
          footer={<Link to="/follow-ups" className="text-xs font-medium text-brand-800 hover:underline">View follow-ups →</Link>}
        />
      </div>

      {/* Revenue + Follow-up command center — 65 / 35 */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Revenue Trend"
          subtitle="Confirmed payments · Last 6 months"
          action={
            <FilterSelect value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="6M">6M</option>
              <option value="12M">12M</option>
            </FilterSelect>
          }
        >
          <RevenueArea data={revenueSeries} />
        </Panel>

        <Panel
          title="Follow-up Command Center"
          subtitle={`${f.completedThisWeek ?? 0} completed in the last 7 days`}
          bodyClassName="p-4 pt-3"
          action={<Link to="/follow-ups" className="text-xs font-medium text-brand-800 hover:underline">All →</Link>}
        >
          <Tabs tabs={fuBuckets} value={fuTab} onChange={setFuTab} className="mb-3" />
          <div className="space-y-1">
            {(fu[fuTab] ?? []).length === 0 && <p className="py-6 text-center text-sm text-muted">Nothing here. You are all caught up.</p>}
            {(fu[fuTab] ?? []).map((x: any) => (
              <div
                key={x.id}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-brand-50 ${
                  x.priority === 'HIGH' ? 'border-l-2 border-brand-500' : 'border-l-2 border-transparent'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink">{x.customer?.name ?? '—'}</p>
                  <p className="truncate text-xs text-muted">{x.purpose}</p>
                </div>
                <span className="shrink-0 text-xs font-medium tabular-nums text-muted">{fmtTime(x.dueAt)}</span>
                <Badge tone={x.status === 'PENDING' && daysSince(x.dueAt) > 0 ? 'rose' : 'amber'}>
                  {x.status === 'PENDING' && daysSince(x.dueAt) > 0 ? 'Overdue' : fuTab === 'TODAY' ? 'Today' : 'Pending'}
                </Badge>
                <button onClick={() => navigate('/follow-ups')} className="shrink-0 rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-ink-2 transition hover:border-brand-400 hover:bg-brand-50">
                  Open
                </button>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Funnel + At-risk */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Sales Funnel"
          subtitle="Enquiry progression across the pipeline"
          action={<Link to="/enquiries" className="text-xs font-medium text-brand-800 hover:underline">Enquiries →</Link>}
        >
          <FunnelPipeline data={(s.salesFunnel ?? []).map((x: any) => ({ status: x.status, count: x.count }))} />
        </Panel>

        <Panel
          title="Needs Attention"
          subtitle="Stalled for more than 7 days"
          bodyClassName="p-0"
          action={<Link to="/enquiries" className="text-xs font-medium text-brand-800 hover:underline">All →</Link>}
        >
          {atRisk.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">No stalled enquiries.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line-soft bg-[#fafafa] text-[11px] uppercase tracking-[0.04em] text-[#8a8a8a]">
                    <th className="px-4 py-2.5 font-semibold">Customer</th>
                    <th className="px-4 py-2.5 font-semibold">Issue</th>
                    <th className="px-4 py-2.5 font-semibold">Age</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {atRisk.map((e: any) => (
                    <tr key={e.id} className="transition hover:bg-[#fffdf2]">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-ink">{e.customer?.name ?? e.businessId}</p>
                        <p className="text-xs text-muted">{e.customer?.phone ?? e.businessId}</p>
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-ink-2">{statusLabel(e.status)}</td>
                      <td className="px-4 py-2.5 text-[13px] tabular-nums text-rose-600">{daysSince(e.createdAt)}d</td>
                      <td className="px-4 py-2.5 text-right">
                        <Link to="/enquiries" className="text-xs font-semibold text-brand-800 hover:underline">Open →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      {/* Order pipeline + Sources */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Order Pipeline"
          subtitle="Open orders by stage"
          action={<Link to="/orders" className="text-xs font-medium text-brand-800 hover:underline">Orders →</Link>}
        >
          <PipelineBoard stages={stages} onSelect={() => navigate('/orders')} />
        </Panel>

        <Panel title="Enquiry Sources" subtitle="Where leads come from">
          <BreakdownBars data={sources} nameKey="name" valueKey="value" totalLabel="total enquiries" />
        </Panel>
      </div>

      {/* Team + Branches */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Team Workload" subtitle="Pending follow-ups by owner" action={<Link to="/users" className="text-xs font-medium text-brand-800 hover:underline">Team →</Link>}>
          {team.length === 0 ? (
            <p className="text-sm text-muted">No pending follow-ups.</p>
          ) : (
            <div className="space-y-3.5">
              {team.map((t: any) => {
                const max = Math.max(...team.map((x: any) => x.pending), 1);
                return (
                  <div key={t.userId} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[13px] font-medium text-ink">{t.name}</p>
                        <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink">{t.pending}</span>
                      </div>
                      <div className="mt-1.5">
                        <Progress value={(t.pending / max) * 100} tone="brand" />
                      </div>
                      <p className="mt-1 text-[11px] text-muted">{t.role || 'Team member'} · follow-ups pending</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel title="Branch Performance" subtitle="Order value by branch" action={<Link to="/branches" className="text-xs font-medium text-brand-800 hover:underline">Branches →</Link>}>
          {branchPerf.length === 0 ? (
            <p className="text-sm text-muted">No branch data.</p>
          ) : (
            <div className="space-y-3.5">
              {branchPerf.map((b: any) => {
                const active = branchId === String(b.branchId);
                return (
                  <button
                    key={b.branchId}
                    onClick={() => setBranchId(active ? '' : String(b.branchId))}
                    className="block w-full text-left"
                  >
                    <div className="mb-1 flex items-center justify-between text-[13px]">
                      <span className={`font-medium ${active ? 'text-brand-800' : 'text-ink-2'}`}>
                        {b.name} <span className="text-muted">· {b.orders} {b.orders === 1 ? 'order' : 'orders'}</span>
                      </span>
                      <span className="font-semibold tabular-nums text-ink">{currency(b.value)}</span>
                    </div>
                    <Progress value={(b.value / maxBranchValue) * 100} tone={active ? 'brand' : 'slate'} />
                  </button>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* Recent orders */}
      <Panel
        title="Recent Orders"
        subtitle="Latest activity across the business"
        action={<Link to="/orders" className="text-xs font-medium text-brand-800 hover:underline">View all →</Link>}
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm data-table">
            <thead>
              <tr className="border-b border-line">
                <th className="px-5 py-2.5 font-semibold">Order</th>
                <th className="px-5 py-2.5 font-semibold">Customer</th>
                <th className="px-5 py-2.5 font-semibold">Status</th>
                <th className="px-5 py-2.5 text-right font-semibold">Amount</th>
                <th className="px-5 py-2.5 text-right font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {(s.recentOrders ?? []).map((o: any) => (
                <tr key={o.id} className="cursor-pointer transition hover:bg-[#fffdf2]" onClick={() => navigate(`/orders?open=${o.businessId}`)}>
                  <td className="px-5 py-3">
                    <Link to={`/orders?open=${o.businessId}`} className="font-semibold text-ink hover:text-brand-800 hover:underline">{o.businessId}</Link>
                  </td>
                  <td className="px-5 py-3 text-ink-2">
                    {o.customerId ? (
                      <Link to={`/customers/${o.customerId}`} onClick={(e) => e.stopPropagation()} className="font-medium text-ink hover:text-brand-800 hover:underline">
                        {o.customer?.name ?? '—'}
                      </Link>
                    ) : (
                      o.customer?.name ?? '—'
                    )}
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums text-ink">{currency(o.totalAmount)}</td>
                  <td className="px-5 py-3 text-right text-xs tabular-nums text-muted">{relativeTime(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Customer growth + Activity + Lost reasons */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Customer Growth" subtitle="New customers · Last 6 months">
          <GrowthBars data={s.customerSeries ?? []} />
        </Panel>

        <Panel title="Activity" subtitle="Meaningful business events">
          {sessionsToday > 0 && (
            <div className="mb-3 flex items-center gap-2.5 rounded-lg border border-line-soft bg-canvas px-3 py-2">
              <Icon name="users" size={15} className="text-muted" />
              <span className="text-[13px] text-ink-2">{sessionsToday} user {sessionsToday === 1 ? 'session' : 'sessions'} today</span>
            </div>
          )}
          <div className="space-y-3">
            {businessActivity.map((a) => (
              <div key={a.id} className="flex gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-line-soft text-muted">
                  <Icon name={ACTIVITY_ICONS[a.action] ?? 'edit'} size={14} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-ink-2">
                    {statusLabel(a.action)} · <span className="text-muted">{statusLabel(a.entityType)}</span>
                  </p>
                  <p className="truncate text-[11px] text-muted">
                    {a.user ? `${a.user.firstName} ${a.user.lastName}` : a.userEmail ?? 'System'} · {relativeTime(a.createdAt)}
                  </p>
                </div>
              </div>
            ))}
            {businessActivity.length === 0 && <p className="text-sm text-muted">No recent business activity.</p>}
          </div>
        </Panel>
      </div>

      {/* Secondary row — lost reasons + low stock */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Lost Enquiries" subtitle="Reasons deals were lost" compact>
          {lostTotal === 0 ? (
            <p className="text-sm text-muted">No lost enquiries in this period.</p>
          ) : (
            <div className="space-y-2.5">
              {lost.map((l: any) => (
                <div key={l.name} className="flex items-center justify-between text-[13px]">
                  <span className="text-ink-2">{l.name}</span>
                  <span className="tabular-nums text-muted">
                    {l.value} · <span className="font-semibold text-ink">{Math.round((l.value / lostTotal) * 100)}%</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          className="xl:col-span-2"
          title="Inventory"
          subtitle={lowStock.length === 0 ? 'All stock levels healthy' : `${lowStock.length} SKUs below reorder level`}
          compact
          action={<Link to="/inventory" className="text-xs font-medium text-brand-800 hover:underline">Inventory →</Link>}
        >
          {lowStock.length === 0 ? (
            <div className="flex items-center gap-2.5 text-[13px] text-ink-2">
              <Icon name="checkCircle" size={16} className="text-emerald-600" />
              No SKUs below reorder level.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {lowStock.slice(0, 6).map((x: any) => (
                <div key={x.id} className="flex items-center gap-3 rounded-lg border border-line-soft px-3 py-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-rose-50 text-rose-600">
                    <Icon name="inventory" size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">{x.sku?.name ?? 'SKU'}</p>
                    <p className="truncate text-xs text-muted">{x.sku?.sku} · {x.warehouse}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-rose-600">{x.availableQty} left</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
