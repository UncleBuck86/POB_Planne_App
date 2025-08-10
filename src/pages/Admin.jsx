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
  return (
    <div style={{ background: theme.background, color: theme.text, minHeight:'100vh', padding:'24px 26px 60px' }}>
      <h2 style={{ marginTop:0 }}>Admin Panel</h2>
      <div style={{ fontSize:12, opacity:.75, marginBottom:18 }}>Restricted utilities and configuration.</div>
      <section style={card(theme)}>
        <div style={sectionHeader(theme)}>Flight Tools</div>
        <p style={{ marginTop:0, fontSize:13, lineHeight:1.4 }}>Access the manifest template builder to prepare, export, and print flight manifests.</p>
        <a href="#manifest" style={btn(theme)}>Open Manifest Template</a>
      </section>
      <section style={card(theme)}>
        <div style={sectionHeader(theme)}>Admin Access</div>
        <p style={{ marginTop:0, fontSize:12, opacity:.7 }}>To revoke admin mode run in console:<br/><code>localStorage.removeItem('pobIsAdmin'); location.reload();</code></p>
      </section>
      <div style={{ marginTop:20 }}>
        <h3 style={{ margin:'8px 0 4px' }}>Flight Locations</h3>
        <div style={{ fontSize:11, opacity:.7, marginBottom:6 }}>These populate location selectors (e.g., user dashboard & manifest auto flight numbers). Keep names concise.</div>
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
      <div style={{ marginTop:20 }}>
        <h3 style={{ margin:'8px 0 4px' }}>Aircraft Types</h3>
        {aircraftTypes.length ? (
          <ul style={{ margin:0, paddingLeft:18, fontSize:12 }}>
            {aircraftTypes.map((t,i)=> {
              if (typeof t === 'string') return <li key={i}>{t}</li>;
              const pax = t.maxPax? `Pax ${t.maxPax}`:'';
              const ob = t.maxOutboundWeight? `OB Wt ${t.maxOutboundWeight}`:'';
              const ib = t.maxInboundWeight? `IB Wt ${t.maxInboundWeight}`:'';
              const parts = [pax,ob,ib].filter(Boolean).join(' | ');
              return <li key={i}>{t.type || '(unnamed)'} {parts && ' - '+parts}</li>;
            })}
          </ul>
        ) : <div style={{ fontSize:12, opacity:.6 }}>No aircraft types defined yet. Open a manifest, click Customize, and add them.</div>}
      </div>
    </div>
  );
}

const card = (theme) => ({ background: theme.surface, border:'1px solid '+(theme.name==='Dark' ? '#555':'#ccc'), borderRadius:12, padding:'16px 18px 18px', marginBottom:28, boxShadow:'0 4px 10px rgba(0,0,0,0.25)' });
const sectionHeader = (theme) => ({ fontSize:15, fontWeight:700, marginBottom:10, paddingBottom:4, borderBottom:'2px solid '+(theme.primary||'#267') });
const btn = (theme) => ({ display:'inline-block', background: theme.primary, color: theme.text, textDecoration:'none', fontWeight:600, padding:'10px 16px', borderRadius:8, border:'1px solid '+(theme.secondary||'#222'), boxShadow:'0 2px 6px rgba(0,0,0,0.3)', fontSize:13 });
