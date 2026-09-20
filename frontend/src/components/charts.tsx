// hello this is vishal project
import { Fragment } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { statusLabel } from './ui';

/* Brand signature + neutral ramp — no rainbow charts. */
export const CHART_COLORS = ['#f4c400', '#d9b000', '#b08f00', '#8a8a8a', '#6b6b6b', '#c9c9c4', '#e5c65a', '#9a9a9a'];

export const inr = (n: number) => '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const tooltipStyle = {
  contentStyle: { borderRadius: 10, border: '1px solid #e8e8e8', fontSize: 12, boxShadow: '0 10px 30px -14px rgba(24,24,24,.22)' },
  labelStyle: { color: '#181818', fontWeight: 600, marginBottom: 2 },
};

export function RevenueArea({ data, dataKey = 'revenue', label = 'Revenue' }: { data: any[]; dataKey?: string; label?: string }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f4c400" stopOpacity={0.32} />
            <stop offset="100%" stopColor="#f4c400" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} width={42} />
        <Tooltip {...tooltipStyle} formatter={(v: any) => [inr(Number(v)), label]} />
        <Area type="monotone" dataKey={dataKey} stroke="#c99f00" strokeWidth={2.5} fill="url(#revFill)" activeDot={{ r: 4, fill: '#f4c400', stroke: '#181818', strokeWidth: 1.5 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function GrowthBars({ data, dataKey = 'customers', label = 'New customers' }: { data: any[]; dataKey?: string; label?: string }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
        <Tooltip {...tooltipStyle} formatter={(v: any) => [v, label]} cursor={{ fill: 'rgba(244,196,0,0.08)' }} />
        <Bar dataKey={dataKey} fill="#f4c400" radius={[4, 4, 0, 0]} maxBarSize={30} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendLine({ data, dataKey, color = '#c99f00', label }: { data: any[]; dataKey: string; color?: string; label?: string }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
        <Tooltip {...tooltipStyle} formatter={(v: any) => [v, label ?? dataKey]} />
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={{ r: 3, fill: color, strokeWidth: 0 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, nameKey = 'name', valueKey = 'value', height = 200 }: { data: any[]; nameKey?: string; valueKey?: string; height?: number }) {
  const total = data.reduce((s, d) => s + Number(d[valueKey] ?? 0), 0);
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius={54} outerRadius={80} paddingAngle={2} stroke="none">
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip {...tooltipStyle} formatter={(v: any, n: any) => [v, n]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[22px] font-bold tabular-nums text-ink">{total}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted">total</span>
      </div>
    </div>
  );
}

export function ChartLegend({ data, nameKey = 'name', valueKey = 'value' }: { data: any[]; nameKey?: string; valueKey?: string }) {
  const total = Math.max(data.reduce((s, d) => s + Number(d[valueKey] ?? 0), 0), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2.5 text-sm">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
          <span className="min-w-0 flex-1 truncate text-ink-2">{d[nameKey]}</span>
          <span className="font-semibold tabular-nums text-ink">{d[valueKey]}</span>
          <span className="w-10 text-right text-xs tabular-nums text-muted">{Math.round((Number(d[valueKey]) / total) * 100)}%</span>
        </div>
      ))}
      {data.length === 0 && <p className="text-sm text-muted">No data yet.</p>}
    </div>
  );
}

/* Compact horizontal breakdown, e.g. enquiry sources. */
export function BreakdownBars({
  data,
  nameKey = 'name',
  valueKey = 'value',
  totalLabel,
}: {
  data: any[];
  nameKey?: string;
  valueKey?: string;
  totalLabel?: string;
}) {
  const max = Math.max(...data.map((d) => Number(d[valueKey] ?? 0)), 1);
  const total = data.reduce((s, d) => s + Number(d[valueKey] ?? 0), 0);
  return (
    <div>
      <div className="space-y-2.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate text-[13px] text-ink-2" title={String(d[nameKey])}>{d[nameKey]}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-line-soft">
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${(Number(d[valueKey]) / max) * 100}%` }} />
            </div>
            <span className="w-6 shrink-0 text-right text-[13px] font-semibold tabular-nums text-ink">{d[valueKey]}</span>
          </div>
        ))}
        {data.length === 0 && <p className="text-sm text-muted">No data yet.</p>}
      </div>
      {totalLabel && <p className="mt-3 border-t border-line-soft pt-3 text-xs text-muted">{total} {totalLabel}</p>}
    </div>
  );
}

/* Horizontal sales funnel pipeline. */
export function FunnelPipeline({
  data,
  active,
  onSelect,
}: {
  data: { status: string; count: number }[];
  active?: string;
  onSelect?: (status: string) => void;
}) {
  if (!data.length) return <p className="text-sm text-muted">No enquiries yet.</p>;
  return (
    <div className="flex items-stretch gap-1.5 overflow-x-auto pb-1">
      {data.map((d, i) => {
        const isActive = active === d.status;
        return (
          <Fragment key={d.status}>
            <button
              onClick={() => onSelect?.(d.status)}
              className={`flex min-w-[104px] flex-1 flex-col gap-2 rounded-lg border p-3 text-left transition ${
                isActive ? 'border-brand-500 bg-brand-50' : 'border-line bg-white hover:border-brand-300 hover:bg-brand-50/40'
              }`}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">{statusLabel(d.status)}</span>
              <span className="text-[22px] font-bold leading-none tabular-nums text-ink">{d.count}</span>
              <div className="h-1 w-full overflow-hidden rounded-full bg-line-soft">
                <div
                  className={`h-full rounded-full ${isActive ? 'bg-brand-600' : 'bg-brand-400'}`}
                  style={{ width: `${Math.min(100, Math.max(6, d.count * 12))}%` }}
                />
              </div>
            </button>
            {i < data.length - 1 && <span className="flex items-center text-slate-300">→</span>}
          </Fragment>
        );
      })}
    </div>
  );
}

/* Order pipeline board — stage columns with count + value. */
export function PipelineBoard({
  stages,
  active,
  onSelect,
}: {
  stages: { key: string; label: string; count: number; value: number }[];
  active?: string;
  onSelect?: (key: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
      {stages.map((s) => {
        const isActive = active === s.key;
        return (
          <button
            key={s.key}
            onClick={() => onSelect?.(s.key)}
            className={`rounded-lg border p-3 text-left transition ${
              isActive ? 'border-brand-500 bg-brand-50' : 'border-line bg-white hover:border-brand-300'
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{s.label}</p>
            <p className="mt-2 text-[20px] font-bold leading-none tabular-nums text-ink">{s.count}</p>
            <p className="mt-1.5 text-xs font-medium tabular-nums text-muted">{inr(s.value)}</p>
          </button>
        );
      })}
    </div>
  );
}

/* Vertical bar list — used for stage value breakdowns. */
export function StageBars({ data }: { data: { status: string; count: number; value: number }[] }) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const max = Math.max(...sorted.map((d) => d.value), 1);
  return (
    <div className="space-y-3">
      {sorted.map((s) => (
        <div key={s.status}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-ink-2">{statusLabel(s.status)}</span>
            <span className="tabular-nums text-muted">
              {s.count} · <span className="font-semibold text-ink">{inr(s.value)}</span>
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-line-soft">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${(s.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
      {data.length === 0 && <p className="text-sm text-muted">No open orders.</p>}
    </div>
  );
}
