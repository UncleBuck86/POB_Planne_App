// Archived on 2025-08-11
// Original event bus code for AI preserved for future reference.

/* 
// Simple in-memory event bus for passive AI instrumentation
const listeners = new Map(); // name -> Set<fn>

export function onEvent(name, fn) {
  if (!listeners.has(name)) listeners.set(name, new Set());
  listeners.get(name).add(fn);
  return () => offEvent(name, fn);
}

export function offEvent(name, fn) {
  const set = listeners.get(name);
  if (!set) return;
  set.delete(fn);
  if (!set.size) listeners.delete(name);
}

export function emitEvent(name, payload = {}) {
  const set = listeners.get(name);
  if (!set) return;
  for (const fn of Array.from(set)) {
    try { fn(payload); } catch (e) { /* ignore error */ }
  }
}

// Convenience wrapper to record domain events with uniform structure
export function emitDomain(type, meta = {}, brief) {
  emitEvent(type, { type, meta, brief: brief || type, ts: Date.now() });
}

export function clearAllEvents() { listeners.clear(); }
*/
