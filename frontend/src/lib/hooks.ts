import { useCallback, useEffect, useState } from 'react';
import { data } from './data';

export function useCollection(path: string) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await data.list(path));
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { rows, loading, error, refresh };
}

export const currency = (n: number | string | null | undefined, digits = 0) =>
  '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: digits });

export const fmtDate = (v: string | null | undefined) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const initials = (a?: string, b?: string) => `${(a?.[0] ?? '').toUpperCase()}${(b?.[0] ?? '').toUpperCase()}`;

export const fmtTime = (v: string | null | undefined) => {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
};

export const daysSince = (v: string | null | undefined) => {
  if (!v) return 0;
  const d = new Date(v);
  if (isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
};

export const relativeTime = (v: string | null | undefined) => {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '—';
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(v);
};

export const isToday = (v: string | null | undefined) => {
  if (!v) return false;
  const d = new Date(v);
  const n = new Date();
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
};