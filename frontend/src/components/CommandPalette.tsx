// hello this is vishal project
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, isDemo } from '../lib/api';
import { Icon } from './icons';

interface Hit {
  id: number | string;
  businessId: string;
  title: string;
  subtitle: string;
  route: string;
}
interface Group {
  type: string;
  icon: string;
  items: Hit[];
}

const QUICK: { label: string; route: string; icon: string }[] = [
  { label: 'Create enquiry', route: '/enquiries', icon: 'enquiries' },
  { label: 'New quotation', route: '/quotations', icon: 'quotations' },
  { label: 'New order', route: '/orders', icon: 'orders' },
  { label: 'Record payment', route: '/payments', icon: 'payments' },
  { label: 'Schedule follow-up', route: '/follow-ups', icon: 'bell' },
  { label: 'View reports', route: '/reports', icon: 'trend' },
];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const reqId = useRef(0);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => {
    if (open) {
      setQ('');
      setGroups([]);
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) {
      setGroups([]);
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    const timer = setTimeout(() => {
      api
        .get('/search', { q: term })
        .then((r) => {
          if (id === reqId.current) setGroups(r?.groups ?? []);
        })
        .catch(() => {
          if (id === reqId.current) setGroups([]);
        })
        .finally(() => {
          if (id === reqId.current) setLoading(false);
        });
    }, 220);
    return () => clearTimeout(timer);
  }, [q, open]);

  useEffect(() => {
    setActive(0);
  }, [q]);

  if (!open) return null;

  const go = (route: string) => {
    onClose();
    navigate(route);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') return onClose();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && flat[active]) {
      e.preventDefault();
      go(flat[active].route);
    }
  };

  const showQuick = q.trim().length < 2;
  let cursor = -1;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]" onKeyDown={onKeyDown}>
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="pop-in relative w-full max-w-2xl overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-pop)]">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Icon name="search" size={18} className="text-muted" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search customers by name or phone number, orders, quotations…"
            className="w-full bg-transparent py-4 text-sm text-ink placeholder:text-muted focus:outline-none"
          />
          <kbd className="hidden rounded border border-line bg-canvas px-1.5 py-0.5 text-[10px] font-semibold text-muted sm:block">ESC</kbd>
        </div>

        <div className="scroll-slim max-h-[52vh] overflow-y-auto p-2">
          {showQuick && (
            <div>
              <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted">Quick actions</p>
              {QUICK.map((item) => (
                <button
                  key={item.label}
                  onClick={() => go(item.route)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-ink-2 transition hover:bg-brand-50"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-line-soft text-muted">
                    <Icon name={item.icon} size={15} />
                  </span>
                  {item.label}
                  <Icon name="arrowRight" size={14} className="ml-auto text-slate-300" />
                </button>
              ))}
            </div>
          )}

          {!showQuick && loading && <p className="px-3 py-6 text-center text-sm text-muted">Searching…</p>}

          {!showQuick && !loading && flat.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted">No results for “{q}”</p>
          )}

          {!showQuick &&
            groups.map((g) => (
              <div key={g.type}>
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted">{g.type}</p>
                {g.items.map((hit) => {
                  cursor += 1;
                  const isActive = cursor === active;
                  return (
                    <button
                      key={`${g.type}-${hit.id}`}
                      onMouseEnter={() => setActive(cursor)}
                      onClick={() => go(hit.route)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                        isActive ? 'bg-brand-50' : 'hover:bg-line-soft'
                      }`}
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-line-soft text-muted">
                        <Icon name={g.icon} size={15} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink">{hit.title}</span>
                        <span className="block truncate text-xs text-muted">
                          {hit.businessId ? `${hit.businessId} · ` : ''}
                          {hit.subtitle}
                        </span>
                      </span>
                      <Icon name="arrowRight" size={14} className="ml-auto shrink-0 text-slate-300" />
                    </button>
                  );
                })}
              </div>
            ))}
        </div>

        <div className="flex items-center gap-4 border-t border-line bg-canvas px-4 py-2 text-[11px] text-muted">
          <span className="flex items-center gap-1"><kbd className="rounded border border-line bg-white px-1">↑</kbd><kbd className="rounded border border-line bg-white px-1">↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="rounded border border-line bg-white px-1">↵</kbd> open</span>
        </div>
      </div>
    </div>
  );
}
