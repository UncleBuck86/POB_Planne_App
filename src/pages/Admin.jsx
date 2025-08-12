import React, { useEffect, useState } from 'react';
import { emitDomain } from '../ai/eventBus.js';
import { useTheme } from '../ThemeContext.jsx';
import { storage } from '../utils/storageAdapter';
import { fsx } from '../utils/fileSystem';

const ADMIN_KEY = 'pobIsAdmin';
export const isAdmin = () => {
  try {
  const a = storage.get(ADMIN_KEY);
  const b = storage.get('pob_admin');
    return a === 'true' || a === '1' || b === 'true' || b === '1';
  } catch { return false; }
};

export default function AdminPage() {
  const { theme } = useTheme();
  useEffect(()=> { if (!isAdmin()) window.location.hash = '#dashboard'; }, []);
  // Manage manifest locations list
  const [locations, setLocations] = useState(() => storage.getJSON('flightManifestLocations', []));
  const [newLoc, setNewLoc] = useState('');
  // Add Local Storage toggle state
  const [localEnabled, setLocalEnabled] = useState(() => storage.isLocalEnabled());
  const [exportDirName, setExportDirName] = useState('');
  useEffect(()=>{
    (async ()=>{
      try{
        const h = await fsx.getDirHandle('defaultExportDir');
        if (h && h.name) setExportDirName(h.name);
      }catch{ setExportDirName(''); }
    })();
  },[]);
  const chooseExportDir = async () => {
    try{
      if(!fsx.isSupported()) { alert('Folder picker not supported in this browser.'); return; }
      const handle = await fsx.pickDirectory();
      await fsx.storeDirHandle('defaultExportDir', handle);
      setExportDirName(handle.name || 'Selected');
    }catch(e){ /* user canceled or error */ }
  };
  const clearExportDir = async () => { await fsx.clearDirHandle('defaultExportDir'); setExportDirName(''); };

  // Location POB caps & contingencies
  const CAPS_KEY = 'pobLocationCaps';
  const [locationCaps, setLocationCaps] = useState(()=> storage.getJSON(CAPS_KEY, {}));
  useEffect(()=> { storage.setJSON(CAPS_KEY, locationCaps); }, [locationCaps]);
  // Personnel list options (centralized here for admin)
  const [crewOptions, setCrewOptions] = useState(()=> storage.getJSON('personnelCrewOptions', []));
  const [personnelLocOptions, setPersonnelLocOptions] = useState(()=> storage.getJSON('personnelLocationOptions', []));
  const [rotationOptions, setRotationOptions] = useState(()=> storage.getJSON('personnelRotationOptions', []));
  const [crewText, setCrewText] = useState(()=> crewOptions.join('\n'));
  const [personnelLocText, setPersonnelLocText] = useState(()=> personnelLocOptions.join('\n'));
  const [rotationText, setRotationText] = useState(()=> rotationOptions.join('\n'));
  // Persist changes
  useEffect(()=> { storage.setJSON('personnelCrewOptions', crewOptions); }, [crewOptions]);
  useEffect(()=> { storage.setJSON('personnelLocationOptions', personnelLocOptions); }, [personnelLocOptions]);
  useEffect(()=> { storage.setJSON('personnelRotationOptions', rotationOptions); }, [rotationOptions]);
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
    emitDomain('CONFIG_CHANGED', { type:'location_add', name: trimmed }, 'Added location '+trimmed);
  };
  const updateLocation = (idx, value) => {
    const trimmed = value.trimStart();
    setLocations(l => {
      const prevName = l[idx];
      const next = l.map((v,i)=> i===idx ? trimmed : v);
      if (prevName && prevName !== trimmed && locationCaps[prevName]) {
        setLocationCaps(c => {
          const clone = { ...c };
            // Move caps mapping to new name if not occupied
            if (!clone[trimmed]) clone[trimmed] = clone[prevName];
            delete clone[prevName];
            return clone;
        });
      }
    if(prevName !== trimmed) emitDomain('CONFIG_CHANGED', { type:'location_rename', from: prevName, to: trimmed }, 'Renamed location');
      return next;
    });
  };
  const deleteLocation = (idx) => {
    setLocations(l => {
      const name = l[idx];
      if (name && locationCaps[name]) {
        setLocationCaps(c => { const clone={...c}; delete clone[name]; return clone; });
      }
    emitDomain('CONFIG_CHANGED', { type:'location_delete', name }, 'Deleted location '+name);
      return l.filter((_,i)=> i!==idx);
    });
  };
  const updateCap = (loc, field, value) => {
    setLocationCaps(c => {
      const existing = c[loc] || { max: '', flotel: '', fieldBoat: '' };
      const nextVal = value === '' ? '' : Math.max(0, parseInt(value,10) || 0);
      emitDomain('CONFIG_CHANGED', { type:'cap_edit', loc, field, value: nextVal }, 'Updated cap '+loc+' '+field);
      return { ...c, [loc]: { ...existing, [field]: nextVal } };
    });
  };
  useEffect(()=> { storage.setJSON('flightManifestLocations', locations); }, [locations]);
  let aircraftTypes = [];
  try { aircraftTypes = storage.getJSON('flightManifestAircraftTypes', []); } catch {}
  const [activeSection, setActiveSection] = useState(null); // 'flight' | 'personnel' | 'utilities' | 'pob'
  const toggleSection = (key) => setActiveSection(prev => prev === key ? null : key);
  // Triple verification reset handler
  const handleResetPlanner = () => {
    if(!window.confirm('Reset planner data & comments? This clears all planner numbers & comments stored locally. Continue?')) return;
    if(!window.confirm('Second confirmation: This action cannot be undone. Still proceed?')) return;
    const phrase = prompt('FINAL confirmation: type RESET (all caps) to proceed.');
    if(phrase !== 'RESET') { alert('Reset aborted.'); return; }
  storage.remove('pobPlannerData');
  storage.remove('pobPlannerComments');
    alert('Planner data cleared. Reload Planner page to see effect.');
    emitDomain('CONFIG_CHANGED', { type:'planner_reset' }, 'Planner reset');
  };
  useEffect(()=>{
    window.__buckAdminCtx = () => ({ locations: locations.length, crews: crewOptions.length, rotations: rotationOptions.length });
    return ()=> { delete window.__buckAdminCtx; };
  }, [locations, crewOptions, rotationOptions]);
  // Bulk import logic
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkPreview, setBulkPreview] = useState([]);
  const parseBulk = (txt) => {
    const lines = txt.split(/\r?\n/).map(l=>l.trim()).filter(l=>l);
    if(!lines.length) return [];
    const splitLine = (l) => l.includes('\t') ? l.split('\t') : l.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/);
    const header = splitLine(lines[0]).map(h=>h.trim());
    const dateCols = header.slice(1);
    const normDate = (dstr) => {
      if(!dstr) return null;
      const m = dstr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if(!m) return null; return parseInt(m[1])+'/'+parseInt(m[2])+'/'+m[3];
    };
    const mappedDates = dateCols.map(normDate);
    const out = [];
    for(let i=1;i<lines.length;i++){
      const cols = splitLine(lines[i]);
      if(!cols.length) continue; const company = (cols[0]||'').trim(); if(!company) continue;
      const rowVals = {};
      mappedDates.forEach((dk, idx)=>{
        if(!dk) return; const raw = (cols[idx+1]||'').trim(); if(!raw) return; const num = parseInt(raw,10); if(!isNaN(num)) rowVals[dk]=num; });
      out.push({ company, values: rowVals });
    }
    return out;
  };
  useEffect(()=>{ setBulkPreview(parseBulk(bulkText)); }, [bulkText]);
  const applyBulk = () => {
    if(!bulkPreview.length) { setBulkOpen(false); return; }
  let prev = [];
  try { prev = storage.getJSON('pobPlannerData', []) || []; } catch {}
    const map = new Map(prev.map(r=> [ (r.company||'').toLowerCase(), r ]));
    const next = [...prev];
    bulkPreview.forEach(br => {
      const key = br.company.toLowerCase();
      let row = map.get(key);
      if(!row){
        row = { id: 'cmp_' + Math.random().toString(36).slice(2, 10), company: br.company };
        map.set(key, row);
        next.push(row);
      }
      Object.entries(br.values).forEach(([k,v])=>{ row[k]=v; });
    });
  storage.setJSON('pobPlannerData', next);
    setBulkOpen(false);
  };
  const bpTh = { padding:'4px 6px', border:'1px solid #999', background:'#f0f3f6', position:'sticky', top:0 };
  const bpTd = { padding:'4px 6px', border:'1px solid #ccc', verticalAlign:'top' };

  return (
    <div style={{ background: theme.background, color: theme.text, minHeight:'100vh', padding:'24px 26px 60px' }}>
      <h2 style={{ marginTop:0 }}>Admin Panel</h2>
      <div style={{ fontSize:12, opacity:.75, marginBottom:18 }}>Centralized application configuration. Changes are saved locally in this browser and affect anyone using this browser profile on this device.</div>

      {/* System Settings Card */}
      <section id="admin-system" style={card(theme)}>
        <div style={sectionHeader(theme)}>System</div>
        <p style={{ marginTop:0, fontSize:12, opacity:.8 }}>Global system controls for this device.</p>
        <div style={{ display:'grid', gap:12 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:700, marginBottom:6 }}>Local Storage</div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input id="toggle-local-admin" type="checkbox" checked={!!localEnabled} onChange={e=>{ const v=!!e.target.checked; setLocalEnabled(v); storage.setLocalEnabled(v); }} />
              <label htmlFor="toggle-local-admin" style={{ fontSize:12 }}>Enable Local Storage (persist data to this device)</label>
            </div>
            <div style={{ fontSize:11, opacity:.65, marginTop:4 }}>When disabled, the app uses a temporary in-memory store. Data won’t persist after refresh.</div>
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, marginBottom:6 }}>Default Export Folder</div>
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              <button onClick={chooseExportDir} style={utilBtn(theme)} disabled={!fsx.isSupported()}>Choose Folder…</button>
              {exportDirName ? <span style={{ fontSize:12 }}>Selected: <strong>{exportDirName}</strong></span> : <span style={{ fontSize:12, opacity:.6 }}>No folder selected</span>}
              {exportDirName && <button onClick={clearExportDir} style={{ ...utilBtn(theme), background:'#555' }}>Clear</button>}
            </div>
            {!fsx.isSupported() && <div style={{ fontSize:11, opacity:.65, marginTop:4 }}>Your browser may not support native folder picking. On Windows, use the latest Chrome/Edge.</div>}
          </div>
        </div>
      </section>

      {/* Section quick access buttons */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom:24 }}>
        <button onClick={()=> { toggleSection('flight'); if(activeSection!=='flight') setTimeout(()=> document.getElementById('admin-flight')?.scrollIntoView({ behavior:'smooth', block:'start' }), 30); }} style={navBtn(theme, '#2d6cdf', activeSection==='flight')}>{activeSection==='flight' ? '✕ Flight & Planner' : 'Flight & Planner'}</button>
        <button onClick={()=> { toggleSection('personnel'); if(activeSection!=='personnel') setTimeout(()=> document.getElementById('admin-personnel')?.scrollIntoView({ behavior:'smooth', block:'start' }), 30); }} style={navBtn(theme, '#c2571d', activeSection==='personnel')}>{activeSection==='personnel' ? '✕ Personnel Lists' : 'Personnel Lists'}</button>
  <button onClick={()=> { toggleSection('utilities'); if(activeSection!=='utilities') setTimeout(()=> document.getElementById('admin-utilities')?.scrollIntoView({ behavior:'smooth', block:'start' }), 30); }} style={navBtn(theme, '#198a5a', activeSection==='utilities')}>{activeSection==='utilities' ? '✕ Utilities & Access' : 'Utilities & Access'}</button>
  <button onClick={()=> { toggleSection('pob'); if(activeSection!=='pob') setTimeout(()=> document.getElementById('admin-pob')?.scrollIntoView({ behavior:'smooth', block:'start' }), 30); }} style={navBtn(theme, '#d94f90', activeSection==='pob')}>{activeSection==='pob' ? '✕ POB / Bunks' : 'POB / Bunks'}</button>
      </div>
      {/* Flight / Planner Configuration */}
      {activeSection==='flight' && (
      <section id="admin-flight" style={card(theme)}>
        <div style={sectionHeader(theme)}>Flight & Planner Configuration</div>
        <p style={{ marginTop:0, fontSize:12, lineHeight:1.45 }}>Manage flight-related lists and open the manifest template builder.</p>
        <div style={{ marginBottom:18 }}>
          <strong style={{ fontSize:12 }}>Flight Locations & POB Limits</strong>
          <div style={{ fontSize:11, opacity:.7, marginTop:2, marginBottom:6 }}>Manage locations plus regulatory Max POB and contingency bunks (Flotel / Field Boat). Highlighting on Dashboard occurs when forecast exceeds these limits.</div>
          {locations.length === 0 && <div style={{ fontSize:12, opacity:.6, marginBottom:8 }}>No locations yet. Add one below.</div>}
          {locations.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:12 }}>
              {locations.map((loc, idx) => {
                const caps = locationCaps[loc] || { max: '', flotel: '', fieldBoat: '' };
                return (
                <div key={idx} style={{ display:'flex', flexDirection:'column', gap:4, padding:'8px 10px', border:'1px solid '+(theme.name==='Dark'?'#555':'#bbb'), borderRadius:8, background: theme.name==='Dark'? '#2b3034':'#f5f9fc' }}>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <input
                      type="text"
                      value={loc}
                      onChange={e=>updateLocation(idx, e.target.value)}
                      style={{ flex:1, padding:'6px 8px', border:'1px solid '+(theme.name==='Dark'?'#666':'#888'), background: theme.surface, color: theme.text, borderRadius:6, fontSize:12 }}
                      placeholder="Location name" />
                    <button onClick={()=>deleteLocation(idx)} style={{ padding:'6px 10px', background:'transparent', color: theme.text, border:'1px solid '+(theme.primary||'#267'), borderRadius:6, cursor:'pointer', fontSize:11 }}>Delete</button>
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                      <label style={{ fontSize:9, fontWeight:700, opacity:.7 }}>Max POB</label>
                      <input type="number" min="0" value={caps.max} onChange={e=>updateCap(loc,'max', e.target.value)} style={{ width:90, padding:'4px 6px', border:'1px solid '+(theme.name==='Dark'?'#666':'#888'), background: theme.surface, color: theme.text, borderRadius:6, fontSize:11 }} placeholder="e.g. 120" />
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                      <label style={{ fontSize:9, fontWeight:700, opacity:.7 }}>Flotel Bunks</label>
                      <input type="number" min="0" value={caps.flotel} onChange={e=>updateCap(loc,'flotel', e.target.value)} style={{ width:90, padding:'4px 6px', border:'1px solid '+(theme.name==='Dark'?'#666':'#888'), background: theme.surface, color: theme.text, borderRadius:6, fontSize:11 }} placeholder="0" />
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                      <label style={{ fontSize:9, fontWeight:700, opacity:.7 }}>Field Boat Bunks</label>
                      <input type="number" min="0" value={caps.fieldBoat} onChange={e=>updateCap(loc,'fieldBoat', e.target.value)} style={{ width:110, padding:'4px 6px', border:'1px solid '+(theme.name==='Dark'?'#666':'#888'), background: theme.surface, color: theme.text, borderRadius:6, fontSize:11 }} placeholder="0" />
                    </div>
                    <div style={{ alignSelf:'flex-end', fontSize:10, opacity:.65 }}>
                      Eff: {((caps.max||0)+(caps.flotel||0)+(caps.fieldBoat||0))||0}
                    </div>
                  </div>
                </div>
              ); })}
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
  <a href="#logistics/flights/manifest" style={btn(theme)}>Open Manifest Template</a>
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
          <button onClick={()=>{ const payload = {}; ['pobPlannerData','pobPlannerComments','flightManifestLocations','personnelCrewOptions','personnelLocationOptions','personnelRotationOptions','flightManifestAircraftTypes'].forEach(k=>{ try { payload[k]= storage.getJSON(k); } catch { payload[k]= storage.get(k); } }); const json = JSON.stringify(payload,null,2); const fileName='pob-app-export-'+new Date().toISOString().slice(0,10)+'.json'; (async()=>{ try{ const h = await fsx.getDirHandle('defaultExportDir'); if(h){ await fsx.saveFile(h, fileName, json); alert('Saved to '+(h.name||'folder')); return; } } catch{} // fallback to download
 const blob = new Blob([json], { type:'application/json' }); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=fileName; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 0); })(); }} style={utilBtn(theme)}>Export Config/Data</button>
          <button disabled title="Deactivated for safety" style={{ ...utilBtn(theme), background:'#555', borderColor:'#444', cursor:'not-allowed', opacity:.6 }}>Clear Local Data (Disabled)</button>
        </div>
    <div style={{ borderTop:'1px solid '+(theme.primary||'#444'), margin:'14px 0 10px' }} />
    <div style={{ fontWeight:'bold', fontSize:12, marginBottom:6 }}>Admin Access</div>
  <p style={{ marginTop:0, fontSize:11, opacity:.7 }}>To revoke admin mode manually, clear the “Admin Mode” flag from your saved local data for this site and reload.</p>
  </section>
  )}
    {/* POB / Bunk Designer */}
  {activeSection==='pob' && <BunkDesigner theme={theme} />}
    {/* Bulk Import Modal */}
    {bulkOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1200, display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px' }} onClick={e=> { if(e.target===e.currentTarget) setBulkOpen(false); }}>
          <div style={{ background:'#fff', color:'#222', width:'min(780px,100%)', maxHeight:'90vh', overflowY:'auto', borderRadius:14, padding:24, boxShadow:'0 8px 24px rgba(0,0,0,0.4)', position:'relative' }}>
            <h3 style={{ marginTop:0 }}>Bulk Import Companies</h3>
            <p style={{ fontSize:12, lineHeight:1.4 }}>
              Paste rows from a spreadsheet (first row header). First column must be Company. Subsequent headers should be dates (M/D/YYYY). Cells with numbers will be imported. Blank cells ignored.
              <br/>Example (Tab separated):
              <br/>Company\t8/10/2025\t8/11/2025
              <br/>ACME\t3\t4
            </p>
            <textarea value={bulkText} onChange={e=> setBulkText(e.target.value)} placeholder={'Company\t8/10/2025\t8/11/2025\nACME\t3\t4'} style={{ width:'100%', minHeight:160, fontFamily:'monospace', fontSize:12, padding:10, border:'1px solid #888', borderRadius:8, resize:'vertical' }} />
            <div style={{ marginTop:14, fontSize:12 }}>
              <strong>Preview ({bulkPreview.length} rows)</strong>
              {bulkPreview.length>0 ? (
                <div style={{ marginTop:8, maxHeight:200, overflowY:'auto', border:'1px solid #ccc', borderRadius:8 }}>
                  <table style={{ borderCollapse:'collapse', width:'100%', fontSize:11 }}>
                    <thead><tr><th style={bpTh}>Company</th><th style={bpTh}>Dates & Values</th></tr></thead>
                    <tbody>
                      {bulkPreview.map((r,i)=> (
                        <tr key={i}>
                          <td style={bpTd}>{r.company}</td>
                          <td style={bpTd}>{Object.entries(r.values).map(([k,v])=> k+':'+v).join(', ')||'(no values)'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div style={{ marginTop:4, fontStyle:'italic', opacity:.6 }}>No parsable rows yet.</div>}
            </div>
            <div style={{ marginTop:16, display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button onClick={()=>setBulkOpen(false)} style={{ padding:'6px 14px', background:'#bbb', border:'1px solid #999', borderRadius:8, cursor:'pointer' }}>Cancel</button>
              <button disabled={!bulkPreview.length} onClick={applyBulk} style={{ padding:'6px 14px', background: bulkPreview.length? '#388e3c':'#888', color:'#fff', border:'1px solid '+(bulkPreview.length? '#2e7030':'#666'), borderRadius:8, cursor: bulkPreview.length? 'pointer':'not-allowed', fontWeight:'bold' }}>Apply Import</button>
            </div>
          </div>
        </div>
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

// --- Bunk Designer Component ---
function BunkDesigner({ theme }) {
  const [bunks, setBunks] = useState(()=> storage.getJSON('pobBunkConfig', []));
  const [assignments] = useState(()=> storage.getJSON('pobBunkAssignments', {}));
  const [filter, setFilter] = useState('');
  const [newFloor, setNewFloor] = useState('1');
  const [newSection, setNewSection] = useState('A');
  const [newCount, setNewCount] = useState(1);
  const [showAddHelp, setShowAddHelp] = useState(false);
  // Migration: ensure each bunk has floor & force capacity=1
  useEffect(()=>{
    let changed = false;
    const next = bunks.map(b=>{
      let updated = { ...b };
      if(!('floor' in updated)) { updated.floor = '1'; changed = true; }
      if(updated.capacity !== 1) { updated.capacity = 1; changed = true; }
      return updated;
    });
    if(changed) {
      setBunks(next);
  try { storage.setJSON('pobBunkConfig', next); } catch{}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const persist = (next) => { setBunks(next); try { storage.setJSON('pobBunkConfig', next); } catch{} };
  const [newPattern, setNewPattern] = useState('hyphen-num'); // 'num' | 'hyphen-num' | 'hyphen-alpha'
  const alphaSeq = (n) => { // 1 -> A, 27 -> AA
    let s='';
    while(n>0){ const rem=(n-1)%26; s=String.fromCharCode(65+rem)+s; n=Math.floor((n-1)/26); }
    return s;
  };
  const addBlock = () => {
    const section = newSection.trim().toUpperCase()||'A';
    const floor = (newFloor.trim()||'1');
    const relevant = bunks.filter(b=> b.section===section && (b.floor||'1')===floor);
    // derive base index depending on pattern
    let baseIndex = 0;
    if(newPattern==='hyphen-alpha'){
      relevant.forEach(b=> {
        let part = '';
        if(b.id.includes('-')) part = b.id.split('-').pop(); else if(b.id.startsWith(section)) { const tail = b.id.slice(section.length); if(/^[A-Z]+$/.test(tail)) part=tail; }
        if(/^[A-Z]+$/.test(part)){
          // convert letters to number
          let val=0; for(const ch of part){ val = val*26 + (ch.charCodeAt(0)-64); }
          if(val>baseIndex) baseIndex=val;
        }
      });
    } else { // numeric patterns
      relevant.forEach(b=> {
        let part='';
        if(b.id.includes('-')) part = b.id.split('-').pop(); else if(b.id.startsWith(section)) part = b.id.slice(section.length);
        const num=parseInt(part,10);
        if(!isNaN(num) && num>baseIndex) baseIndex=num;
      });
    }
    const created=[];
    for(let i=1;i<=newCount;i++){
      let id;
      if(newPattern==='num') id = section + (baseIndex+i);
      else if(newPattern==='hyphen-num') id = section + '-' + (baseIndex+i);
      else if(newPattern==='hyphen-alpha') id = section + '-' + alphaSeq(baseIndex+i);
      else id = section + (baseIndex+i);
      created.push({ id, floor, section, capacity:1 });
    }
    persist([...bunks, ...created]);
  };
  const updateBunk = (id, field, value) => {
    persist(bunks.map(b=> b.id===id? { ...b, [field]: value }: b));
  };
  const deleteBunk = (id) => { if(!window.confirm('Delete bunk '+id+'?')) return; persist(bunks.filter(b=> b.id!==id)); };
  const clearAll = () => { if(!window.confirm('Remove ALL bunks?')) return; persist([]); };
  const filtered = filter? bunks.filter(b=> (b.id+b.section+(b.floor||'')).toLowerCase().includes(filter.toLowerCase())): bunks;
  // Group by floor then section
  const byFloor = {};
  filtered.forEach(b=> { const f = b.floor||'1'; byFloor[f] = byFloor[f]||{}; const sec = b.section; byFloor[f][sec] = byFloor[f][sec]||[]; byFloor[f][sec].push(b); });
  Object.values(byFloor).forEach(secMap=> Object.values(secMap).forEach(list=> list.sort((a,b)=> a.id.localeCompare(b.id))));
  const floors = Object.keys(byFloor).sort((a,b)=> a.localeCompare(b, undefined, { numeric:true }));
  return (
    <section id="admin-pob" style={card(theme)}>
      <div style={sectionHeader(theme)}>POB / Bunk Layout Designer</div>
      <p style={{ marginTop:0, fontSize:12, lineHeight:1.45 }}>Define floors, rooms (sections), and beds (auto capacity = 1). These feed the POB page for assignment visibility. Future: drag/drop, per-bed notes.</p>
      <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom:14 }}>
        <div style={box(theme)}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
            <div style={label}>Add Block</div>
            <button onClick={()=> setShowAddHelp(s=>!s)} title={showAddHelp? 'Hide help':'Show help'} style={{ background:'transparent', color: theme.text, border:'1px solid '+(theme.name==='Dark'? '#666':'#777'), width:22, height:22, borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:700, lineHeight:'18px', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>?
            </button>
          </div>
          {showAddHelp && (
            <div style={{ fontSize:10, lineHeight:1.4, opacity:.8, margin:'6px 0 8px', background: theme.name==='Dark'? '#1f2428':'#fff', border:'1px solid '+(theme.name==='Dark'? '#555':'#aaa'), borderRadius:6, padding:'6px 8px', position:'relative' }}>
              <div style={{ fontWeight:700, marginBottom:4, fontSize:10, letterSpacing:.5 }}>HOW IT WORKS</div>
              <ul style={{ margin:0, padding:'0 0 0 14px', display:'flex', flexDirection:'column', gap:4 }}>
                <li>Floor: Logical level (e.g. 1, 2, Mezz).</li>
                <li>Section / Room: Room or cabin identifier (e.g. 22, A, BUNK-WEST).</li>
                <li># New Beds: How many beds to create in sequence.</li>
                <li>Pattern:
                  <ul style={{ margin:'4px 0 0 14px', padding:0, listStyle:'disc' }}>
                    <li>A1 A2 → Section + number (22 → 221, 222)</li>
                    <li>A-1 A-2 → Section-number (22 → 22-1, 22-2)</li>
                    <li>A-A A-B → Section-letter (22 → 22-A, 22-B)</li>
                  </ul>
                </li>
                <li>Edit any bed ID after creation for custom labels.</li>
              </ul>
              <div style={{ marginTop:6, fontSize:9, opacity:.65 }}>Tip: Create one room at a time for clean grouping.</div>
            </div>
          )}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'flex-end' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
              <div style={miniLabel}>Floor</div>
              <input value={newFloor} onChange={e=>setNewFloor(e.target.value)} placeholder="1" style={inp(theme,{width:56, textAlign:'center', fontWeight:600})} />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
              <div style={miniLabel}>Section / Room</div>
              <input value={newSection} onChange={e=>setNewSection(e.target.value)} placeholder="A" style={inp(theme,{width:72, textAlign:'center', fontWeight:600})} />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
              <div style={miniLabel}># New Beds</div>
              <input type='number' min={1} value={newCount} onChange={e=>setNewCount(parseInt(e.target.value)||1)} style={inp(theme,{width:80, textAlign:'center'})} title="How many beds to generate" />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
              <div style={miniLabel}>Pattern</div>
              <select value={newPattern} onChange={e=>setNewPattern(e.target.value)} style={inp(theme,{width:120, padding:'4px 4px'})}>
                <option value='num'>A1 A2</option>
                <option value='hyphen-num'>A-1 A-2</option>
                <option value='hyphen-alpha'>A-A A-B</option>
              </select>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
              <div style={{ visibility:'hidden', fontSize:10 }}>Add</div>
              <button onClick={addBlock} style={smallBtn(theme)}>Add</button>
            </div>
          </div>
        </div>
        <div style={box(theme)}>
          <div style={label}>Filter</div>
          <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search" style={inp(theme,{minWidth:160})} />
        </div>
        <div style={box(theme)}>
          <div style={label}>Totals</div>
          <div style={{ fontSize:12 }}>
            <strong>{bunks.length}</strong> beds • Capacity <strong>{bunks.length}</strong>
          </div>
        </div>
        {bunks.length>0 && <div style={box(theme)}>
          <div style={label}>Danger</div>
          <button onClick={clearAll} style={{ ...smallBtn(theme), background:'#922' }}>Clear All</button>
        </div>}
      </div>
      {floors.length===0 && <div style={{ fontSize:12, opacity:.6 }}>No beds defined yet. Add a block above.</div>}
      <div style={{ display:'flex', flexDirection:'column', gap:28 }}>
        {floors.map(floor=> (
          <div key={floor}>
            <div style={{ fontSize:14, fontWeight:800, margin:'2px 0 10px', letterSpacing:.5 }}>Floor {floor}</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:22 }}>
              {Object.keys(byFloor[floor]).sort().map(sec=> (
                <div key={sec} style={{ minWidth:220, flex:'1 1 220px' }}>
                  <div style={{ fontSize:13, fontWeight:700, margin:'4px 0 6px' }}>Room {sec}</div>
                  <div style={{ display:'grid', gap:8 }}>
                    {byFloor[floor][sec].map(b=>{
                      const occupied = assignments[b.id];
                      return (
                        <div key={b.id} style={{ background: theme.name==='Dark'? '#2f353a':'#f2f7fa', border:'1px solid '+(theme.name==='Dark'? '#555':'#bbb'), borderRadius:8, padding:'6px 8px', display:'flex', flexDirection:'column', gap:6 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <input value={b.id} onChange={e=> updateBunk(b.id,'id', e.target.value.trim().toUpperCase())} style={inp(theme,{width:70, fontWeight:600})} />
                            <input value={b.floor||'1'} onChange={e=> updateBunk(b.id,'floor', e.target.value.trim())} style={inp(theme,{width:46})} />
                            <input value={b.section} onChange={e=> updateBunk(b.id,'section', e.target.value.trim().toUpperCase())} style={inp(theme,{width:56})} />
                            <button onClick={()=> deleteBunk(b.id)} style={delBtn(theme)}>✕</button>
                          </div>
                          <div style={{ fontSize:10, opacity:.65 }}>
                            {occupied? 'Occupied' : 'Empty'} • Cap 1
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop:16, fontSize:11, opacity:.65 }}>
        Roadmap ideas: drag & drop assignment, per-bed notes, export layout JSON, occupancy validation vs onboard roster, heatmap, historical snapshots.
      </div>
    </section>
  );
}

// small UI helpers
const box = (theme) => ({ background: theme.name==='Dark'? '#2d3237':'#eef3f7', border:'1px solid '+(theme.name==='Dark'? '#555':'#bbb'), borderRadius:10, padding:'8px 10px', display:'flex', flexDirection:'column', gap:6, minWidth:140 });
const label = { fontSize:10, fontWeight:700, letterSpacing:'.5px', opacity:.7, textTransform:'uppercase' };
const miniLabel = { fontSize:10, fontWeight:600, letterSpacing:'.5px', opacity:.65 };
const inp = (theme, extra={}) => ({ background: theme.name==='Dark'? '#1f2428':'#fff', color: theme.text, border:'1px solid '+(theme.name==='Dark'? '#555':'#888'), borderRadius:6, padding:'4px 6px', fontSize:11, ...extra });
const smallBtn = (theme) => ({ background: theme.primary, color: theme.text, border:'1px solid '+(theme.secondary||'#222'), padding:'6px 10px', borderRadius:8, cursor:'pointer', fontSize:11, fontWeight:600 });
const delBtn = (theme) => ({ background:'#922', color:'#fff', border:'1px solid #b55', padding:'4px 6px', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:600 });
