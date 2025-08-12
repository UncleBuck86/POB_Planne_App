// storageAdapter.js
// Thin persistence adapter with JSON/bool helpers and safe fallbacks (uses browser storage when available).

const memoryStore = new Map();

// Global toggle: if false, adapter will not touch localStorage and will use in-memory store only.
// Stored outside adapter getters to avoid recursion; read directly from window.localStorage.
function isLocalEnabled() {
  try {
    const v = window?.localStorage?.getItem('pobLocalStorageEnabled');
    // Default to enabled if unset
    return v !== 'false';
  } catch {
    // If storage is unavailable, treat as disabled and rely on memory store
    return false;
  }
}

function safeGet(key) {
  if (isLocalEnabled()) {
    try { return window?.localStorage?.getItem(key); } catch { /* fall through */ }
  }
  return memoryStore.has(key) ? memoryStore.get(key) : null;
}

function safeSet(key, value) {
  if (isLocalEnabled()) {
    try { window?.localStorage?.setItem(key, value); return; } catch { /* fall through */ }
  }
  memoryStore.set(key, value);
}

function safeRemove(key) {
  if (isLocalEnabled()) {
    try { window?.localStorage?.removeItem(key); return; } catch { /* fall through */ }
  }
  memoryStore.delete(key);
}

export const storage = {
  get(key) { return safeGet(key); },
  set(key, value) { safeSet(key, String(value)); },
  remove(key) { safeRemove(key); },
  // Toggle helpers
  isLocalEnabled,
  setLocalEnabled(val) { try { window?.localStorage?.setItem('pobLocalStorageEnabled', val ? 'true' : 'false'); } catch { /* ignore */ } },
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
