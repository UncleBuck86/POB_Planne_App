// flightDirectionConfig.js
// Persist and access per-company flight direction settings
import { storage } from '../utils/storageAdapter';

export const DIR_MAP_KEY = 'flightDirMapV1';
export const DEFAULT_MODE_KEY = 'flightDirDefaultMode'; // 'OB' or 'IB'

export function safeLoadJSON(key, fallback) {
  try { return storage.getJSON(key, fallback); } catch { return fallback; }
}

export function loadDirectionMap() {
  return safeLoadJSON(DIR_MAP_KEY, {});
}

export function saveDirectionMap(map) {
  storage.setJSON(DIR_MAP_KEY, map || {});
}

export function loadDefaultMode() {
  try { return storage.get(DEFAULT_MODE_KEY) || 'OB'; } catch { return 'OB'; }
}

export function saveDefaultMode(mode) {
  storage.set(DEFAULT_MODE_KEY, mode === 'IB' ? 'IB' : 'OB');
}

export function getCompanyMode(company, dirMap, defMode) {
  const map = dirMap || loadDirectionMap();
  const d = (defMode || loadDefaultMode()) === 'IB' ? 'IB' : 'OB';
  const key = (company || '').toLowerCase();
  const val = map[key];
  if (val === 'IB' || val === 'OB') return val;
  return d;
}
