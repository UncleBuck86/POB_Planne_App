// storageAdapter.js
// Thin persistence adapter with JSON/bool helpers and safe fallbacks (uses browser storage when available).

const memoryStore = new Map();

function safeGet(key) {
  try {
    return window?.localStorage?.getItem(key);
  } catch {
    return memoryStore.has(key) ? memoryStore.get(key) : null;
  }
}

function safeSet(key, value) {
  try {
    window?.localStorage?.setItem(key, value);
  } catch {
    memoryStore.set(key, value);
  }
}

function safeRemove(key) {
  try {
    window?.localStorage?.removeItem(key);
  } catch {
    memoryStore.delete(key);
  }
}

export const storage = {
  get(key) { return safeGet(key); },
  set(key, value) { safeSet(key, String(value)); },
  remove(key) { safeRemove(key); },
  getJSON(key, fallback) {
    const raw = safeGet(key);
    if (raw == null) return fallback;
    try { return JSON.parse(raw); } catch { return fallback; }
  },
  setJSON(key, obj) { safeSet(key, JSON.stringify(obj)); },
  getBool(key, def = false) {
    const v = safeGet(key);
    if (v == null) return def;
    return v === 'true';
  },
  setBool(key, val) { safeSet(key, val ? 'true' : 'false'); },
};

// Note: For future multi-tenant migration, consider namespacing keys like
// `${tenantId}:${key}`. Keep current keys stable to preserve existing data.
