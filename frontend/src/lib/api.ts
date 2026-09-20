// hello this is vishal project
import { Session } from '../types';
import { demoGet, demoPost, demoPatch, demoDelete, demoSearch } from './demo';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const KEYS = {
  access: 'fops_access',
  refresh: 'fops_refresh',
  session: 'fops_session',
};

export const isDemo = () => localStorage.getItem(KEYS.session)?.includes('"demo":true') ?? false;

export const getSession = (): Session | null => {
  const raw = localStorage.getItem(KEYS.session);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
};

export const setSession = (s: Session) => {
  localStorage.setItem(KEYS.access, s.accessToken);
  localStorage.setItem(KEYS.refresh, s.refreshToken);
  localStorage.setItem(KEYS.session, JSON.stringify(s));
};

export const clearSession = () => {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
};

async function doFetch(path: string, options: RequestInit, retried = false): Promise<any> {
  const session = getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (session?.accessToken) headers['Authorization'] = `Bearer ${session.accessToken}`;

  const res = await fetch(API_BASE + path, { ...options, headers });
  if (res.status === 401 && session?.refreshToken && !retried) {
    try {
      const r = await fetch(API_BASE + '/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });
      if (r.ok) {
        const j = await r.json();
        const data = j.data ?? j;
        const next = { ...session, accessToken: data.accessToken ?? data.token };
        setSession(next);
        return doFetch(path, options, true);
      }
    } catch {
      /* fall through to error handling */
    }
    clearSession();
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error?.message) message = body.error.message;
    } catch {
      /* ignore */
    }
    const err: any = new Error(message);
    err.status = res.status;
    throw err;
  }
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('json')) return res.json();
  return res.text();
}

const parse = (r: any): any => {
  if (r && typeof r === 'object' && 'data' in r) return r.data;
  return r;
};

export const api = {
  get: async (path: string, params?: Record<string, any>) => {
    if (isDemo()) {
      if (path === '/search' || path.startsWith('/search?')) {
        const q = params?.q ?? (new URLSearchParams(path.split('?')[1] || '')).get('q') ?? '';
        return demoSearch(q);
      }
      return demoGet(path);
    }
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
      });
    }
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return doFetch(path + suffix, { method: 'GET' }).then(parse);
  },
  post: async (path: string, body?: any) => {
    if (isDemo()) return demoPost(path, body);
    return doFetch(path, { method: 'POST', body: JSON.stringify(body ?? {}) }).then(parse);
  },
  patch: async (path: string, body?: any) => {
    if (isDemo()) return demoPatch(path, body);
    return doFetch(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }).then(parse);
  },
  del: async (path: string) => {
    if (isDemo()) return demoDelete(path);
    return doFetch(path, { method: 'DELETE' }).then(parse);
  },
};