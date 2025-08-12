import React, { useMemo, useState, useEffect, useRef } from 'react';
import { storage } from '../utils/storageAdapter';
import { useTheme } from '../ThemeContext.jsx';
import { registerContextProvider } from '../ai/passiveAI.js';
import { emitEvent } from '../ai/eventBus.js';
import { getAIResponse } from '../ai/client.js';
import { getNextNDays } from '../utils/dateRanges.js';
import { generateFlightDeltas } from '../utils/flightDeltas.js';
import { GRID_SIZE, loadLayout, saveLayout, loadVisibility, saveVisibility, defaultLayout } from '../utils/widgetLayout.js';
import { loadWidgetColors, saveWidgetColors, widgetColorTheme } from '../utils/widgetColors.js';
import { thStyle, tdStyle, tdLeft, onCell } from '../utils/dashboardStyles.js';
import { useToast } from '../alerts/ToastProvider.jsx';
import { explainError } from '../alerts/errorExplain.js';
import styled, { ThemeProvider as StyledThemeProvider, createGlobalStyle } from 'styled-components';
// ...existing code...
// Reuse theming like planner page
const GlobalStyle = createGlobalStyle`
}
  body { background: ${({ theme }) => theme.background}; color: ${({ theme }) => theme.text}; transition: background 0.3s, color 0.3s; }
  * { font-family: 'Segoe UI', Arial, sans-serif; }
`;
// Removed local GearButton (now using global navigation gear)
const Dropdown = styled.div`
  position: fixed; top: 54px; right: 16px; background: ${({ theme }) => theme.background || '#fff'}; color: ${({ theme }) => theme.text || '#222'}; border: 1px solid ${({ theme }) => theme.primary}; border-radius: 10px; box-shadow: 0 4px 14px rgba(0,0,0,0.35); min-width: 200px; padding: 14px 16px 16px; z-index: 210;
`;

function DateFormatPicker() {
  const { dateFormat, changeDateFormat, theme } = useTheme();
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <label htmlFor="date-format-select" style={{ fontSize:12 }}>Date Format:</label>
      <select
        id="date-format-select"
        value={dateFormat}
        onChange={e => changeDateFormat(e.target.value)}
        style={{ padding:'6px 8px', border:'1px solid '+(theme.name==='Dark' ? '#666':'#888'), background: theme.surface, color: theme.text, borderRadius:6, fontSize:12 }}
      >
        <option value="mdy">MM/DD/YY</option>
        <option value="dmy">DD/MM/YY</option>
  <option value="iso">YYYY-MM-DD</option>
      </select>
    </div>
  );
}

function Dashboard() {
  // Add autoHide state for widget logic
  const [autoHide, setAutoHide] = useState(true);
  const { theme, team, changeTheme, dateFormat } = useTheme();
  const [aiSuggestion, setAISuggestion] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef(null);
  // Listen for global event to open dashboard settings
  useEffect(()=>{
    const openEvt = () => setSettingsOpen(o=> !o);
    window.addEventListener('openDashboardSettings', openEvt);
    return () => { window.removeEventListener('openDashboardSettings', openEvt); };
  },[]);
  const widgetBorderColor = theme.name === 'Dark' ? '#bfc4ca' : '#444';
  // User location setting (persisted locally per user)
  const userLocKey = 'pobUserLocation';
  const [userLocation, setUserLocation] = useState(() => storage.get(userLocKey) || '');
  const [availableLocations, setAvailableLocations] = useState(() => storage.getJSON('flightManifestLocations', []));
  // Load location caps (max, flotel, fieldBoat) for highlighting
  const [locationCaps, setLocationCaps] = useState(()=> storage.getJSON('pobLocationCaps', {}));
  useEffect(()=> {
    const onStorage = (e) => { if (e.key === 'pobLocationCaps') { try { setLocationCaps(JSON.parse(e.newValue)||{}); } catch { setLocationCaps({}); } } };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
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
  useEffect(() => { storage.set(userLocKey, userLocation); }, [userLocation]);
  // Load stored planner data (non-editable view)
  const [rowData, setRowData] = useState([]);
  const [comments, setComments] = useState({});
  useEffect(() => {
  try { setRowData(storage.getJSON('pobPlannerData', []) || []); } catch { setRowData([]); }
  try { setComments(storage.getJSON('pobPlannerComments', {}) || {}); } catch { setComments({}); }
  }, []);
  // Load personnel records (snapshot + optional manual refresh)
  const [personnelSnapshot, setPersonnelSnapshot] = useState(() => storage.getJSON('personnelRecords', []));
  const refreshPersonnel = () => {
    try { setPersonnelSnapshot(storage.getJSON('personnelRecords', [])); } catch { /* ignore */ }
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
  const next7 = useMemo(()=> getNextNDays(7, new Date(), dateFormat), [dateFormat]);
  const visibleCompanies = rowData.filter(r => r.company && r.company.trim());
  const hasComments = useMemo(() => next7.some(d => (comments[d.key] || '').trim().length > 0), [comments, next7]);
  const totalsPerDay = next7.reduce((acc, d) => {
    acc[d.key] = visibleCompanies.reduce((sum, c) => sum + (parseInt(c[d.key], 10) || 0), 0);
    return acc;
  }, {});
  // Precompute current day caps summary for warning badge
  const todayKey = next7[0]?.key;
  const todayTotal = todayKey ? (totalsPerDay[todayKey] || 0) : 0;
  const currentCaps = locationCaps[userLocation] || {};
  const capMax = parseInt(currentCaps.max,10)||0;
  const capFlotel = parseInt(currentCaps.flotel,10)||0;
  const capFieldBoat = parseInt(currentCaps.fieldBoat,10)||0;
  const capEffective = capMax + capFlotel + capFieldBoat;
  const overMax = capMax>0 && todayTotal > capMax;
  const overEffective = capEffective>0 && todayTotal > capEffective;
  // Precompute flight deltas once for next7 range
  const flightDeltas = useMemo(()=> generateFlightDeltas(rowData, next7.map(n=>n.key)), [rowData, next7]);
  // Build an AI context snapshot summarizing current screen/state (avoid huge raw data)
  const buildAIContext = () => {
    const MAX_COMPANIES = 25;
    const trimmedCompanies = visibleCompanies.slice(0, MAX_COMPANIES).map(c => {
      const minimal = { company: c.company };
      next7.forEach(d => { if (c[d.key]) minimal[d.key] = c[d.key]; });
      return minimal;
    });
    const commentsSummary = next7.reduce((acc,d)=>{ const txt=(comments[d.key]||'').trim(); if (txt) acc[d.key] = txt.split(/\n/).slice(0,3).join(' | '); return acc; }, {});
    return {
      userLocation,
      capacity: { max: capMax, flotel: capFlotel, fieldBoat: capFieldBoat, effective: capEffective, todayTotal, overMax, overEffective },
      days: next7.map(d=> d.key),
      totalsPerDay,
      companiesPreview: trimmedCompanies,
      commentsPreview: commentsSummary,
      widgetsVisible: Object.keys(visible).filter(k=> visible[k]),
      layout: layout,
      timestamp: new Date().toISOString()
    };
  };
  // Passive AI context provider registration (dashboard-specific)
  useEffect(()=> {
    const providerId = '__dashProviderRegistered';
    if (window[providerId]) return; // simple guard to avoid duplicate registration across re-mounts
    try {
      registerContextProvider('dashboard', () => {
        try { return buildAIContext(); } catch { return { error:'buildAIContext failed' }; }
      });
      registerContextProvider('pobTotals', () => ({ todayTotal, capMax, capEffective, overMax, overEffective, location: userLocation }));
      registerContextProvider('onboardStats', () => ({ onboard: onboard.length }));
      registerContextProvider('companiesPreview', () => {
        const preview = visibleCompanies.slice(0,5).map(c=> ({ company:c.company }));
        return { count: visibleCompanies.length, preview };
      });
      window[providerId] = true;
    } catch {/* ignore */}
  }, [todayTotal, capMax, capEffective, overMax, overEffective, userLocation, onboard.length, visibleCompanies]);

  // Emit passive events when POB / capacity status changes
  const lastPOBRef = useRef();
  useEffect(()=> {
    const signature = `${todayTotal}|${capMax}|${capEffective}|${overMax}|${overEffective}|${userLocation}`;
    if (lastPOBRef.current === signature) return;
    lastPOBRef.current = signature;
    emitEvent('POB_TOTAL_CHANGED', { type:'POB_TOTAL_CHANGED', ts: Date.now(), brief:`POB ${todayTotal}/${capMax||'?'}`, meta:{ todayTotal, capMax, capEffective, overMax, overEffective, userLocation } });
    if (overMax) emitEvent('CAPACITY_THRESHOLD', { type:'CAPACITY_THRESHOLD', ts:Date.now(), brief:'Over Max POB', meta:{ errorCode:'POB_OVER_MAX', todayTotal, capMax, capEffective, userLocation } });
    if (overEffective) emitEvent('CAPACITY_THRESHOLD', { type:'CAPACITY_THRESHOLD', ts:Date.now(), brief:'Over Effective Cap', meta:{ errorCode:'POB_OVER_EFFECTIVE', todayTotal, capMax, capEffective, userLocation } });
  }, [todayTotal, capMax, capEffective, overMax, overEffective, userLocation]);
  const { addToast } = useToast();
  // Compute dynamic character-based width per forecast date column (based on longest flight entry or comment line)
  const forecastColCharWidths = useMemo(() => {
    return next7.map(d => {
      let maxLen = 0;
      const outs = (flightDeltas.out[d.key] || []);
      const ins  = (flightDeltas.in[d.key] || []);
      [...outs, ...ins].forEach(entry => { if (entry && entry.length > maxLen) maxLen = entry.length; });
      const comment = comments[d.key] || '';
      comment.split(/\r?\n/).forEach(line => { if (line.length > maxLen) maxLen = line.length; });
      // Clamp to sensible bounds to avoid huge columns
      if (maxLen < 6) maxLen = 6; // minimum readable
      if (maxLen > 30) maxLen = 30; // maximum to keep overall table compact
      return maxLen;
    });
  }, [next7, flightDeltas, comments]);
  // --- Movable widgets layout ---
  const [layout, setLayout] = useState(() => {
    const base = loadLayout();
    // Backfill any missing defaults for newly added widgets
    const ids = ['nav','forecast','flightForecast','onboard','pobCompanies','pobCompaniesForecast','weather','flightStatus','crewCountdown','pobTrend','alerts','quickActions','contractorMix','map'];
    const filled = { ...base };
  ids.forEach(id => { if (!filled[id]) filled[id] = { ...(defaultLayout[id] || { x: 20, y: 20 }) }; });
    return filled;
  });
  useEffect(()=> { saveLayout(layout); }, [layout]);
  const [editLayout, setEditLayout] = useState(false);
  const [visible, setVisible] = useState(loadVisibility);
  useEffect(()=> { saveVisibility(visible); }, [visible]);
  const dragState = useRef({ id:null, offsetX:0, offsetY:0 });
  const containerRef = useRef(null);
  // Mini theme colors per widget
  const [widgetColors, setWidgetColors] = useState(loadWidgetColors);
  const getWC = (id) => widgetColorTheme(widgetColors, id);
  useEffect(()=> { saveWidgetColors(widgetColors); }, [widgetColors]);
  const setWidgetColor = (id,val)=> setWidgetColors(c=> ({...c,[id]:val}));
  const clearWidgetColor = (id)=> setWidgetColors(c=> { const n={...c}; delete n[id]; return n; });
  const onPointerDown = (e, id) => {
    if (!editLayout) return;
    const rect = e.currentTarget.getBoundingClientRect();
    dragState.current = { id, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
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
    const snap = (v) => Math.max(0, Math.round(v / GRID_SIZE) * GRID_SIZE);
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
  if (!menu) return;
  if (menu.contains(e.target)) return;
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

  // Expose context builder globally while dashboard mounted
  useEffect(()=>{ window.__getDashboardAIContext = buildAIContext; return () => { if(window.__getDashboardAIContext === buildAIContext) delete window.__getDashboardAIContext; }; }, [userLocation, capMax, capFlotel, capFieldBoat, capEffective, todayTotal, overMax, overEffective, next7, totalsPerDay, visibleCompanies, comments, visible, layout]);
  return (
    <StyledThemeProvider theme={theme}>
      <GlobalStyle />
  <div style={{ padding: '24px', color: theme.text, background: theme.background, minHeight: '100vh' }}>
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
              <button onClick={() => {
                if (!window.confirm('Reset widget positions to defaults? This will not affect visibility or colors.')) return;
                setLayout({ ...defaultLayout });
              }}
                style={{ background:'#78350f', color:'#fff', border:'1px solid #4a2c0a', padding:'4px 8px', borderRadius:6, cursor:'pointer', fontWeight:'bold', fontSize:11, width:'100%', marginBottom:8 }}>
                Reset Layout (Positions)
              </button>
              <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:220, overflowY:'auto' }}>
                {['nav','forecast','flightForecast','onboard','pobCompanies','pobCompaniesForecast','weather','flightStatus','crewCountdown','pobTrend','alerts','quickActions','contractorMix','map'].map(id => (
                  <label key={id} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <input type="checkbox" checked={visible[id]} onChange={e => { setVisible(v => ({ ...v, [id]: e.target.checked })); if (!editLayout) setSettingsOpen(false); }} />
                    <span>{
                      id === 'nav' ? 'Navigation'
                      : id === 'forecast' ? 'POB Forecast'
                      : id === 'flightForecast' ? 'Flight Forecast'
                      : id === 'onboard' ? 'POB Onboard'
                      : id === 'pobCompanies' ? 'POB Companies'
                      : id === 'pobCompaniesForecast' ? 'POB Companies Forecast'
                      : id === 'weather' ? 'Weather'
                      : id === 'flightStatus' ? 'Flight Status'
                      : id === 'crewCountdown' ? 'Crew Countdown'
                      : id === 'pobTrend' ? 'POB Trend'
                      : id === 'alerts' ? 'Alerts'
                      : id === 'quickActions' ? 'Quick Actions'
                      : id === 'contractorMix' ? 'Contractor Mix'
                      : 'Map'
                    }</span>
                  </label>
                ))}
              </div>
              {editLayout && (
                <div style={{ marginTop:10 }}>
                  <div style={{ fontWeight:'bold', marginBottom:4 }}>Widget Colors (mini theme)</div>
                  {['nav','forecast','flightForecast','onboard','pobCompanies','pobCompaniesForecast','weather','flightStatus','crewCountdown','pobTrend','alerts','quickActions','contractorMix','map'].map(id => {
                    const c = widgetColors[id] || '';
                    return (
                      <div key={id} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                        <span style={{ width:110, fontSize:11 }}>{
                          id==='nav'?'Navigation': id==='forecast'?'POB Forecast': id==='flightForecast'?'Flight Forecast': id==='onboard'?'POB Onboard': id==='pobCompanies'?'POB Companies': id==='pobCompaniesForecast'?'POB Companies Forecast': id==='weather'?'Weather': id==='flightStatus'?'Flight Status': id==='crewCountdown'?'Crew Countdown': id==='pobTrend'?'POB Trend': id==='alerts'?'Alerts': id==='quickActions'?'Quick Actions': id==='contractorMix'?'Contractor Mix':'Map'
                        }</span>
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
              {editLayout && <div style={{ marginTop:6, fontSize:10, opacity:0.7 }}>Drag to reposition (grid {GRID_SIZE}px)</div>}
              {editLayout && <div style={{ marginTop:4, fontSize:10, opacity:0.55 }}>Toggle checkboxes to show / hide widgets.</div>}
              <div style={{ marginTop:12, paddingTop:10, borderTop: '1px solid ' + (theme.name==='Dark' ? '#bfc4ca40':'#ccc') }}>
                <div style={{ fontWeight:'bold', marginBottom:6 }}>Formatting</div>
                <DateFormatPicker />
              </div>
            </div>
          </Dropdown>
        )}
  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
    {(() => {
  // Try to get username from personnelSnapshot or local cache
      let username = '';
      if (personnelSnapshot && personnelSnapshot.length > 0) {
        // Use first onboard user, fallback to first user
        const onboardUser = personnelSnapshot.find(p => p.status === 'Onboard');
        if (onboardUser && onboardUser.firstName) {
          username = onboardUser.firstName + (onboardUser.lastName ? ' ' + onboardUser.lastName : '');
        } else if (personnelSnapshot[0].firstName) {
          username = personnelSnapshot[0].firstName + (personnelSnapshot[0].lastName ? ' ' + personnelSnapshot[0].lastName : '');
        }
      }
      if (!username) {
  // Try local storage via adapter fallback
        try { username = storage.get('username') || ''; } catch {}
      }
      return <h2 style={{ margin:'0 0 4px', color: team === 'dark' ? theme.text : theme.primary }}>Welcome{username ? `, ${username}` : ''}!</h2>;
    })()}
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
    {/* Agent-style AI Suggestion Button */}
    <button
      style={{ padding:'6px 14px', background:theme.secondary, color:theme.text, border:'1px solid '+theme.primary, borderRadius:8, fontWeight:'bold', fontSize:13, marginLeft:12, cursor:'pointer' }}
      onClick={async () => {
        window.dispatchEvent(new CustomEvent('openAISidebar'));
        setAISuggestion('Loading...');
        const pobData = rowData;
        const prompt = `Suggest improvements for POB planning based on this data: ${JSON.stringify(pobData).slice(0, 4000)}`;
        try {
          const aiResponse = await getAIResponse(prompt);
          setAISuggestion(aiResponse);
          window.dispatchEvent(new CustomEvent('setAISuggestion', { detail: aiResponse }));
        } catch (err) {
          const msg = 'AI error: ' + err.message;
          setAISuggestion(msg);
          window.dispatchEvent(new CustomEvent('setAISuggestion', { detail: msg }));
        }
      }}
    >Generate POB Suggestions (AI)</button>
  </div>
  <div ref={containerRef} style={{ position:'relative', minHeight:600 }}>
    {editLayout && (
      <div style={{ position:'absolute', inset:0, background: `repeating-linear-gradient(to right, transparent, transparent ${GRID_SIZE-1}px, ${(theme.name==='Dark')?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)'} ${GRID_SIZE-1}px, ${(theme.name==='Dark')?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)'} ${GRID_SIZE}px), repeating-linear-gradient(to bottom, transparent, transparent ${GRID_SIZE-1}px, ${(theme.name==='Dark')?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)'} ${GRID_SIZE-1}px, ${(theme.name==='Dark')?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)'} ${GRID_SIZE}px)`, pointerEvents:'none', zIndex:0 }} />
    )}
    {/* POB Companies Forecast Widget (week view, company breakdown) */}
    {visible.pobCompaniesForecast && (() => {
      const wc = getWC('pobCompaniesForecast');
      // Respect autoHide: if selected, hide companies with no numbers in the dates shown; if not, show all companies and all dates
      const datesToShow = autoHide ? next7 : dates;
      const companiesToShow = autoHide
        ? visibleCompanies.filter(c => datesToShow.some(d => parseInt(c[d.key], 10) > 0))
        : visibleCompanies;
      const companyRows = companiesToShow.map(companyObj => (
        <tr key={companyObj.company}>
          <td style={{ ...tdStyle(theme, wc), fontWeight:'bold', textAlign:'left', minWidth:120 }}>{companyObj.company}</td>
          {datesToShow.map((d,i) => {
            const val = parseInt(companyObj[d.key], 10) || '';
            const ch = forecastColCharWidths[i] || 10;
            return <td key={d.key} style={{ ...tdStyle(theme, wc), fontSize:12, width: ch + 'ch', textAlign:'center' }}>{val}</td>;
          })}
        </tr>
      ));

      // Total row
      const totalRow = (
        <tr key="total-row" style={{ background: theme.background }}>
          <td style={{ ...tdStyle(theme, wc), fontWeight:'bold', fontSize:12, textAlign:'left' }}>Total POB</td>
          {datesToShow.map((d,i) => {
            const total = companiesToShow.reduce((sum, c) => sum + (parseInt(c[d.key], 10) || 0), 0);
            const ch = forecastColCharWidths[i] || 10;
            return <td key={d.key} style={{ ...tdStyle(theme, wc), fontWeight:'bold', fontSize:12, width: ch + 'ch', textAlign:'center' }}>{total}</td>;
          })}
        </tr>
      );

      // Flights Out row
      const flightsOutRow = (
        <tr key="flights-out-row">
          <td style={{ ...tdStyle(theme, wc), fontWeight:'bold', textAlign:'left' }}>Flights Out (+)</td>
          {datesToShow.map((d,i) => {
            const arr = (flightDeltas.out[d.key]||[]).filter(Boolean);
            const val = arr.join('\n');
            const ch = forecastColCharWidths[i] || 10;
            return <td key={d.key} style={{ ...tdStyle(theme, wc), fontSize:10, whiteSpace:'pre-line', width: ch + 'ch' }}>{val}</td>;
          })}
        </tr>
      );

      // Flights In row
      const flightsInRow = (
        <tr key="flights-in-row">
          <td style={{ ...tdStyle(theme, wc), fontWeight:'bold', textAlign:'left' }}>Flights In (-)</td>
          {datesToShow.map((d,i) => {
            const arr = (flightDeltas.in[d.key]||[]).filter(Boolean);
            const val = arr.join('\n');
            const ch = forecastColCharWidths[i] || 10;
            return <td key={d.key} style={{ ...tdStyle(theme, wc), fontSize:10, whiteSpace:'pre-line', width: ch + 'ch' }}>{val}</td>;
          })}
        </tr>
      );

      // Comments row
      const commentsRow = (
        <tr key="comments-row">
          <td style={{ ...tdStyle(theme, wc), fontWeight:'bold', fontSize:10, textAlign:'left' }}>Comments</td>
          {datesToShow.map((d,i) => {
            const ch = forecastColCharWidths[i] || 10;
            return (
              <td key={d.key} style={{ ...tdStyle(theme, wc), fontStyle: 'italic', whiteSpace: 'pre-line', fontSize: 10, width: ch + 'ch' }} title="Flight / Planner Comments">{comments[d.key] || ''}</td>
            );
          })}
        </tr>
      );

      return (
        <section
          onPointerDown={e => onPointerDown(e,'pobCompaniesForecast')}
          style={{ position:'absolute', left:(layout.pobCompaniesForecast?.x||340), top:(layout.pobCompaniesForecast?.y||520), padding: '6px 8px', background: wc.base||theme.surface, border: '1px solid '+(wc.border||widgetBorderColor), borderRadius: 8, display:'inline-block', cursor: editLayout ? 'grab' : 'default', boxShadow: editLayout ? '0 0 0 2px rgba(255,255,0,0.3)' : 'none', color: wc.text||theme.text }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, background: wc.header||'transparent', padding: wc.header?'4px 6px':0, borderRadius:4, color: wc.text||theme.text }}>POB Snap Shot</h3>
          <div style={{ overflowX:'auto' }}>
            <table style={{ borderCollapse:'collapse', width:'auto', tableLayout:'auto', fontSize:12 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle(theme, hasComments, wc), position:'sticky', left:0 }}>Company</th>
                  {next7.map((d,i) => {
                    const header = `${d.dow} ${d.label}`;
                    const ch = forecastColCharWidths[i] || 10;
                    return <th key={d.key} style={{ ...thStyle(theme, hasComments, wc), width: ch + 'ch' }} title={d.key}>{header}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {companyRows}
                {totalRow}
                {flightsOutRow}
                {flightsInRow}
                {commentsRow}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 4, fontSize: 11, opacity: 0.6 }}>Company breakdown for the week (read-only snapshot).</div>
        </section>
      );
    })()}

    {/* Weather Widget (free API planned; location-select + 3-day placeholder) */}
    {visible.weather && (() => { const wc = getWC('weather'); return (
      <section
        onPointerDown={e => onPointerDown(e,'weather')}
        style={{ position:'absolute', left:layout.weather.x, top:layout.weather.y, padding:'10px 12px', background: wc.base||theme.surface, border:'1px solid '+(wc.border||widgetBorderColor), borderRadius:8, display:'inline-block', cursor: editLayout? 'grab':'default', color: wc.text||theme.text }}>
        <h3 style={{ margin:'0 0 6px', fontSize:16, background: wc.header||'transparent', padding: wc.header?'4px 6px':0, borderRadius:4 }}>Weather</h3>
        <div style={{ fontSize:12, marginBottom:6 }}>3-day forecast for selected location(s). API hookup pending.</div>
        <div style={{ fontSize:11, opacity:0.7 }}>Use Dashboard Settings to toggle visibility. Location picker to be added.</div>
      </section>
    ); })()}

    {/* Flight Status Widget (free API planned) */}
    {visible.flightStatus && (() => { const wc = getWC('flightStatus'); return (
      <section
        onPointerDown={e => onPointerDown(e,'flightStatus')}
        style={{ position:'absolute', left:layout.flightStatus.x, top:layout.flightStatus.y, padding:'10px 12px', background: wc.base||theme.surface, border:'1px solid '+(wc.border||widgetBorderColor), borderRadius:8, display:'inline-block', cursor: editLayout? 'grab':'default', color: wc.text||theme.text }}>
        <h3 style={{ margin:'0 0 6px', fontSize:16, background: wc.header||'transparent', padding: wc.header?'4px 6px':0, borderRadius:4 }}>Flight Status</h3>
        <div style={{ fontSize:12 }}>Live flight tracking via free API (planned). For now, using planner deltas.</div>
      </section>
    ); })()}

    {/* Crew Countdown Widget */}
    {visible.crewCountdown && (() => {
      const wc = getWC('crewCountdown');
      // Basic example: days until 28-day rotation for onboard records
      const targetDays = 28;
      const rows = withComputed.slice(0, 10).map(p => {
        // arrivalDate present; compute days remaining
        let daysOn = 0;
        if (p.arrivalDate) {
          const arr = new Date(p.arrivalDate + 'T00:00:00');
          if (!isNaN(arr)) daysOn = Math.max(0, Math.floor((todayMid - arr) / 86400000) + 1);
        }
        const left = Math.max(0, targetDays - daysOn);
        return { name: `${p.firstName||''} ${p.lastName||''}`.trim() || 'Unknown', company: p.company||'', left };
      });
      return (
        <section
          onPointerDown={e => onPointerDown(e,'crewCountdown')}
          style={{ position:'absolute', left:layout.crewCountdown.x, top:layout.crewCountdown.y, padding:'10px 12px', background: wc.base||theme.surface, border:'1px solid '+(wc.border||widgetBorderColor), borderRadius:8, display:'inline-block', cursor: editLayout? 'grab':'default', color: wc.text||theme.text }}>
          <h3 style={{ margin:'0 0 6px', fontSize:16, background: wc.header||'transparent', padding: wc.header?'4px 6px':0, borderRadius:4 }}>Crew Countdown</h3>
          <div style={{ fontSize:11, marginBottom:6 }}>Showing first 10 onboard to 28-day target (config later).</div>
          <table style={{ borderCollapse:'collapse', fontSize:11 }}>
            <thead><tr><th style={{...thStyle(theme, undefined, wc)}}>Name</th><th style={{...thStyle(theme, undefined, wc)}}>Company</th><th style={{...thStyle(theme, undefined, wc)}}>Days Left</th></tr></thead>
            <tbody>
              {rows.map((r,idx)=> (
                <tr key={idx}><td style={tdStyle(theme, wc)}>{r.name}</td><td style={tdStyle(theme, wc)}>{r.company}</td><td style={{...tdStyle(theme, wc), fontWeight:'bold'}}>{r.left}</td></tr>
              ))}
              {rows.length===0 && <tr><td colSpan={3} style={{...tdStyle(theme, wc), fontStyle:'italic'}}>No onboard personnel</td></tr>}
            </tbody>
          </table>
        </section>
      );
    })()}

    {/* POB Trend Widget (pie + last 7 totals + predict next 7 placeholder) */}
    {visible.pobTrend && (() => {
      const wc = getWC('pobTrend');
      // Core vs Non-Core split from onboard
      let core=0, non=0; onboard.forEach(p => p.coreCrew ? core++ : non++);
      const todayIdx = 0;
      const last7Keys = next7.map(n=>n.key); // placeholder: we only have next7; use totalsPerDay as proxy
      const lastTotals = last7Keys.map(k => totalsPerDay[k] || 0);
      const avg = lastTotals.reduce((a,b)=>a+b,0) / (lastTotals.length||1);
      const predicted = Array.from({length:7}, (_,i)=> Math.round(avg));
      return (
        <section
          onPointerDown={e => onPointerDown(e,'pobTrend')}
          style={{ position:'absolute', left:layout.pobTrend.x, top:layout.pobTrend.y, padding:'10px 12px', background: wc.base||theme.surface, border:'1px solid '+(wc.border||widgetBorderColor), borderRadius:8, display:'inline-block', cursor: editLayout? 'grab':'default', color: wc.text||theme.text }}>
          <h3 style={{ margin:'0 0 6px', fontSize:16, background: wc.header||'transparent', padding: wc.header?'4px 6px':0, borderRadius:4 }}>POB Trend</h3>
          <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
            <div>
              <div style={{ fontSize:12, fontWeight:'bold', marginBottom:4 }}>Core vs Non-Core</div>
              <div style={{ fontSize:11 }}>Core: {core} | Non-Core: {non}</div>
              <div style={{ fontSize:10, opacity:0.7 }}>(Pie chart placeholder)</div>
            </div>
            <div>
              <div style={{ fontSize:12, fontWeight:'bold', marginBottom:4 }}>Totals (7 days)</div>
              <div style={{ fontSize:11 }}>{lastTotals.join(', ')}</div>
              <div style={{ fontSize:12, fontWeight:'bold', marginTop:6 }}>Predicted next 7</div>
              <div style={{ fontSize:11 }}>{predicted.join(', ')}</div>
            </div>
          </div>
        </section>
      );
    })()}

    {/* Alerts Widget (placeholder) */}
    {visible.alerts && (() => { const wc = getWC('alerts'); return (
      <section
        onPointerDown={e => onPointerDown(e,'alerts')}
        style={{ position:'absolute', left:layout.alerts.x, top:layout.alerts.y, padding:'10px 12px', background: wc.base||theme.surface, border:'1px solid '+(wc.border||widgetBorderColor), borderRadius:8, display:'inline-block', cursor: editLayout? 'grab':'default', color: wc.text||theme.text }}>
        <h3 style={{ margin:'0 0 6px', fontSize:16, background: wc.header||'transparent', padding: wc.header?'4px 6px':0, borderRadius:4 }}>Alerts</h3>
        <div style={{ fontSize:11, opacity:0.75 }}>Placeholder for realtime alerts / messaging between online users.</div>
      </section>
    ); })()}

    {/* Quick Actions Widget (placeholder) */}
    {visible.quickActions && (() => { const wc = getWC('quickActions'); return (
      <section
        onPointerDown={e => onPointerDown(e,'quickActions')}
        style={{ position:'absolute', left:layout.quickActions.x, top:layout.quickActions.y, padding:'10px 12px', background: wc.base||theme.surface, border:'1px solid '+(wc.border||widgetBorderColor), borderRadius:8, display:'inline-block', cursor: editLayout? 'grab':'default', color: wc.text||theme.text }}>
        <h3 style={{ margin:'0 0 6px', fontSize:16, background: wc.header||'transparent', padding: wc.header?'4px 6px':0, borderRadius:4 }}>Quick Actions</h3>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button style={{ padding:'6px 10px', border:'1px solid '+(wc.border||widgetBorderColor), borderRadius:6, background: theme.primary, color: theme.text }} onClick={()=> window.location.hash = '#planner'}>Open Planner</button>
          <button style={{ padding:'6px 10px', border:'1px solid '+(wc.border||widgetBorderColor), borderRadius:6, background: theme.primary, color: theme.text }} onClick={()=> window.dispatchEvent(new CustomEvent('openDashboardSettings'))}>Dashboard Settings</button>
        </div>
      </section>
    ); })()}

    {/* Contractor Mix Widget (company counts) */}
    {visible.contractorMix && (() => {
      const wc = getWC('contractorMix');
      const coreCounts = {}; const nonCoreCounts = {};
      onboard.forEach(p => { const comp=p.company||'Unassigned'; if (p.coreCrew) coreCounts[comp]=(coreCounts[comp]||0)+1; else nonCoreCounts[comp]=(nonCoreCounts[comp]||0)+1; });
      const coreArr = Object.entries(coreCounts).sort((a,b)=> a[0].localeCompare(b[0]));
      const nonArr = Object.entries(nonCoreCounts).sort((a,b)=> a[0].localeCompare(b[0]));
      return (
        <section
          onPointerDown={e => onPointerDown(e,'contractorMix')}
          style={{ position:'absolute', left:layout.contractorMix.x, top:layout.contractorMix.y, padding:'10px 12px', background: wc.base||theme.surface, border:'1px solid '+(wc.border||widgetBorderColor), borderRadius:8, display:'inline-block', cursor: editLayout? 'grab':'default', color: wc.text||theme.text }}>
          <h3 style={{ margin:'0 0 6px', fontSize:16, background: wc.header||'transparent', padding: wc.header?'4px 6px':0, borderRadius:4 }}>Contractor Mix</h3>
          <div style={{ display:'flex', gap:24 }}>
            <div>
              <div style={{ fontWeight:'bold', marginBottom:4 }}>Core</div>
              <ul style={{ listStyle:'none', padding:0, margin:0, fontSize:11 }}>
                {coreArr.map(([c,n])=> <li key={'c-'+c} style={{ display:'flex', justifyContent:'space-between', gap:8, minWidth:220 }}><span>{c}</span><span style={{ fontWeight:600 }}>{n}</span></li>)}
                {coreArr.length===0 && <li style={{ fontStyle:'italic', opacity:0.6 }}>None</li>}
              </ul>
            </div>
            <div>
              <div style={{ fontWeight:'bold', marginBottom:4 }}>Non-Core</div>
              <ul style={{ listStyle:'none', padding:0, margin:0, fontSize:11 }}>
                {nonArr.map(([c,n])=> <li key={'n-'+c} style={{ display:'flex', justifyContent:'space-between', gap:8, minWidth:220 }}><span>{c}</span><span style={{ fontWeight:600 }}>{n}</span></li>)}
                {nonArr.length===0 && <li style={{ fontStyle:'italic', opacity:0.6 }}>None</li>}
              </ul>
            </div>
          </div>
        </section>
      );
    })()}

    {/* Map Widget (placeholder for nautical locations) */}
    {visible.map && (() => { const wc = getWC('map'); return (
      <section
        onPointerDown={e => onPointerDown(e,'map')}
        style={{ position:'absolute', left:layout.map.x, top:layout.map.y, padding:'10px 12px', background: wc.base||theme.surface, border:'1px solid '+(wc.border||widgetBorderColor), borderRadius:8, display:'inline-block', cursor: editLayout? 'grab':'default', color: wc.text||theme.text, width: 420 }}>
        <h3 style={{ margin:'0 0 6px', fontSize:16, background: wc.header||'transparent', padding: wc.header?'4px 6px':0, borderRadius:4 }}>Map</h3>
        <div style={{ fontSize:11, opacity:0.75 }}>Map placeholder (nautical locations optional). Will use free tiles API later.</div>
        <div style={{ height:240, background: theme.name==='Dark'?'#0a0a0a':'#e6e6e6', border:'1px dashed '+(wc.border||widgetBorderColor), borderRadius:6, marginTop:6 }} />
      </section>
    ); })()}
  {/* Navigation Widget */}
  {visible.nav && (() => { const wc = getWC('nav'); return (
    <div
      onPointerDown={e => onPointerDown(e,'nav')}
      style={{ position:'absolute', left:layout.nav.x, top:layout.nav.y, cursor: editLayout ? 'grab' : 'default', userSelect: editLayout ? 'none':'auto', padding: '12px 16px', background: wc.base || theme.surface, border: '1px solid '+(wc.border || '#bfc4ca'), borderRadius: 8, minWidth:260, boxShadow: editLayout ? '0 0 0 2px rgba(255,255,0,0.3)' : 'none', color: wc.text || theme.text }}
    >
  <h3 style={{ margin: '0 0 8px', background: wc.header||'transparent', padding: wc.header? '4px 6px':0, borderRadius:4, color: wc.text || (team === 'dark' ? theme.text : theme.secondary), fontSize:16 }}>Navigation {userLocation && <span style={{ fontSize:11, fontWeight:400, opacity:0.75 }}>({userLocation})</span>}</h3>
      {(overMax || overEffective) && !editLayout && (
        <div style={{ position:'absolute', top:6, right:6, background: overEffective? '#850000':'#c34b00', color:'#fff', fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:12, boxShadow:'0 0 0 2px rgba(0,0,0,0.3)' }} title={overEffective? 'Total POB exceeds Max + Contingency':'Total POB exceeds Max POB'}>POB!</div>
      )}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <li><a href="#planner" style={{ color: wc.text || theme.text, fontWeight: 'bold', textDecoration: 'none' }}>Go to Planner</a></li>
      </ul>
    </div>
  ); })()}
  {/* Forecast Widget */}
  {visible.forecast && (() => { const wc = getWC('forecast'); return (
    <section
      onPointerDown={e => onPointerDown(e,'forecast')}
      style={{ position:'absolute', left:layout.forecast.x, top:layout.forecast.y, padding: '6px 8px', background: wc.base || theme.surface, border: '1px solid '+(wc.border||widgetBorderColor), borderRadius: 8, display:'inline-block', cursor: editLayout ? 'grab' : 'default', boxShadow: editLayout ? '0 0 0 2px rgba(255,255,0,0.3)' : 'none', color: wc.text || theme.text }}>
      <h3 style={{ margin: '0 0 4px', fontSize: 16, background: wc.header||'transparent', padding: wc.header?'4px 6px':0, borderRadius:4, color: wc.text || theme.text }}>POB Forecast</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: 'auto', tableLayout: 'auto' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle(theme, hasComments, wc), position:'sticky', left:0 }}> </th>
                {next7.map((d,i) => {
                  const header = `${d.dow} ${d.label}`;
                  const ch = forecastColCharWidths[i] || 10;
                  return <th key={d.key} style={{ ...thStyle(theme, hasComments, wc), width: ch + 'ch' }} title={d.key}>{header}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const rows = [];
                // Total POB row with highlighting
                rows.push(
                  <tr key="total-pob" style={{ background: theme.background }}>
                    <td style={{ ...tdStyle(theme, wc), fontWeight:'bold', fontSize:11, textAlign:'left', minWidth:110 }}>Total POB</td>
                    {next7.map(d => {
                      const total = totalsPerDay[d.key]||0;
                      const caps = locationCaps[userLocation] || {};
                      const max = parseInt(caps.max,10)||0;
                      const flotel = parseInt(caps.flotel,10)||0;
                      const fieldBoat = parseInt(caps.fieldBoat,10)||0;
                      const effective = max + flotel + fieldBoat;
                      // Toast logic moved to useEffect below
                      let bg = wc.base || 'transparent';
                      let color = wc.text || theme.text;
                      if (max>0 && total>max) {
                        bg = 'rgba(200,0,0,0.35)';
                      }
                      if (effective>0 && total>effective) {
                        bg = 'rgba(120,0,0,0.55)';
                        color = '#fff';
                      }
                      const title = max>0 ? `Total ${total} / Max ${max}${flotel||fieldBoat?` (+Contingency ${effective})`:''}` : `Total ${total}`;
                      return <td key={d.key} style={{ ...tdStyle(theme, wc), fontWeight:'bold', fontSize:12, background:bg, color }} title={title}>{total||''}</td>;
                    })}
                  </tr>
                );
                // Flights Out commentary row like planner (Out: list)
                rows.push(
                  <tr key="flights-out-row">
                    <td style={{ ...tdStyle(theme, wc), fontWeight:'bold', textAlign:'left' }}>Flights Out (+)</td>
                    {next7.map((d,i) => {
                      const arr = (flightDeltas.out[d.key]||[]).filter(Boolean);
                      const val = arr.join('\n');
                      const ch = forecastColCharWidths[i] || 10;
                      return <td key={d.key} style={{ ...tdStyle(theme, wc), fontSize:10, whiteSpace:'pre-line', width: ch + 'ch' }}>{val}</td>;
                    })}
                  </tr>
                );
                // Flights In commentary row like planner (In: list)
                rows.push(
                  <tr key="flights-in-row">
                    <td style={{ ...tdStyle(theme, wc), fontWeight:'bold', textAlign:'left' }}>Flights In (-)</td>
                    {next7.map((d,i) => {
                      const arr = (flightDeltas.in[d.key]||[]).filter(Boolean);
                      const val = arr.join('\n');
                      const ch = forecastColCharWidths[i] || 10;
                      return <td key={d.key} style={{ ...tdStyle(theme, wc), fontSize:10, whiteSpace:'pre-line', width: ch + 'ch' }}>{val}</td>;
                    })}
                  </tr>
                );
                // Comments row (user planner comments)
                rows.push(
                  <tr key="comments-row">
                    <td style={{ ...tdStyle(theme, wc), fontWeight:'bold', fontSize:10, textAlign:'left' }}>Comments</td>
                    {next7.map((d,i) => {
                      const ch = forecastColCharWidths[i] || 10;
                      return (
                        <td key={d.key} style={{ ...tdStyle(theme, wc), fontStyle: 'italic', whiteSpace: 'pre-line', fontSize: 10, width: ch + 'ch' }} title="Flight / Planner Comments">{comments[d.key] || ''}</td>
                      );
                    })}
                  </tr>
                );
                return rows;
              })()}
            </tbody>
          </table>
        </div>
  <div style={{ marginTop: 4, fontSize: 11, opacity: 0.6 }}>Read-only snapshot.</div>
      <div style={{ marginTop:4, fontSize:9, lineHeight:1.4, opacity:0.75, maxWidth:420 }}>
        <span style={{ display:'inline-block', width:12, height:12, background:'rgba(200,0,0,0.35)', border:'1px solid rgba(120,0,0,0.6)', marginRight:4, verticalAlign:'middle' }} /> Over Max POB &le; Effective.{' '}
        <span style={{ display:'inline-block', width:12, height:12, background:'rgba(120,0,0,0.55)', border:'1px solid rgba(80,0,0,0.7)', margin:'0 4px', verticalAlign:'middle' }} /> Over Effective (Max + Contingency).{' '}
        Effective = Max + Flotel + Field Boat.
      </div>
    </section>
  ); })()}
      {/* Flight Forecast Widget (horizontal like POB Forecast) */}
  {visible.flightForecast && (() => { const wc = getWC('flightForecast'); return (
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
  {visible.onboard && (() => { const wc = getWC('onboard'); return (
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
  const wc = getWC('pobCompanies');
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
