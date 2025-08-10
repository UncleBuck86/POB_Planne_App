import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useTheme } from '../ThemeContext.jsx';
import { generateFlightComments } from '../utils/generateFlightComment.js';
import styled, { ThemeProvider as StyledThemeProvider, createGlobalStyle } from 'styled-components';

// Reuse theming like planner page
const GlobalStyle = createGlobalStyle`
  body { background: ${({ theme }) => theme.background}; color: ${({ theme }) => theme.text}; transition: background 0.3s, color 0.3s; }
  * { font-family: 'Segoe UI', Arial, sans-serif; }
`;
const GearButton = styled.button`
  position: fixed; top: 12px; right: 16px; background: transparent; border: none; cursor: pointer; z-index: 200; font-size: 24px; color: ${({ theme }) => theme.primary || '#fff'}; line-height: 1; padding: 0; transition: color 0.2s, transform 0.2s;
  &:hover { color: ${({ theme }) => theme.secondary || '#ccc'}; transform: rotate(20deg); }
`;
const Dropdown = styled.div`
  position: fixed; top: 54px; right: 16px; background: ${({ theme }) => theme.background || '#fff'}; color: ${({ theme }) => theme.text || '#222'}; border: 1px solid ${({ theme }) => theme.primary}; border-radius: 10px; box-shadow: 0 4px 14px rgba(0,0,0,0.35); min-width: 200px; padding: 14px 16px 16px; z-index: 210;
`;

function Dashboard() {
  const { theme, team, changeTheme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef(null);
  const gearRef = useRef(null);
  const widgetBorderColor = theme.name === 'Dark' ? '#bfc4ca' : '#444';
  // User location setting (persist per user in localStorage)
  const userLocKey = 'pobUserLocation';
  const [userLocation, setUserLocation] = useState(() => {
    try { return localStorage.getItem(userLocKey) || ''; } catch { return ''; }
  });
  const [availableLocations, setAvailableLocations] = useState(() => {
    try { return JSON.parse(localStorage.getItem('flightManifestLocations')) || []; } catch { return []; }
  });
  useEffect(() => {
    // Listen for admin updates to locations
    const onStorage = (e) => {
      if (e.key === 'flightManifestLocations') {
        try { setAvailableLocations(JSON.parse(e.newValue) || []); } catch { setAvailableLocations([]); }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  useEffect(() => { try { localStorage.setItem(userLocKey, userLocation); } catch {} }, [userLocation]);
  // Load stored planner data (non-editable view)
  const rowData = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('pobPlannerData')) || []; } catch { return []; }
  }, []);
  const comments = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('pobPlannerComments')) || {}; } catch { return {}; }
  }, []);
  // Load personnel records (snapshot + optional manual refresh)
  const [personnelSnapshot, setPersonnelSnapshot] = useState(() => {
    try { return JSON.parse(localStorage.getItem('personnelRecords')) || []; } catch { return []; }
  });
  const refreshPersonnel = () => {
    try { setPersonnelSnapshot(JSON.parse(localStorage.getItem('personnelRecords')) || []); } catch { /* ignore */ }
  };
  useEffect(() => {
    const onStorage = (e) => { if (e.key === 'personnelRecords') refreshPersonnel(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  const todayMid = new Date(); todayMid.setHours(0,0,0,0);
  const fmtDate = (val) => {
    if (!val) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) { const [y,m,d]=val.split('-'); return `${m}/${d}/${y}`; }
    const dt = new Date(val); if (!isNaN(dt)) { const mm=String(dt.getMonth()+1).padStart(2,'0'); const dd=String(dt.getDate()).padStart(2,'0'); return `${mm}/${dd}/${dt.getFullYear()}`; }
    return val;
  };
  const onboard = useMemo(() => {
    return personnelSnapshot.filter(r => r.status === 'Onboard');
  }, [personnelSnapshot]);
  const withComputed = useMemo(() => onboard.map(r => {
    let days = '';
    if (r.arrivalDate) {
      const arr = new Date(r.arrivalDate + 'T00:00:00');
      if (!isNaN(arr)) {
        const diff = Math.floor((todayMid - arr) / 86400000);
        if (diff >= 0) days = (diff + 1) + 'd';
      }
    }
    return { ...r, daysOnboardDisplay: days };
  }), [onboard, todayMid]);
  const today = new Date();
  const next7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return {
      key: (d.getMonth()+1) + '/' + d.getDate() + '/' + d.getFullYear(),
      label: d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
      dow: d.toLocaleDateString('en-US', { weekday: 'short' })
    };
  });
  const visibleCompanies = rowData.filter(r => r.company && r.company.trim());
  const hasComments = useMemo(() => next7.some(d => (comments[d.key] || '').trim().length > 0), [comments, next7]);
  const totalsPerDay = next7.reduce((acc, d) => {
    acc[d.key] = visibleCompanies.reduce((sum, c) => sum + (parseInt(c[d.key], 10) || 0), 0);
    return acc;
  }, {});
  // Precompute flight deltas once for next7 range
  const flightDeltas = useMemo(() => {
    const calc = generateFlightComments(rowData, next7.map(n => ({ date: n.key })));
    return { out: calc.flightsOut, in: calc.flightsIn };
  }, [rowData, next7]);
  // --- Movable widgets layout ---
  const GRID = 20; // px grid size
  const layoutKey = 'dashboardWidgetLayoutV1';
  const visibilityKey = 'dashboardWidgetVisibilityV1';
  const defaultLayout = {
    nav: { x: 20, y: 20 },
    forecast: { x: 20, y: 160 },
    flightForecast: { x: 340, y: 160 },
    onboard: { x: 20, y: 360 },
    pobCompanies: { x: 340, y: 360 }
  };
  const defaultVisibility = { nav: true, forecast: true, flightForecast: true, onboard: true, pobCompanies: true };
  const [layout, setLayout] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(layoutKey));
      return stored ? { ...defaultLayout, ...stored } : defaultLayout;
    } catch { return defaultLayout; }
  });
  useEffect(() => { localStorage.setItem(layoutKey, JSON.stringify(layout)); }, [layout]);
  const [editLayout, setEditLayout] = useState(false);
  const [visible, setVisible] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(visibilityKey));
      return stored ? { ...defaultVisibility, ...stored } : defaultVisibility;
    } catch { return defaultVisibility; }
  });
  useEffect(() => { localStorage.setItem(visibilityKey, JSON.stringify(visible)); }, [visible]);
  const dragState = useRef({ id:null, offsetX:0, offsetY:0 });
  const containerRef = useRef(null);
  // Mini theme colors per widget
  const colorKey = 'dashboardWidgetColorsV1';
  const [widgetColors, setWidgetColors] = useState(() => {
    try { return JSON.parse(localStorage.getItem(colorKey)) || {}; } catch { return {}; }
  });
  useEffect(()=>{ localStorage.setItem(colorKey, JSON.stringify(widgetColors)); }, [widgetColors]);
  const setWidgetColor = (id, val) => setWidgetColors(c => ({ ...c, [id]: val }));
  const clearWidgetColor = (id) => setWidgetColors(c => { const n={...c}; delete n[id]; return n; });
  const deriveColors = (hex) => {
    if (!hex || !/^#?[0-9a-fA-F]{6}$/.test(hex)) return null;
    const h = hex.startsWith('#')?hex.slice(1):hex;
    const r=parseInt(h.slice(0,2),16), g=parseInt(h.slice(2,4),16), b=parseInt(h.slice(4,6),16);
    const toHex=v=>('0'+v.toString(16)).slice(-2);
    const shade=f=> '#' + toHex(Math.round(r*f)) + toHex(Math.round(g*f)) + toHex(Math.round(b*f));
    // luminance for contrast
    const srgb=[r,g,b].map(v=>{v/=255; return v<=0.03928? v/12.92: Math.pow((v+0.055)/1.055,2.4);});
    const lum=0.2126*srgb[0]+0.7152*srgb[1]+0.0722*srgb[2];
    const text = lum > 0.55 ? '#000' : '#fff';
    return { base:'#'+h, header: shade(0.75), border: shade(0.65), text };
  };
  const widgetColorTheme = (id) => deriveColors(widgetColors[id]||'') || {};
  const onPointerDown = (e, id) => {
    if (!editLayout) return;
    const rect = e.currentTarget.getBoundingClientRect();
    dragState.current = { id, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
    // When user begins moving a widget in edit mode, close settings if open
    setSettingsOpen(o => o ? false : o);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };
  const onPointerMove = (e) => {
    const { id, offsetX, offsetY } = dragState.current;
    if (!id) return;
    const contRect = containerRef.current?.getBoundingClientRect();
    const baseX = e.clientX - (contRect?.left || 0) - offsetX;
    const baseY = e.clientY - (contRect?.top || 0) - offsetY;
    const snap = (v) => Math.max(0, Math.round(v / GRID) * GRID);
    setLayout(l => ({ ...l, [id]: { x: snap(baseX), y: snap(baseY) } }));
  };
  const onPointerUp = () => {
    dragState.current.id = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  };
  useEffect(() => () => { onPointerUp(); }, []);
  // Close settings on outside click / escape
  useEffect(() => {
    if (!settingsOpen) return;
    const handleClick = (e) => {
      const menu = settingsRef.current;
      const gear = gearRef.current;
      if (!menu) return;
      if (menu.contains(e.target) || gear?.contains(e.target)) return;
      // Only auto-close on outside click when not editing layout
      if (!editLayout) setSettingsOpen(false);
    };
  const handleKey = (e) => { if (e.key === 'Escape') setSettingsOpen(false); };
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('touchstart', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('touchstart', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [settingsOpen, editLayout]);

  return (
    <StyledThemeProvider theme={theme}>
      <GlobalStyle />
  <div style={{ padding: '24px', color: theme.text, background: theme.background, minHeight: '100vh' }}>
        <GearButton ref={gearRef} onClick={() => setSettingsOpen(o => !o)} title="Settings / Theme">⚙️</GearButton>
        {settingsOpen && (
          <Dropdown ref={settingsRef}>
            <div style={{ marginBottom: 8, fontWeight: 'bold' }}>Theme Settings</div>
            <label htmlFor="dash-theme-select" style={{ marginRight: 8 }}>Select Theme:</label>
            <select id="dash-theme-select" value={team} onChange={e => { changeTheme(e.target.value); if (!editLayout) setSettingsOpen(false); }}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
            <div style={{ marginTop:12, paddingTop:10, borderTop: '1px solid ' + (theme.name==='Dark' ? '#bfc4ca40':'#ccc'), fontSize:12 }}>
              <div style={{ fontWeight:'bold', marginBottom:6 }}>Layout</div>
              <button onClick={() => {
                setEditLayout(prev => {
                  const next = !prev;
                  // Close the settings only when turning OFF edit layout; keep open when enabling edit
                  if (!next) setSettingsOpen(false);
                  return next;
                });
              }} style={{ background: editLayout ? theme.secondary : theme.primary, color: theme.text, border:'1px solid '+theme.secondary, padding:'4px 8px', borderRadius:6, cursor:'pointer', fontWeight:'bold', fontSize:11, width:'100%', marginBottom:8 }}>
                {editLayout ? 'Finish Layout' : 'Edit Layout'}
              </button>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {['nav','forecast','flightForecast','onboard','pobCompanies'].map(id => (
                  <label key={id} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <input type="checkbox" checked={visible[id]} onChange={e => { setVisible(v => ({ ...v, [id]: e.target.checked })); if (!editLayout) setSettingsOpen(false); }} />
                    <span>{id === 'nav' ? 'Navigation' : id === 'forecast' ? 'POB Forecast' : id === 'flightForecast' ? 'Flight Forecast' : id === 'onboard' ? 'POB Onboard' : 'POB Companies'}</span>
                  </label>
                ))}
              </div>
              {editLayout && (
                <div style={{ marginTop:10 }}>
                  <div style={{ fontWeight:'bold', marginBottom:4 }}>Widget Colors (mini theme)</div>
                  {['nav','forecast','flightForecast','onboard','pobCompanies'].map(id => {
                    const c = widgetColors[id] || '';
                    return (
                      <div key={id} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                        <span style={{ width:90, fontSize:11 }}>{id==='nav'?'Navigation': id==='forecast'?'POB Forecast': id==='flightForecast'?'Flight Forecast': id==='onboard'?'POB Onboard':'POB Companies'}</span>
                        <input type="color" value={c || '#ffffff'} onChange={e => setWidgetColor(id, e.target.value)} style={{ width:30, height:24, padding:0, border:'1px solid #888', background:'transparent', cursor:'pointer' }} />
                        {c && <button onClick={()=>clearWidgetColor(id)} style={{ fontSize:10, padding:'2px 4px', border:'1px solid '+theme.secondary, background:'transparent', color: theme.text, borderRadius:4, cursor:'pointer' }}>Reset</button>}
                      </div>
                    );
                  })}
                  {Object.keys(widgetColors).length > 0 && (
                    <div style={{ marginTop:6 }}>
                      <button onClick={()=>setWidgetColors({})} style={{ fontSize:10, padding:'4px 6px', border:'1px solid '+theme.secondary, background:theme.primary, color:theme.text, borderRadius:4, cursor:'pointer', fontWeight:'bold' }}>Reset All</button>
                    </div>
                  )}
                </div>
              )}
              {editLayout && <div style={{ marginTop:6, fontSize:10, opacity:0.7 }}>Drag to reposition (grid {GRID}px)</div>}
              {editLayout && <div style={{ marginTop:4, fontSize:10, opacity:0.55 }}>Toggle checkboxes to show / hide widgets.</div>}
            </div>
          </Dropdown>
        )}
  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
    <h2 style={{ margin:'0 0 4px', color: team === 'dark' ? theme.text : theme.primary }}>Dashboard</h2>
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <label htmlFor="user-location-select" style={{ fontSize:12, opacity:0.8 }}>Location:</label>
      <select
        id="user-location-select"
        value={userLocation}
        onChange={e=> setUserLocation(e.target.value)}
        style={{ padding:'6px 10px', border:'1px solid '+(theme.name==='Dark' ? '#666':'#888'), background: theme.surface, color: theme.text, borderRadius:8, fontSize:12 }}
      >
        <option value="">-- Select --</option>
        {availableLocations.map(loc => <option value={loc} key={loc}>{loc}</option>)}
      </select>
    </div>
  </div>
  <div ref={containerRef} style={{ position:'relative', minHeight:600 }}>
    {editLayout && (
      <div style={{ position:'absolute', inset:0, background: `repeating-linear-gradient(to right, transparent, transparent ${GRID-1}px, ${(theme.name==='Dark')?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)'} ${GRID-1}px, ${(theme.name==='Dark')?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)'} ${GRID}px), repeating-linear-gradient(to bottom, transparent, transparent ${GRID-1}px, ${(theme.name==='Dark')?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)'} ${GRID-1}px, ${(theme.name==='Dark')?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)'} ${GRID}px)`, pointerEvents:'none', zIndex:0 }} />
    )}
    {/* Navigation Widget */}
  {visible.nav && (() => { const wc = widgetColorTheme('nav'); return (
    <div
      onPointerDown={e => onPointerDown(e,'nav')}
      style={{ position:'absolute', left:layout.nav.x, top:layout.nav.y, cursor: editLayout ? 'grab' : 'default', userSelect: editLayout ? 'none':'auto', padding: '12px 16px', background: wc.base || theme.surface, border: '1px solid '+(wc.border || '#bfc4ca'), borderRadius: 8, minWidth:260, boxShadow: editLayout ? '0 0 0 2px rgba(255,255,0,0.3)' : 'none', color: wc.text || theme.text }}
    >
  <h3 style={{ margin: '0 0 8px', background: wc.header||'transparent', padding: wc.header? '4px 6px':0, borderRadius:4, color: wc.text || (team === 'dark' ? theme.text : theme.secondary), fontSize:16 }}>Navigation {userLocation && <span style={{ fontSize:11, fontWeight:400, opacity:0.75 }}>({userLocation})</span>}</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <li><a href="#planner" style={{ color: wc.text || theme.text, fontWeight: 'bold', textDecoration: 'none' }}>Go to Planner</a></li>
      </ul>
    </div>
  ); })()}
    {/* Forecast Widget */}
  {visible.forecast && (() => { const wc = widgetColorTheme('forecast'); return (
    <section
      onPointerDown={e => onPointerDown(e,'forecast')}
      style={{ position:'absolute', left:layout.forecast.x, top:layout.forecast.y, padding: '6px 8px', background: wc.base || theme.surface, border: '1px solid '+(wc.border||widgetBorderColor), borderRadius: 8, display:'inline-block', cursor: editLayout ? 'grab' : 'default', boxShadow: editLayout ? '0 0 0 2px rgba(255,255,0,0.3)' : 'none', color: wc.text || theme.text }}>
      <h3 style={{ margin: '0 0 4px', fontSize: 16, background: wc.header||'transparent', padding: wc.header?'4px 6px':0, borderRadius:4, color: wc.text || theme.text }}>POB Forecast</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: 'auto', tableLayout: 'auto' }}>
            <thead>
              <tr>
                <th style={thStyle(theme, hasComments, wc)}>Company</th>
                {next7.map(d => {
                  const header = `${d.dow} ${d.label}`; // single-line compact
                  return (
                    <th key={d.key} style={thStyle(theme, hasComments, wc)} title={d.key}>{header}</th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visibleCompanies.map(c => (
                <tr key={c.id || c.company}>
                  <td style={tdLeft(theme, wc)}>{c.company}</td>
                  {next7.map(d => (
                    <td key={d.key} style={tdStyle(theme, wc)}>{c[d.key] || ''}</td>
                  ))}
                </tr>
              ))}
              <tr style={{ background: theme.background }}>
                <td style={{ ...tdLeft(theme, wc), fontWeight: 'bold', fontSize: 13 }}>Totals</td>
                {next7.map(d => (
                  <td key={d.key} style={{ ...tdStyle(theme, wc), fontWeight: 'bold', fontSize: 11 }}>{totalsPerDay[d.key] || ''}</td>
                ))}
              </tr>
              <tr>
                <td style={{ ...tdLeft(theme, wc), fontStyle: 'italic', fontSize: 13 }}>Comments</td>
                {next7.map(d => (
                  <td key={d.key} style={{ ...tdStyle(theme, wc), fontStyle: 'italic', whiteSpace: 'pre-wrap', fontSize: 10 }}>{comments[d.key] || ''}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
  <div style={{ marginTop: 4, fontSize: 11, opacity: 0.6 }}>Read-only snapshot.</div>
    </section>
  ); })()}
      {/* Flight Forecast Widget (horizontal like POB Forecast) */}
  {visible.flightForecast && (() => { const wc = widgetColorTheme('flightForecast'); return (
    <section
      onPointerDown={e => onPointerDown(e,'flightForecast')}
      style={{ position:'absolute', left:(layout.flightForecast?.x||340), top:(layout.flightForecast?.y||160), padding: '6px 8px', background: wc.base||theme.surface, border: '1px solid '+(wc.border||widgetBorderColor), borderRadius: 8, display:'inline-block', cursor: editLayout ? 'grab' : 'default', boxShadow: editLayout ? '0 0 0 2px rgba(255,255,0,0.3)' : 'none', color: wc.text||theme.text }}>
    <h3 style={{ margin: '0 0 4px', fontSize: 16, background: wc.header||'transparent', padding: wc.header?'4px 6px':0, borderRadius:4, color: wc.text||theme.text }}>Flight Forecast</h3>
    <div style={{ overflowX:'auto' }}>
      <table style={{ borderCollapse:'collapse', width:'auto', tableLayout:'auto', fontSize:11 }}>
        <thead>
          <tr>
            <th style={thStyle(theme, undefined, wc)}></th>
            {next7.map(d => (
              <th key={d.key} style={thStyle(theme, undefined, wc)} title={d.key}>{d.dow} {d.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...tdLeft(theme, wc), fontWeight:'bold' }}>Flights Out (+)</td>
            {next7.map(d => {
              const arr = flightDeltas.out[d.key] || [];
              const total = arr.reduce((sum, s) => {
                const n = parseInt(String(s).split('-')[0], 10); return sum + (isNaN(n)?0:n);
              }, 0);
              return <td key={d.key} style={tdStyle(theme, wc)} title={arr.join(', ')}>{total || ''}</td>;
            })}
          </tr>
          <tr>
            <td style={{ ...tdLeft(theme, wc), fontWeight:'bold' }}>Flights In (-)</td>
            {next7.map(d => {
              const arr = flightDeltas.in[d.key] || [];
              const total = arr.reduce((sum, s) => {
                const n = parseInt(String(s).split('-')[0], 10); return sum + (isNaN(n)?0:n);
              }, 0);
              return <td key={d.key} style={tdStyle(theme, wc)} title={arr.join(', ')}>{total || ''}</td>;
            })}
          </tr>
        </tbody>
      </table>
    </div>
    <div style={{ marginTop:4, fontSize:10, opacity:0.6 }}>Derived from POB deltas (company count changes).</div>
    </section>
  ); })()}
      {/* POB Onboard Widget */}
  {visible.onboard && (() => { const wc = widgetColorTheme('onboard'); return (
    <section
        onPointerDown={e => onPointerDown(e,'onboard')}
        style={{ position:'absolute', left:layout.onboard.x, top:layout.onboard.y, padding: '12px 14px', background: wc.base||theme.surface, border: '1px solid '+(wc.border||widgetBorderColor), borderRadius: 8, display: 'inline-block', cursor: editLayout ? 'grab':'default', boxShadow: editLayout ? '0 0 0 2px rgba(255,255,0,0.3)' : 'none', color: wc.text||theme.text }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
          <h3 style={{ margin:0, fontSize:16, background: wc.header||'transparent', padding: wc.header?'4px 6px':0, borderRadius:4 }}>POB Onboard</h3>
          <button onClick={refreshPersonnel} style={{ background: wc.header||theme.primary, color: wc.text||theme.text, border: '1px solid '+(wc.border||theme.secondary), padding: '4px 8px', borderRadius:4, cursor:'pointer', fontSize:11 }}>Refresh</button>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ borderCollapse:'collapse', width:'auto', tableLayout:'auto', fontSize:11 }}>
            <thead>
              <tr>
                {['Core','Name','Company','Crew','Rotation','Arrival','Days On-Board','Notes'].map(h => (
                  <th key={h} style={{ padding:'4px 6px', border:'1px solid '+(wc.border||widgetBorderColor), background: wc.header||theme.primary, color: wc.text||theme.text, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {withComputed.map(p => (
                <tr key={p.id}>
                  <td style={onCell(theme, wc)}>{p.coreCrew ? 'Yes' : ''}</td>
                  <td style={onCell(theme, wc)} title={`${p.firstName||''} ${p.lastName||''}`}>{(p.firstName||'') + ' ' + (p.lastName||'')}</td>
                  <td style={onCell(theme, wc)} title={p.company}>{p.company}</td>
                  <td style={onCell(theme, wc)} title={p.crew}>{p.crew}</td>
                  <td style={onCell(theme, wc)} title={p.rotation}>{p.rotation}</td>
                  <td style={onCell(theme, wc)}>{fmtDate(p.arrivalDate)}</td>
                  <td style={onCell(theme, wc)}>{p.daysOnboardDisplay}</td>
                  <td style={{ ...onCell(theme, wc), maxWidth:240, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }} title={p.notes}>{p.notes}</td>
                </tr>
              ))}
              {withComputed.length === 0 && (
                <tr><td colSpan={8} style={{ ...onCell(theme, wc), fontStyle:'italic', textAlign:'center' }}>No onboard personnel</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop:4, fontSize:10, opacity:0.6 }}>Snapshot of personnelRecords (Onboard only).</div>
    </section>
  ); })()}
      {/* POB Companies Widget */}
  {visible.pobCompanies && (() => {
    const wc = widgetColorTheme('pobCompanies');
    // Aggregate counts by company for onboard personnel
    const coreCounts = {};
    const nonCoreCounts = {};
    onboard.forEach(p => {
      const comp = p.company || 'Unassigned';
      if (p.coreCrew) coreCounts[comp] = (coreCounts[comp] || 0) + 1; else nonCoreCounts[comp] = (nonCoreCounts[comp] || 0) + 1;
    });
    // Planned counts from planner for today (if available)
    const todayKey = next7[0]?.key;
    const plannedCounts = {};
    visibleCompanies.forEach(r => {
      if (!todayKey) return;
      const val = parseInt(r[todayKey], 10);
      if (!isNaN(val)) plannedCounts[r.company] = val;
    });
    const sortedCore = Object.entries(coreCounts).sort((a,b)=> a[0].localeCompare(b[0]));
    const sortedNon = Object.entries(nonCoreCounts).sort((a,b)=> a[0].localeCompare(b[0]));
    const totalOnboard = onboard.length;
    const longestNameLen = Math.max(0, ...sortedCore.map(c=>c[0].length), ...sortedNon.map(c=>c[0].length));
    // Estimate width: charLength * 7px + padding + number column; clamp to sensible bounds
    const widgetWidth = Math.min(300, Math.max(150, longestNameLen * 7 + 70));
    const nameMaxWidth = widgetWidth - 60; // reserve space for count & gaps
    return (
      <section
        onPointerDown={e => onPointerDown(e,'pobCompanies')}
        style={{ position:'absolute', left:layout.pobCompanies.x, top:layout.pobCompanies.y, padding:'10px 12px', background: wc.base||theme.surface, border:'1px solid '+(wc.border||widgetBorderColor), borderRadius:8, width: widgetWidth, cursor: editLayout? 'grab':'default', boxShadow: editLayout ? '0 0 0 2px rgba(255,255,0,0.3)':'none', color: wc.text||theme.text }}>
        <div style={{ fontSize:30, fontWeight:'bold', lineHeight:1, textAlign:'center', marginBottom:6, background: wc.header||'transparent', padding: wc.header?'4px 6px':0, borderRadius:4 }} title="Total persons onboard">{totalOnboard}</div>
        <div style={{ fontSize:12, fontWeight:'bold', marginBottom:4, borderBottom:'1px solid '+(wc.border||widgetBorderColor), paddingBottom:2 }}>Core Crew</div>
        {sortedCore.length>0 ? (
          <ul style={{ listStyle:'none', margin:0, padding:0, fontSize:11, marginBottom:8 }}>
            {sortedCore.map(([comp,count]) => {
              const planned = plannedCounts[comp];
              const mismatch = planned !== undefined && planned !== count;
              return (
                <li key={comp} style={{ display:'flex', justifyContent:'space-between', padding:'2px 0', borderBottom:'1px dashed '+(wc.border||'#999'), gap:6, background: mismatch ? 'rgba(255,80,80,0.25)': 'transparent' }} title={planned !== undefined ? `Onboard: ${count} | Planned: ${planned}` : `Onboard: ${count} | Planned: N/A`}>
                  <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:nameMaxWidth }}>{comp}</span>
                  <span style={{ fontWeight:600 }}>{count}</span>
                </li>
              );
            })}
          </ul>
        ) : <div style={{ fontSize:10, fontStyle:'italic', opacity:0.6, marginBottom:6 }}>None</div>}
        <div style={{ fontSize:12, fontWeight:'bold', marginBottom:4, borderBottom:'1px solid '+(wc.border||widgetBorderColor), paddingBottom:2 }}>Non-Core</div>
        {sortedNon.length>0 ? (
          <ul style={{ listStyle:'none', margin:0, padding:0, fontSize:11 }}>
            {sortedNon.map(([comp,count]) => {
              const planned = plannedCounts[comp];
              const mismatch = planned !== undefined && planned !== count;
              return (
                <li key={comp} style={{ display:'flex', justifyContent:'space-between', padding:'2px 0', borderBottom:'1px dashed '+(wc.border||'#999'), gap:6, background: mismatch ? 'rgba(255,80,80,0.25)': 'transparent' }} title={planned !== undefined ? `Onboard: ${count} | Planned: ${planned}` : `Onboard: ${count} | Planned: N/A`}>
                  <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:nameMaxWidth }}>{comp}</span>
                  <span style={{ fontWeight:600 }}>{count}</span>
                </li>
              );
            })}
          </ul>
        ) : <div style={{ fontSize:10, fontStyle:'italic', opacity:0.6 }}>None</div>}
        <div style={{ marginTop:6, fontSize:9, opacity:0.55 }}>Grouped by company (onboard only).</div>
      </section>
    );
  })()}
  </div>
      </div>
    </StyledThemeProvider>
  );
}

export default Dashboard;

// Styling helpers
const thStyle = (theme, hasComments, wc) => {
  const borderColor = wc?.border || (theme.name === 'Dark' ? '#bfc4ca' : '#444');
  return {
    padding: '3px 4px',
    border: `1px solid ${borderColor}`,
    background: wc?.header || theme.primary,
    color: wc?.text || theme.text,
    fontSize: 10,
    textAlign: 'center',
    whiteSpace: 'nowrap',
    width: 'auto'
  };
};
const tdStyle = (theme, wc) => {
  const borderColor = (wc?.border && wc.base) ? wc.border : (theme.name === 'Dark' ? '#bfc4ca40' : '#444');
  return {
    padding: '2px 4px',
    border: `1px solid ${borderColor}`,
    fontSize: 10,
    textAlign: 'center',
    color: wc?.text || theme.text,
    background: wc?.base ? wc.base : 'transparent'
  };
};
const tdLeft = (theme, wc) => ({
  ...tdStyle(theme, wc),
  textAlign: 'left',
  fontWeight: 500,
  maxWidth: 120,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
});

// Cell style for onboard widget
const onCell = (theme, wc) => ({
  padding: '3px 6px',
  border: '1px solid ' + (wc?.border || (theme.name === 'Dark' ? '#bfc4ca40' : '#444')),
  fontSize: 11,
  whiteSpace: 'nowrap',
  textAlign: 'left',
  verticalAlign: 'top',
  color: wc?.text || theme.text,
  background: wc?.base || 'transparent'
});
