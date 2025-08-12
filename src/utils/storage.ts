export const storageKeys = {
  auth: 'pobAuthState',
} as const;

export type StoredAuth = {
  token: string;
  username: string;
  role: string;
  effectiveRole?: string;
  lastActivity: number;
};

export const storageUtil = {
  get<T>(key: string): T | null {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : null; } catch { return null; }
  },
  set<T>(key: string, value: T) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
  remove(key: string) {
    try { localStorage.removeItem(key); } catch {}
  }
};
