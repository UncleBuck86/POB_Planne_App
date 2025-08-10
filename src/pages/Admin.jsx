import React, { useEffect, useState } from 'react';
import { useTheme } from '../ThemeContext.jsx';

const ADMIN_KEY = 'pobIsAdmin';
export const isAdmin = () => {
  try { return localStorage.getItem(ADMIN_KEY) === 'true'; } catch { return false; }
};

export default function AdminPage() {
  const { theme } = useTheme();
  useEffect(()=> { if (!isAdmin()) window.location.hash = '#dashboard'; }, []);
  // Manage manifest locations list
  const [locations, setLocations] = useState(() => {
    try { return JSON.parse(localStorage.getItem('flightManifestLocations')) || []; } catch { return []; }
  });
  const [newLoc, setNewLoc] = useState('');
  // Personnel list options (centralized here for admin)
  const [crewOptions, setCrewOptions] = useState(()=> { try { return JSON.parse(localStorage.getItem('personnelCrewOptions')) || []; } catch { return []; }});
  const [personnelLocOptions, setPersonnelLocOptions] = useState(()=> { try { return JSON.parse(localStorage.getItem('personnelLocationOptions')) || []; } catch { return []; }});
  const [rotationOptions, setRotationOptions] = useState(()=> { try { return JSON.parse(localStorage.getItem('personnelRotationOptions')) || []; } catch { return []; }});
  const [crewText, setCrewText] = useState(()=> crewOptions.join('\n'));
  const [personnelLocText, setPersonnelLocText] = useState(()=> personnelLocOptions.join('\n'));
  const [rotationText, setRotationText] = useState(()=> rotationOptions.join('\n'));
  // Persist changes
  useEffect(()=> { localStorage.setItem('personnelCrewOptions', JSON.stringify(crewOptions)); }, [crewOptions]);
  useEffect(()=> { localStorage.setItem('personnelLocationOptions', JSON.stringify(personnelLocOptions)); }, [personnelLocOptions]);
  useEffect(()=> { localStorage.setItem('personnelRotationOptions', JSON.stringify(rotationOptions)); }, [rotationOptions]);
  // Sync text when lists updated (other tabs / utilities)
  useEffect(()=> { setCrewText(crewOptions.join('\n')); }, [crewOptions]);
  useEffect(()=> { setPersonnelLocText(personnelLocOptions.join('\n')); }, [personnelLocOptions]);
  useEffect(()=> { setRotationText(rotationOptions.join('\n')); }, [rotationOptions]);
  const commitList = (kind) => {
    if (kind==='crew') {
      const cleaned = Array.from(new Set(crewText.split(/\n+/).map(v=>v.trim()).filter(Boolean)));
      setCrewOptions(cleaned);
    } else if (kind==='ploc') {
      const cleaned = Array.from(new Set(personnelLocText.split(/\n+/).map(v=>v.trim()).filter(Boolean)));
      setPersonnelLocOptions(cleaned);
    } else if (kind==='rot') {
      const cleaned = Array.from(new Set(rotationText.split(/\n+/).map(v=>v.trim()).filter(Boolean)));
      setRotationOptions(cleaned);
    }
  };
  const addLocation = () => {
    const trimmed = newLoc.trim();
    if (!trimmed) return;
    if (locations.includes(trimmed)) { setNewLoc(''); return; }
    const next = [...locations, trimmed];
    setLocations(next);
    setNewLoc('');
  };
  const updateLocation = (idx, value) => {
    const trimmed = value.trimStart();
    setLocations(l => l.map((v,i)=> i===idx ? trimmed : v));
  };
  const deleteLocation = (idx) => {
    setLocations(l => l.filter((_,i)=> i!==idx));
  };
  useEffect(()=> { localStorage.setItem('flightManifestLocations', JSON.stringify(locations)); }, [locations]);
  let aircraftTypes = [];
  try { aircraftTypes = JSON.parse(localStorage.getItem('flightManifestAircraftTypes')) || []; } catch {}
  const [activeSection, setActiveSection] = useState(null); // 'flight' | 'personnel' | 'utilities'
  const toggleSection = (key) => setActiveSection(prev => prev === key ? null : key);
  // Triple verification reset handler
  const handleResetPlanner = () => {
    if(!window.confirm('Reset planner data & comments? This clears all planner numbers & comments stored locally. Continue?')) return;
    if(!window.confirm('Second confirmation: This action cannot be undone. Still proceed?')) return;
    const phrase = prompt('FINAL confirmation: type RESET (all caps) to proceed.');
    if(phrase !== 'RESET') { alert('Reset aborted.'); return; }
    localStorage.removeItem('pobPlannerData');
    localStorage.removeItem('pobPlannerComments');
    alert('Planner data cleared. Reload Planner page to see effect.');
  };
  return (
    <div style={{ background: theme.background, color: theme.text, minHeight:'100vh', padding:'24px 26px 60px' }}>
      <h2 style={{ marginTop:0 }}>Admin Panel</h2>
      <div style={{ fontSize:12, opacity:.75, marginBottom:18 }}>Centralized application configuration. Changes persist in local storage and affect all users on this device.</div>
      {/* Section quick access buttons */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom:24 }}>
        <button onClick={()=> { toggleSection('flight'); if(activeSection!=='flight') setTimeout(()=> document.getElementById('admin-flight')?.scrollIntoView({ behavior:'smooth', block:'start' }), 30); }} style={navBtn(theme, '#2d6cdf', activeSection==='flight')}>{activeSection==='flight' ? '✕ Flight & Planner' : 'Flight & Planner'}</button>
        <button onClick={()=> { toggleSection('personnel'); if(activeSection!=='personnel') setTimeout(()=> document.getElementById('admin-personnel')?.scrollIntoView({ behavior:'smooth', block:'start' }), 30); }} style={navBtn(theme, '#c2571d', activeSection==='personnel')}>{activeSection==='personnel' ? '✕ Personnel Lists' : 'Personnel Lists'}</button>
        <button onClick={()=> { toggleSection('utilities'); if(activeSection!=='utilities') setTimeout(()=> document.getElementById('admin-utilities')?.scrollIntoView({ behavior:'smooth', block:'start' }), 30); }} style={navBtn(theme, '#198a5a', activeSection==='utilities')}>{activeSection==='utilities' ? '✕ Utilities & Access' : 'Utilities & Access'}</button>
      </div>
      {/* Flight / Planner Configuration */}
      {activeSection==='flight' && (
      <section id="admin-flight" style={card(theme)}>
        <div style={sectionHeader(theme)}>Flight & Planner Configuration</div>
        <p style={{ marginTop:0, fontSize:12, lineHeight:1.45 }}>Manage flight-related lists and open the manifest template builder.</p>
        <div style={{ marginBottom:18 }}>
          <strong style={{ fontSize:12 }}>Flight Locations</strong>
          <div style={{ fontSize:11, opacity:.7, marginTop:2, marginBottom:6 }}>Populate location dropdowns (Dashboard, Manifest, Planner selector).</div>
          {locations.length === 0 && <div style={{ fontSize:12, opacity:.6, marginBottom:8 }}>No locations yet. Add one below.</div>}
          {locations.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:12 }}>
              {locations.map((loc, idx) => (
                <div key={idx} style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <input
                    type="text"
                    value={loc}
                    onChange={e=>updateLocation(idx, e.target.value)}
                    style={{ flex:1, padding:'6px 8px', border:'1px solid '+(theme.name==='Dark'?'#666':'#888'), background: theme.surface, color: theme.text, borderRadius:6, fontSize:12 }}
                    placeholder="Location name" />
                  <button onClick={()=>deleteLocation(idx)} style={{ padding:'6px 10px', background:'transparent', color: theme.text, border:'1px solid '+(theme.primary||'#267'), borderRadius:6, cursor:'pointer', fontSize:11 }}>Delete</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:4 }}>
            <input
              type="text"
              value={newLoc}
              onChange={e=>setNewLoc(e.target.value)}
              onKeyDown={e=> { if (e.key==='Enter') { addLocation(); } }}
              placeholder="Add new location"
              style={{ flex:1, padding:'8px 10px', border:'1px solid '+(theme.name==='Dark'?'#666':'#888'), background: theme.surface, color: theme.text, borderRadius:8, fontSize:13 }} />
            <button onClick={addLocation} style={{ padding:'8px 14px', background: theme.primary, color: theme.text, border:'1px solid '+(theme.secondary||'#222'), borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:12 }}>Add</button>
          </div>
        </div>
        <a href="#manifest" style={btn(theme)}>Open Manifest Template</a>
        <div style={{ marginTop:18 }}>
          <strong style={{ fontSize:12 }}>Aircraft Types (Read Only)</strong>
          <div style={{ fontSize:11, opacity:.65, margin:'4px 0 6px' }}>Edit inside a manifest (Customize ▶ Aircraft). Shown here for reference.</div>
          {aircraftTypes.length ? (
            <ul style={{ margin:0, paddingLeft:18, fontSize:12, maxHeight:160, overflowY:'auto' }}>
              {aircraftTypes.map((t,i)=> {
                if (typeof t === 'string') return <li key={i}>{t}</li>;
                const pax = t.maxPax? `Pax ${t.maxPax}`:'';
                const ob = t.maxOutboundWeight? `OB ${t.maxOutboundWeight}`:'';
                const ib = t.maxInboundWeight? `IB ${t.maxInboundWeight}`:'';
                const parts = [pax,ob,ib].filter(Boolean).join(' | ');
                return <li key={i}>{t.type || '(unnamed)'} {parts && ' - '+parts}</li>;
              })}
            </ul>
          ) : <div style={{ fontSize:12, opacity:.6 }}>No aircraft types defined yet.</div>}
        </div>
  </section>
  )}
      {/* Personnel Lists */}
  {activeSection==='personnel' && (
  <section id="admin-personnel" style={card(theme)}>
        <div style={sectionHeader(theme)}>Personnel Lists</div>
        <p style={{ marginTop:0, fontSize:12, lineHeight:1.45 }}>Define shared dropdown values for Personnel records. One entry per line. Duplicates & blanks removed on save.</p>
        <div style={{ display:'grid', gap:16, gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))' }}>
          <div>
            <label style={{ fontSize:12, fontWeight:600 }}>Crew Options</label>
            <textarea value={crewText} onChange={e=>setCrewText(e.target.value)} onBlur={()=>commitList('crew')} placeholder="Crew A\nCrew B" style={ta(theme)} rows={8} />
            <div style={help}>Used for Crew dropdown on Personnel page.</div>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600 }}>Personnel Locations</label>
            <textarea value={personnelLocText} onChange={e=>setPersonnelLocText(e.target.value)} onBlur={()=>commitList('ploc')} placeholder="Platform\nWarehouse" style={ta(theme)} rows={8} />
            <div style={help}>Used for Personnel Location field (separate from Flight Locations).</div>
          </div>
            <div>
            <label style={{ fontSize:12, fontWeight:600 }}>Rotation Options</label>
            <textarea value={rotationText} onChange={e=>setRotationText(e.target.value)} onBlur={()=>commitList('rot')} placeholder="14/14\n21/21" style={ta(theme)} rows={8} />
            <div style={help}>Used for Rotation dropdown.</div>
          </div>
        </div>
  </section>
  )}
      {/* Utilities */}
  {activeSection==='utilities' && (
  <section id="admin-utilities" style={card(theme)}>
        <div style={sectionHeader(theme)}>Utilities & Access</div>
        <p style={{ marginTop:0, fontSize:12, opacity:.75 }}>Maintenance, export, and admin access controls.</p>
        <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
          <button onClick={handleResetPlanner} style={utilBtn(theme)}>Reset Planner Data</button>
          <button onClick={()=>{ const payload = {}; ['pobPlannerData','pobPlannerComments','flightManifestLocations','personnelCrewOptions','personnelLocationOptions','personnelRotationOptions','flightManifestAircraftTypes'].forEach(k=>{ try { payload[k]= JSON.parse(localStorage.getItem(k)); } catch { payload[k]= localStorage.getItem(k); } }); const blob = new Blob([JSON.stringify(payload,null,2)], { type:'application/json' }); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='pob-app-export-'+new Date().toISOString().slice(0,10)+'.json'; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 0); }} style={utilBtn(theme)}>Export Config/Data</button>
          <button disabled title="Deactivated for safety" style={{ ...utilBtn(theme), background:'#555', borderColor:'#444', cursor:'not-allowed', opacity:.6 }}>Nuke Local Storage (Disabled)</button>
        </div>
        <div style={{ borderTop:'1px solid '+(theme.primary||'#444'), margin:'14px 0 10px' }} />
        <div style={{ fontWeight:'bold', fontSize:12, marginBottom:6 }}>Admin Access</div>
        <p style={{ marginTop:0, fontSize:11, opacity:.7 }}>To revoke admin mode run in console:<br/><code>localStorage.removeItem('pobIsAdmin'); location.reload();</code></p>
  </section>
  )}
    </div>
  );
}

const card = (theme) => ({ background: theme.surface, border:'1px solid '+(theme.name==='Dark' ? '#555':'#ccc'), borderRadius:12, padding:'16px 18px 18px', marginBottom:28, boxShadow:'0 4px 10px rgba(0,0,0,0.25)' });
const sectionHeader = (theme) => ({ fontSize:15, fontWeight:700, marginBottom:10, paddingBottom:4, borderBottom:'2px solid '+(theme.primary||'#267') });
const btn = (theme) => ({ display:'inline-block', background: theme.primary, color: theme.text, textDecoration:'none', fontWeight:600, padding:'10px 16px', borderRadius:8, border:'1px solid '+(theme.secondary||'#222'), boxShadow:'0 2px 6px rgba(0,0,0,0.3)', fontSize:13 });
const ta = (theme) => ({ width:'100%', marginTop:6, padding:'8px 10px', background: theme.surface, color: theme.text, border:'1px solid '+(theme.name==='Dark'?'#666':'#888'), borderRadius:8, fontFamily:'monospace', fontSize:12, resize:'vertical' });
const help = { fontSize:11, opacity:.6, marginTop:4 };
const utilBtn = (theme) => ({ padding:'8px 12px', background: theme.primary, color: theme.text, border:'1px solid '+(theme.secondary||'#222'), borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600 });
const navBtn = (theme, color, active) => ({
  background: color,
  color:'#fff',
  border:'2px solid '+(active ? '#fff' : '#000'),
  padding:'10px 18px',
  borderRadius:12,
  fontSize:13,
  fontWeight:800,
  cursor:'pointer',
  letterSpacing:'.5px',
  boxShadow: active ? '0 0 0 2px #000, 0 3px 8px rgba(0,0,0,0.45)' : '0 2px 6px rgba(0,0,0,0.35)',
  transition:'filter .2s, transform .15s, box-shadow .2s',
  textShadow:'0 1px 2px rgba(0,0,0,0.4)',
  transform: active ? 'translateY(-2px)' : 'translateY(0)'
});
