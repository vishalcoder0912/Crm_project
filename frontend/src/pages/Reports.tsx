// hello this is vishal project
import { useCallback, useEffect, useState } from 'react';
import { Button, EmptyState, FilterSelect, KpiCard, Panel, Progress, Skeleton, statusLabel } from '../components/ui';
import { Icon } from '../components/icons';
import { BreakdownBars, DonutChart, FunnelPipeline, GrowthBars, RevenueArea, StageBars } from '../components/charts';
import { data } from '../lib/data';
import { currency } from '../lib/hooks';

export default function Reports() {
  const [s, setS] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [branchId, setBranchId] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    data
      .summary('/reports/summary', branchId ? { branchId } : undefined)
      .then(setS)
      .catch(() => setS(null))
      .finally(() => setLoading(false));
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const exportJson = () => {
    if (!s) return;
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aradhana-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !s) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }
  if (!s) return <EmptyState title="Could not load reports" hint="Check the API connection" />;

  const rev = s.revenue ?? {};
  const sources = (s.enquirySources ?? []).map((x: any) => ({ name: statusLabel(x.source), value: x.count })).sort((a: any, b: any) => b.value - a.value);
  const quotations = (s.quotationStatus ?? []).map((q: any) => ({ name: statusLabel(q.status), value: q.count }));
  const branches = s.branches ?? [];
  const branchPerf = (s.branchPerformance ?? []).filter((b: any) => b.orders > 0);
  const maxBranchValue = Math.max(...branchPerf.map((b: any) => b.value), 1);
  const team = s.teamWorkload ?? [];
  const maxTeam = Math.max(...team.map((t: any) => t.pending), 1);

  return (
    <div className="fade-in space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">Reports &amp; Analytics</h1>
          <p className="mt-1 text-sm text-muted">Business performance across sales, revenue and operations.</p>
        </div>
        <div className="flex items-center gap-2">
          <FilterSelect icon={<Icon name="building" size={14} />} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">All branches</option>
            {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </FilterSelect>
          <Button variant="secondary" onClick={exportJson}><Icon name="download" size={15} /> Export</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Confirmed revenue" value={currency(rev.confirmedPaymentTotal)} icon={<Icon name="wallet" size={17} />} tone="emerald" />
        <KpiCard label="Order value" value={currency(rev.totalOrderValue)} icon={<Icon name="orders" size={17} />} />
        <KpiCard label="Outstanding" value={currency(rev.outstanding)} icon={<Icon name="clock" size={17} />} tone="amber" />
        <KpiCard label="Stock value" value={currency(rev.stockValue)} icon={<Icon name="inventory" size={17} />} tone="rose" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Revenue Trend" subtitle="Confirmed payments · Last 6 months">
          <RevenueArea data={s.revenueSeries ?? []} />
        </Panel>
        <Panel title="Customer Growth" subtitle="New customers per month">
          <GrowthBars data={s.customerSeries ?? []} />
        </Panel>
      </div>

      <Panel title="Sales Funnel" subtitle="Enquiry pipeline progression">
        <FunnelPipeline data={(s.salesFunnel ?? []).map((x: any) => ({ status: x.status, count: x.count }))} />
      </Panel>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Quotation Status" subtitle="Distribution of quotations">
          <DonutChart data={quotations} height={190} />
          <div className="mt-4"><BreakdownBars data={quotations} /></div>
        </Panel>
        <Panel title="Enquiry Sources" subtitle="Lead origin">
          <BreakdownBars data={sources} nameKey="name" valueKey="value" totalLabel="total enquiries" />
        </Panel>
        <Panel title="Order Pipeline Value" subtitle="Value by stage">
          <StageBars data={s.ordersByStage ?? []} />
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Branch Performance" subtitle="Order value &amp; volume">
          <div className="space-y-4">
            {branchPerf.map((b: any) => (
              <div key={b.branchId}>
                <div className="mb-1 flex items-center justify-between text-[13px]">
                  <span className="font-medium text-ink-2">{b.name} <span className="text-muted">({b.code})</span></span>
                  <span className="tabular-nums text-muted">{b.orders} orders · <span className="font-semibold text-ink">{currency(b.value)}</span></span>
                </div>
                <Progress value={(b.value / maxBranchValue) * 100} tone="brand" />
              </div>
            ))}
            {branchPerf.length === 0 && <p className="text-sm text-muted">No branch data.</p>}
          </div>
        </Panel>
        <Panel title="Team Workload" subtitle="Pending follow-ups by owner">
          <div className="space-y-4">
            {team.map((t: any) => (
              <div key={t.userId}>
                <div className="mb-1 flex items-center justify-between text-[13px]">
                  <span className="font-medium text-ink-2">{t.name} <span className="text-muted">· {t.role}</span></span>
                  <span className="font-semibold tabular-nums text-ink">{t.pending}</span>
                </div>
                <Progress value={(t.pending / maxTeam) * 100} tone="slate" />
              </div>
            ))}
            {team.length === 0 && <p className="text-sm text-muted">No pending follow-ups.</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
