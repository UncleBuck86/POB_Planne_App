import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useTheme } from '../ThemeContext.jsx';
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
  const widgetBorderColor = theme.name === 'Dark' ? '#bfc4ca' : '#444';
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
  // --- Movable widgets layout ---
  const GRID = 20; // px grid size
  const layoutKey = 'dashboardWidgetLayoutV1';
  const visibilityKey = 'dashboardWidgetVisibilityV1';
  const defaultLayout = {
    nav: { x: 20, y: 20 },
    forecast: { x: 20, y: 160 },
    onboard: { x: 20, y: 360 }
  };
  const defaultVisibility = { nav: true, forecast: true, onboard: true };
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
  const onPointerDown = (e, id) => {
    if (!editLayout) return;
    const rect = e.currentTarget.getBoundingClientRect();
    dragState.current = { id, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
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

  return (
    <StyledThemeProvider theme={theme}>
      <GlobalStyle />
  <div style={{ padding: '24px', color: theme.text, background: theme.background, minHeight: '100vh' }}>
        <GearButton onClick={() => setSettingsOpen(o => !o)} title="Settings / Theme">⚙️</GearButton>
        {settingsOpen && (
          <Dropdown>
            <div style={{ marginBottom: 8, fontWeight: 'bold' }}>Theme Settings</div>
            <label htmlFor="dash-theme-select" style={{ marginRight: 8 }}>Select Theme:</label>
            <select id="dash-theme-select" value={team} onChange={e => { changeTheme(e.target.value); setSettingsOpen(false); }}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
            <div style={{ marginTop:12, paddingTop:10, borderTop: '1px solid ' + (theme.name==='Dark' ? '#bfc4ca40':'#ccc'), fontSize:12 }}>
              <div style={{ fontWeight:'bold', marginBottom:6 }}>Layout</div>
              <button onClick={() => setEditLayout(e => !e)} style={{ background: editLayout ? theme.secondary : theme.primary, color: theme.text, border:'1px solid '+theme.secondary, padding:'4px 8px', borderRadius:6, cursor:'pointer', fontWeight:'bold', fontSize:11, width:'100%', marginBottom:8 }}>
                {editLayout ? 'Finish Layout' : 'Edit Layout'}
              </button>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {['nav','forecast','onboard'].map(id => (
                  <label key={id} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <input type="checkbox" checked={visible[id]} onChange={e => setVisible(v => ({ ...v, [id]: e.target.checked }))} />
                    <span>{id === 'nav' ? 'Navigation' : id === 'forecast' ? 'POB Forecast' : 'POB Onboard'}</span>
                  </label>
                ))}
              </div>
              {editLayout && <div style={{ marginTop:6, fontSize:10, opacity:0.7 }}>Drag to reposition (grid {GRID}px)</div>}
              {editLayout && <div style={{ marginTop:4, fontSize:10, opacity:0.55 }}>Toggle checkboxes to show / hide widgets.</div>}
            </div>
          </Dropdown>
        )}
  <h2 style={{ marginTop: 0, color: team === 'dark' ? theme.text : theme.primary }}>Dashboard</h2>
  <div ref={containerRef} style={{ position:'relative', minHeight:600 }}>
    {editLayout && (
      <div style={{ position:'absolute', inset:0, background: `repeating-linear-gradient(to right, transparent, transparent ${GRID-1}px, ${(theme.name==='Dark')?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)'} ${GRID-1}px, ${(theme.name==='Dark')?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)'} ${GRID}px), repeating-linear-gradient(to bottom, transparent, transparent ${GRID-1}px, ${(theme.name==='Dark')?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)'} ${GRID-1}px, ${(theme.name==='Dark')?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)'} ${GRID}px)`, pointerEvents:'none', zIndex:0 }} />
    )}
    {/* Navigation Widget */}
  {visible.nav && (<div
      onPointerDown={e => onPointerDown(e,'nav')}
      style={{ position:'absolute', left:layout.nav.x, top:layout.nav.y, cursor: editLayout ? 'grab' : 'default', userSelect: editLayout ? 'none':'auto', padding: '12px 16px', background: theme.surface, border: '1px solid #bfc4ca', borderRadius: 8, minWidth:260, boxShadow: editLayout ? '0 0 0 2px rgba(255,255,0,0.3)' : 'none' }}
    >
      <h3 style={{ margin: '0 0 8px', color: team === 'dark' ? theme.text : theme.secondary, fontSize:16 }}>Navigation</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <li><a href="#planner" style={{ color: theme.text, fontWeight: 'bold', textDecoration: 'none' }}>Go to Planner</a></li>
      </ul>
  </div>)}
    {/* Forecast Widget */}
  {visible.forecast && (<section
      onPointerDown={e => onPointerDown(e,'forecast')}
      style={{ position:'absolute', left:layout.forecast.x, top:layout.forecast.y, padding: '6px 8px', background: theme.surface, border: `1px solid ${widgetBorderColor}`, borderRadius: 8, display: 'inline-block', cursor: editLayout ? 'grab' : 'default', boxShadow: editLayout ? '0 0 0 2px rgba(255,255,0,0.3)' : 'none' }}>
  <h3 style={{ margin: '0 0 4px', color: theme.text, fontSize: 16 }}>POB Forecast</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: 'auto', tableLayout: 'auto' }}>
            <thead>
              <tr>
                <th style={thStyle(theme, hasComments)}>Company</th>
                {next7.map(d => {
                  const header = `${d.dow} ${d.label}`; // single-line compact
                  return (
                    <th key={d.key} style={thStyle(theme, hasComments)} title={d.key}>{header}</th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visibleCompanies.map(c => (
                <tr key={c.id || c.company}>
                  <td style={tdLeft(theme)}>{c.company}</td>
                  {next7.map(d => (
                    <td key={d.key} style={tdStyle(theme)}>{c[d.key] || ''}</td>
                  ))}
                </tr>
              ))}
              <tr style={{ background: theme.background }}>
                <td style={{ ...tdLeft(theme), fontWeight: 'bold', fontSize: 13 }}>Totals</td>
                {next7.map(d => (
                  <td key={d.key} style={{ ...tdStyle(theme), fontWeight: 'bold', fontSize: 11 }}>{totalsPerDay[d.key] || ''}</td>
                ))}
              </tr>
              <tr>
                <td style={{ ...tdLeft(theme), fontStyle: 'italic', fontSize: 13 }}>Comments</td>
                {next7.map(d => (
                  <td key={d.key} style={{ ...tdStyle(theme), fontStyle: 'italic', whiteSpace: 'pre-wrap', fontSize: 10 }}>{comments[d.key] || ''}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
  <div style={{ marginTop: 4, fontSize: 11, opacity: 0.6 }}>Read-only snapshot.</div>
  </section>)}
      {/* POB Onboard Widget */}
  {visible.onboard && (<section
        onPointerDown={e => onPointerDown(e,'onboard')}
        style={{ position:'absolute', left:layout.onboard.x, top:layout.onboard.y, padding: '12px 14px', background: theme.surface, border: `1px solid ${widgetBorderColor}`, borderRadius: 8, display: 'inline-block', cursor: editLayout ? 'grab':'default', boxShadow: editLayout ? '0 0 0 2px rgba(255,255,0,0.3)' : 'none' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
          <h3 style={{ margin:0, fontSize:16 }}>POB Onboard</h3>
          <button onClick={refreshPersonnel} style={{ background: theme.primary, color: theme.text, border: '1px solid '+theme.secondary, padding: '4px 8px', borderRadius:4, cursor:'pointer', fontSize:11 }}>Refresh</button>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ borderCollapse:'collapse', width:'auto', tableLayout:'auto', fontSize:11 }}>
            <thead>
              <tr>
                {['Core','Name','Company','Crew','Rotation','Arrival','Days On-Board','Notes'].map(h => (
                  <th key={h} style={{ padding:'4px 6px', border:`1px solid ${widgetBorderColor}`, background: theme.primary, color: theme.text, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {withComputed.map(p => (
                <tr key={p.id}>
                  <td style={onCell(theme)}>{p.coreCrew ? 'Yes' : ''}</td>
                  <td style={onCell(theme)} title={`${p.firstName||''} ${p.lastName||''}`}>{(p.firstName||'') + ' ' + (p.lastName||'')}</td>
                  <td style={onCell(theme)} title={p.company}>{p.company}</td>
                  <td style={onCell(theme)} title={p.crew}>{p.crew}</td>
                  <td style={onCell(theme)} title={p.rotation}>{p.rotation}</td>
                  <td style={onCell(theme)}>{fmtDate(p.arrivalDate)}</td>
                  <td style={onCell(theme)}>{p.daysOnboardDisplay}</td>
                  <td style={{ ...onCell(theme), maxWidth:240, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }} title={p.notes}>{p.notes}</td>
                </tr>
              ))}
              {withComputed.length === 0 && (
                <tr><td colSpan={8} style={{ ...onCell(theme), fontStyle:'italic', textAlign:'center' }}>No onboard personnel</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop:4, fontSize:10, opacity:0.6 }}>Snapshot of personnelRecords (Onboard only).</div>
  </section>)}
  </div>
      </div>
    </StyledThemeProvider>
  );
}

export default Dashboard;

// Styling helpers
const thStyle = (theme, hasComments) => {
  const borderColor = theme.name === 'Dark' ? '#bfc4ca' : '#444';
  return {
    padding: '3px 4px',
    border: `1px solid ${borderColor}`,
    background: theme.primary,
    color: theme.text,
    fontSize: 10,
    textAlign: 'center',
    whiteSpace: 'nowrap',
    width: 'auto'
  };
};
const tdStyle = (theme) => {
  const borderColor = theme.name === 'Dark' ? '#bfc4ca40' : '#444';
  return {
    padding: '2px 4px',
    border: `1px solid ${borderColor}`,
    fontSize: 10,
    textAlign: 'center'
  };
};
const tdLeft = (theme) => ({
  ...tdStyle(theme),
  textAlign: 'left',
  fontWeight: 500,
  maxWidth: 120,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
});

// Cell style for onboard widget
const onCell = (theme) => ({
  padding: '3px 6px',
  border: '1px solid ' + (theme.name === 'Dark' ? '#bfc4ca40' : '#444'),
  fontSize: 11,
  whiteSpace: 'nowrap',
  textAlign: 'left',
  verticalAlign: 'top'
});
