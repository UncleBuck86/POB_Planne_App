import { storage } from './storageAdapter';
export const GRID_SIZE = 20;
export const layoutKey = 'dashboardWidgetLayoutV1';
export const visibilityKey = 'dashboardWidgetVisibilityV1';

export const defaultLayout = {
  // Left column stack to avoid horizontal overlap on typical screens
  nav: { x: 20, y: 20 },
  forecast: { x: 20, y: 120 },
  // Place Flight Forecast below POB Forecast to avoid overlapping widths
  flightForecast: { x: 20, y: 360 },
  // Onboard below forecasts
  onboard: { x: 20, y: 560 },
  // Crew/company counts below onboard to avoid overlap
  pobCompanies: { x: 20, y: 900 },
  // Snapshot table at the bottom of the stack by default
  pobCompaniesForecast: { x: 20, y: 1100 },
  // New widgets stacked further down
  weather: { x: 20, y: 1320 },
  flightStatus: { x: 20, y: 1480 },
  crewCountdown: { x: 20, y: 1640 },
  pobTrend: { x: 20, y: 1820 },
  alerts: { x: 20, y: 2080 },
  quickActions: { x: 20, y: 2220 },
  contractorMix: { x: 20, y: 2380 },
  map: { x: 20, y: 2560 }
};

export const defaultVisibility = {
  nav: true,
  forecast: true,
  flightForecast: true,
  onboard: true,
  pobCompanies: true,
  pobCompaniesForecast: false,
  weather: true,
  flightStatus: false,
  crewCountdown: true,
  pobTrend: true,
  alerts: true,
  quickActions: true,
  contractorMix: true,
  map: false
};

export function loadLayout() {
  try {
    const stored = storage.getJSON(layoutKey);
    return stored ? { ...defaultLayout, ...stored } : defaultLayout;
  } catch { return defaultLayout; }
}
export function saveLayout(layout) {
  try { storage.setJSON(layoutKey, layout); } catch {}
  emitPassive('WIDGET_MOVED', { ids: Object.keys(layout||{}) });
}

export function loadVisibility() {
  try {
    const stored = storage.getJSON(visibilityKey);
    return stored ? { ...defaultVisibility, ...stored } : defaultVisibility;
  } catch { return defaultVisibility; }
}
export function saveVisibility(v) {
  try { storage.setJSON(visibilityKey, v); } catch {}
  emitPassive('VISIBILITY_CHANGED', { visible: v });
}

// Fire passive AI events (lazy import to avoid hard dependency at module load)
function emitPassive(name, meta) {
  try {
    // dynamic import so this util can load before ai modules
    import('../ai/eventBus.js').then(m=> m.emitEvent && m.emitEvent(name, { type:name, ts:Date.now(), brief:name, meta })).catch(()=>{});
  } catch {/* ignore */}
}

// (Instrumentation inlined into saveLayout/saveVisibility above; wrappers removed to avoid duplicate exports)
