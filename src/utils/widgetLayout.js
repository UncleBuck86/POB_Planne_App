export const GRID_SIZE = 20;
export const layoutKey = 'dashboardWidgetLayoutV1';
export const visibilityKey = 'dashboardWidgetVisibilityV1';

export const defaultLayout = {
  nav: { x: 20, y: 20 },
  forecast: { x: 20, y: 160 },
  flightForecast: { x: 340, y: 160 },
  onboard: { x: 20, y: 360 },
  pobCompanies: { x: 340, y: 360 }
};

export const defaultVisibility = { nav: true, forecast: true, flightForecast: true, onboard: true, pobCompanies: true };

export function loadLayout() {
  try {
    const stored = JSON.parse(localStorage.getItem(layoutKey));
    return stored ? { ...defaultLayout, ...stored } : defaultLayout;
  } catch { return defaultLayout; }
}
export function saveLayout(layout) { try { localStorage.setItem(layoutKey, JSON.stringify(layout)); } catch {} }

export function loadVisibility() {
  try {
    const stored = JSON.parse(localStorage.getItem(visibilityKey));
    return stored ? { ...defaultVisibility, ...stored } : defaultVisibility;
  } catch { return defaultVisibility; }
}
export function saveVisibility(v) { try { localStorage.setItem(visibilityKey, JSON.stringify(v)); } catch {} }

// Fire passive AI events (lazy import to avoid hard dependency at module load)
function emitPassive(name, meta) {
  try {
    // dynamic import so this util can load before ai modules
    import('../ai/eventBus.js').then(m=> m.emitEvent && m.emitEvent(name, { type:name, ts:Date.now(), brief:name, meta })).catch(()=>{});
  } catch {/* ignore */}
}

// Wrap original save functions to emit events (non-breaking, preserving exports)
const _origSaveLayout = saveLayout;
export function saveLayoutWithEvent(l){ _origSaveLayout(l); emitPassive('WIDGET_MOVED', { ids:Object.keys(l||{}) }); }
export { saveLayoutWithEvent as saveLayout }; // re-export overriding name

const _origSaveVisibility = saveVisibility;
export function saveVisibilityWithEvent(v){ _origSaveVisibility(v); emitPassive('VISIBILITY_CHANGED', { visible: v }); }
export { saveVisibilityWithEvent as saveVisibility };
