import { ReactNode, InputHTMLAttributes, SelectHTMLAttributes } from 'react';
import { Icon } from './icons';

export type Tone = 'slate' | 'brand' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'orange';

type ToneSet = { soft: string; dot: string; solid: string; text: string; border: string };

const TONES: Record<Tone, ToneSet> = {
  slate: { soft: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', solid: 'bg-slate-500', text: 'text-slate-600', border: 'border-slate-200' },
  brand: { soft: 'bg-brand-100 text-brand-800', dot: 'bg-brand-500', solid: 'bg-brand-500', text: 'text-brand-800', border: 'border-brand-200' },
  indigo: { soft: 'bg-brand-100 text-brand-800', dot: 'bg-brand-500', solid: 'bg-brand-500', text: 'text-brand-800', border: 'border-brand-200' },
  emerald: { soft: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', solid: 'bg-emerald-500', text: 'text-emerald-700', border: 'border-emerald-200' },
  amber: { soft: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500', solid: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-200' },
  rose: { soft: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500', solid: 'bg-rose-500', text: 'text-rose-700', border: 'border-rose-200' },
  sky: { soft: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500', solid: 'bg-sky-500', text: 'text-sky-700', border: 'border-sky-200' },
  violet: { soft: 'bg-violet-50 text-violet-700', dot: 'bg-violet-500', solid: 'bg-violet-500', text: 'text-violet-700', border: 'border-violet-200' },
  orange: { soft: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500', solid: 'bg-orange-500', text: 'text-orange-700', border: 'border-orange-200' },
};

export function statusTone(status: string | undefined): Tone {
  switch ((status || '').toUpperCase()) {
    case 'ACCEPTED': case 'COMPLETED': case 'CONFIRMED': case 'PASS':
    case 'RECEIVED': case 'PACKED': case 'PAID': case 'ISSUED': case 'DELIVERED':
    case 'INSTALLED': case 'DONE':
      return 'emerald';
    case 'SENT': case 'APPROVED': case 'IN_PROGRESS': case 'MEASURED':
    case 'QUOTATION_SENT': case 'PARTIAL': case 'PARTIALLY_RECEIVED':
    case 'IN_PRODUCTION': case 'TAILORING': case 'READY': case 'WON':
    case 'GREY_FABRIC_PENDING': case 'CONTACTED': case 'MEASUREMENT_PENDING':
    case 'QUOTATION_PENDING': case 'OPEN': case 'SCHEDULED': case 'ON_HOLD':
      return 'sky';
    case 'PENDING': case 'DRAFT': case 'NEW': case 'UNPAID': case 'PENDING_APPROVAL':
      return 'amber';
    case 'REJECTED': case 'LOST': case 'CANCELLED': case 'FAIL': case 'REFUNDED':
    case 'QC_FAILED':
      return 'rose';
    default:
      return 'slate';
  }
}

/* Human-readable status labels — never expose raw backend enums. */
const WORD_FIXES: Record<string, string> = {
  qc: 'QC', po: 'PO', sku: 'SKU', grn: 'GRN', gr: 'GR', upi: 'UPI', gst: 'GST',
};
export function statusLabel(status?: string): string {
  if (!status) return '—';
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .split(' ')
    .map((w) => {
      if (!w) return w;
      return WORD_FIXES[w] ?? w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

export function Badge({ children, tone = 'slate', dot }: { children: ReactNode; tone?: Tone; dot?: boolean }) {
  const t = TONES[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${t.soft} ${t.border}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />}
      {children}
    </span>
  );
}

export function StatusBadge({ status, dot = true }: { status?: string; dot?: boolean }) {
  return (
    <Badge tone={statusTone(status)} dot={dot}>
      {statusLabel(status)}
    </Badge>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-surface ${className}`}>{children}</div>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-500 text-ink hover:bg-brand-400 focus-visible:ring-brand-500',
  secondary: 'bg-white text-ink-2 border border-line hover:bg-brand-50 hover:border-brand-200 focus-visible:ring-brand-400',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500',
  ghost: 'text-ink-2 hover:bg-line-soft',
};

export function Button({
  children,
  variant = 'primary',
  onClick,
  disabled,
  type = 'button',
  title,
  className = '',
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  title?: string;
  className?: string;
}) {
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${buttonVariants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand-500" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      {icon && <div className="text-slate-300">{icon}</div>}
      <p className="text-sm font-medium text-ink-2">{title}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`fade-in relative w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[88vh] overflow-auto rounded-xl border border-line bg-surface p-6 shadow-[var(--shadow-pop)]`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[17px] font-semibold text-ink">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-line-soft hover:text-ink">
            <Icon name="x" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = 'brand',
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
          <p className="mt-1.5 text-[26px] font-bold tabular-nums leading-none tracking-tight text-ink">{value}</p>
          {sub && <p className="mt-1.5 text-xs text-muted">{sub}</p>}
        </div>
        {icon && <div className={`shrink-0 rounded-lg p-2 ${TONES[tone].soft}`}>{icon}</div>}
      </div>
    </Card>
  );
}

export const inputClass =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink-2 placeholder:text-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';

export function Input({ ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputClass} {...props} />;
}

export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={inputClass} {...props}>
      {children}
    </select>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard & shell primitives                                        */
/* ------------------------------------------------------------------ */

export function Avatar({ name, size = 36 }: { name?: string; size?: number }) {
  const parts = (name ?? 'U').trim().split(/\s+/);
  const label = `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase() || 'U';
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-500 font-semibold text-ink"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {label}
    </span>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

export function Progress({ value, tone = 'brand', className = '' }: { value: number; tone?: Tone; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-line-soft ${className}`}>
      <div className={`h-full rounded-full transition-all ${TONES[tone].solid}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = '',
  bodyClassName = 'p-5',
  icon,
  compact,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  icon?: ReactNode;
  compact?: boolean;
}) {
  return (
    <section className={`flex flex-col rounded-xl border border-line bg-surface ${className}`}>
      {(title || action) && (
        <header className={`flex items-start justify-between gap-3 border-b border-line-soft ${compact ? 'px-4 py-3' : 'px-5 py-4'}`}>
          <div className="flex min-w-0 items-center gap-2.5">
            {icon && <span className="text-muted">{icon}</span>}
            <div className="min-w-0">
              {title && <h3 className="truncate text-[15px] font-semibold text-ink">{title}</h3>}
              {subtitle && <p className="mt-0.5 truncate text-xs text-muted">{subtitle}</p>}
            </div>
          </div>
          {action}
        </header>
      )}
      <div className={`flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  icon,
  tone = 'brand',
  delta,
  deltaTone = 'emerald',
  footer,
  loading,
  onClick,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  delta?: ReactNode;
  deltaTone?: Tone;
  footer?: ReactNode;
  loading?: boolean;
  onClick?: () => void;
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-line bg-surface p-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-7 w-28" />
        <Skeleton className="mt-3 h-3 w-16" />
      </div>
    );
  }
  return (
    <div
      onClick={onClick}
      className={`group flex flex-col rounded-xl border border-line bg-surface p-4 transition hover:border-brand-500 ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
        {icon && <span className="text-slate-300 transition group-hover:text-brand-600">{icon}</span>}
      </div>
      <p className="mt-3 text-[28px] font-bold leading-none tracking-tight tabular-nums text-ink">{value}</p>
      <div className="mt-2 flex items-center gap-2">
        {delta != null && (
          <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${TONES[deltaTone].soft}`}>
            {delta}
          </span>
        )}
        {sub && <span className="truncate text-xs text-muted">{sub}</span>}
      </div>
      {footer && <div className="mt-3 border-t border-line-soft pt-3">{footer}</div>}
    </div>
  );
}

export function Tabs({
  tabs,
  value,
  onChange,
  className = '',
}: {
  tabs: { key: string; label: ReactNode; count?: number }[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1 overflow-x-auto rounded-lg border border-line bg-canvas p-1 ${className}`}>
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition ${
              active ? 'bg-white text-ink border border-line' : 'text-muted hover:text-ink-2 border border-transparent'
            }`}
          >
            {t.label}
            {t.count != null && (
              <span className={`rounded px-1.5 text-[11px] font-semibold tabular-nums ${active ? 'bg-brand-100 text-brand-800' : 'bg-line-soft text-muted'}`}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  width = 'max-w-xl',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  width?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`slide-up relative flex h-full w-full ${width} flex-col bg-surface shadow-[var(--shadow-pop)]`}>
        <header className="flex items-start justify-between gap-3 border-b border-line px-6 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-[17px] font-semibold text-ink">{title}</h3>
            {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-line-soft hover:text-ink">
            <Icon name="x" size={18} />
          </button>
        </header>
        <div className="scroll-slim flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function IconButton({
  children,
  onClick,
  title,
  active,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-line-soft hover:text-ink-2 ${active ? 'bg-brand-100 text-brand-800' : ''} ${className}`}
    >
      {children}
    </button>
  );
}

export function FilterSelect({
  icon,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { icon?: ReactNode }) {
  return (
    <div className="relative">
      {icon && <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted">{icon}</span>}
      <select
        className={`h-9 appearance-none rounded-lg border border-line bg-white ${icon ? 'pl-8' : 'pl-3'} pr-8 text-[13px] font-medium text-ink-2 transition hover:border-brand-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100`}
        {...props}
      >
        {children}
      </select>
      <Icon name="chevron" size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" />
    </div>
  );
}

export function Toolbar({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-wrap items-center gap-2 ${className}`}>{children}</div>;
}
