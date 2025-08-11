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
