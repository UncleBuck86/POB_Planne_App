export const colorKey = 'dashboardWidgetColorsV1';

export function loadWidgetColors() {
  try { return JSON.parse(localStorage.getItem(colorKey)) || {}; } catch { return {}; }
}
export function saveWidgetColors(colors) { try { localStorage.setItem(colorKey, JSON.stringify(colors)); } catch {} }

export function deriveColors(hex) {
  if (!hex || !/^#?[0-9a-fA-F]{6}$/.test(hex)) return null;
  const h = hex.startsWith('#')?hex.slice(1):hex;
  const r=parseInt(h.slice(0,2),16), g=parseInt(h.slice(2,4),16), b=parseInt(h.slice(4,6),16);
  const toHex=v=>('0'+v.toString(16)).slice(-2);
  const shade=f=> '#' + toHex(Math.round(r*f)) + toHex(Math.round(g*f)) + toHex(Math.round(b*f));
  const srgb=[r,g,b].map(v=>{v/=255; return v<=0.03928? v/12.92: Math.pow((v+0.055)/1.055,2.4);});
  const lum=0.2126*srgb[0]+0.7152*srgb[1]+0.0722*srgb[2];
  const text = lum > 0.55 ? '#000' : '#fff';
  return { base:'#'+h, header: shade(0.75), border: shade(0.65), text };
}
export function widgetColorTheme(widgetColors, id) { return deriveColors(widgetColors[id]||'') || {}; }
