import { api, isDemo } from './api';
import { demoGet, demoPost, demoPatch, demoDelete } from './demo';

export const demoMode = isDemo();

export const data = {
  async list(path: string): Promise<any[]> {
    if (isDemo()) {
      const r = demoGet(path);
      return Array.isArray(r) ? r : [];
    }
    const r = await api.get(path);
    if (Array.isArray(r)) return r;
    if (r && Array.isArray(r.items)) return r.items;
    if (r && Array.isArray(r.data)) return r.data;
    return [];
  },

  async one<T = any>(path: string): Promise<T | null> {
    if (isDemo()) return (demoGet(path) as T) ?? null;
    return api.get(path);
  },

  async summary<T = any>(path = '/dashboard/summary', params?: Record<string, any>): Promise<T> {
    if (isDemo()) return demoGet(path) as T;
    return api.get(path, params);
  },

  async post<T = any>(path: string, body?: any): Promise<T> {
    if (isDemo()) {
      return demoPost(path, body) as T;
    }
    return api.post(path, body);
  },

  async patch<T = any>(path: string, body?: any): Promise<T> {
    if (isDemo()) return demoPatch(path, body) as T;
    return api.patch(path, body);
  },

  async del<T = any>(path: string): Promise<T> {
    if (isDemo()) return demoDelete(path) as T;
    return api.del(path);
  },
};