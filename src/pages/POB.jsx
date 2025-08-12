import React, { useMemo, useState, useEffect, useRef } from 'react';
import { emitDomain } from '../ai/eventBus.js';
import { useTheme } from '../ThemeContext.jsx';
import CompanyTable from '../components/CompanyTable';
import { getAllDates } from '../services/dateService';
import { formatDate } from '../helpers/dateHelpers';

// POB (Persons On Board) Landing Page
// Shows: Current Onboard Roster (derived from personnel records) & Bunk Assignments (editable placeholder)
// Data sources:
//  - personnelRecords (localStorage) with arrivalDate / departureDate
//  - bunkAssignments (localStorage) mapping bunkId -> { personId, note }

export default function POBPage(){
  const { theme } = useTheme();
  // ---- POB Table Editor state (dates, data, comments) ----
  const today = new Date();
  const allDates = getAllDates(today.getFullYear());
  const todayKey = (today.getMonth()+1) + '/' + today.getDate() + '/' + today.getFullYear();
  const defaultStart = new Date(today); // start at today
  const defaultEnd = new Date(today); defaultEnd.setDate(defaultEnd.getDate() + 28); // end at today+28
  const [viewStart, setViewStart] = useState(defaultStart.toISOString().split('T')[0]);
  const [viewEnd, setViewEnd] = useState(defaultEnd.toISOString().split('T')[0]);
  const visibleDates = useMemo(()=> allDates.filter(d => {
    const dt = new Date(d.date);
    return dt >= new Date(viewStart) && dt <= new Date(viewEnd);
  }), [allDates, viewStart, viewEnd]);
  const todayColumnRef = useRef(null);
  const [rowData, setRowData] = useState(()=>{ try { return JSON.parse(localStorage.getItem('pobPlannerData'))||[]; } catch { return []; } });
  const [comments, setComments] = useState(()=>{ try { return JSON.parse(localStorage.getItem('pobPlannerComments'))||{}; } catch { return {}; } });
  const [editingCompanies, setEditingCompanies] = useState(false);
  // Allow gear menu to open Edit Companies on POB page
  useEffect(()=>{
    const open = () => setEditingCompanies(true);
    window.addEventListener('openPlannerEditCompanies', open);
    return () => window.removeEventListener('openPlannerEditCompanies', open);
  },[]);
  const handleResetRange = () => {
    setViewStart(defaultStart.toISOString().split('T')[0]);
    setViewEnd(defaultEnd.toISOString().split('T')[0]);
  };
  const todayIso = new Date().toISOString().slice(0,10);
  const personnel = useMemo(()=> { try { return JSON.parse(localStorage.getItem('personnelRecords'))||[]; } catch { return []; } }, []);
  // Determine onboard: arrivalDate <= today && (no departureDate or departureDate >= today)
  const onboard = personnel.filter(p=> {
    if(!p.arrivalDate) return false;
    if(p.arrivalDate > todayIso) return false;
    if(p.departureDate && p.departureDate < todayIso) return false;
    return true;
  });
  // Bunk assignment storage
  let initialBunks = [];
  try { initialBunks = JSON.parse(localStorage.getItem('pobBunkConfig'))||[]; } catch { initialBunks=[]; }
  // default example bunks if none
  if(!initialBunks.length){
    initialBunks = [
      { id:'A1', floor:'1', section:'A', capacity:1 },
      { id:'A2', floor:'1', section:'A', capacity:1 },
      { id:'A3', floor:'1', section:'A', capacity:1 },
      { id:'B1', floor:'1', section:'B', capacity:1 },
      { id:'B2', floor:'1', section:'B', capacity:1 }
    ];
    try { localStorage.setItem('pobBunkConfig', JSON.stringify(initialBunks)); } catch {}
  }
  // Migration: ensure floor & capacity=1
  let migrated = false;
  initialBunks = initialBunks.map(b=>{ let changed=false; const next={ ...b }; if(!('floor' in next)) { next.floor='1'; changed=true; } if(next.capacity!==1){ next.capacity=1; changed=true; } if(changed) migrated=true; return next; });
  if(migrated){ try { localStorage.setItem('pobBunkConfig', JSON.stringify(initialBunks)); } catch {} }
  let assignmentsStore = {};
  try { assignmentsStore = JSON.parse(localStorage.getItem('pobBunkAssignments'))||{}; } catch { assignmentsStore={}; }
  // Migration: convert legacy { personId } to { personIds: [] }
  Object.keys(assignmentsStore).forEach(k=>{
    const v = assignmentsStore[k];
    if(v && v.personId && !v.personIds){ assignmentsStore[k] = { personIds:[v.personId], note: v.note||'' }; }
    if(v && Array.isArray(v.personIds)===false && !v.personId){ assignmentsStore[k] = { personIds:[], note:'' }; }
  });
  // local state to trigger re-render on assignment changes
  const [assignmentsVersion, setAssignmentsVersion] = useState(0);
  const saveAssignments = (next, meta={}) => { try { localStorage.setItem('pobBunkAssignments', JSON.stringify(next)); } catch{} assignmentsStore = next; setAssignmentsVersion(v=>v+1); if(meta && meta.event){ emitDomain(meta.event, meta.payload||{}, meta.brief); } };
  const bunkMap = new Map(initialBunks.map(b=> [b.id, b]));
  const bunkToPersons = {}; Object.entries(assignmentsStore).forEach(([bid,val])=> { if(val && Array.isArray(val.personIds)) bunkToPersons[bid]=val.personIds; });
  const assignedRoster = onboard.reduce((acc,p)=>{
    const bunkId = Object.entries(bunkToPersons).find(([,ids])=> ids.includes(p.id))?.[0] || null;
    acc.push({ ...p, bunkId });
    return acc;
  }, []);
  const unassigned = assignedRoster.filter(p=> !p.bunkId);
  // Group beds by floor then section
  const byFloor = {};
  initialBunks.forEach(b=> { const f=b.floor||'1'; byFloor[f]=byFloor[f]||{}; byFloor[f][b.section]=byFloor[f][b.section]||[]; byFloor[f][b.section].push(b); });
  Object.values(byFloor).forEach(secMap=> Object.values(secMap).forEach(list=> list.sort((a,b)=> a.id.localeCompare(b.id))));
  const floors = Object.keys(byFloor).sort((a,b)=> a.localeCompare(b, undefined, { numeric:true }));

  // Assignment modal state
  const [activeBunk, setActiveBunk] = useState(null); // bunk id
  const [search, setSearch] = useState('');
  const occupants = (bid) => (assignmentsStore[bid]?.personIds)||[];
  const capacityFor = (bid) => (bunkMap.get(bid)?.capacity)||1;
  const openAssign = (bid) => setActiveBunk(bid);
  const closeAssign = () => { setActiveBunk(null); setSearch(''); };
  const unassignedPeople = assignedRoster.filter(p=> !p.bunkId);
  const filteredUnassigned = unassignedPeople.filter(p=>{
    if(!search) return true; const s=search.toLowerCase(); return (p.firstName+' '+p.lastName+' '+(p.company||'')).toLowerCase().includes(s);
  });
  const addPersonToBunk = (pid) => {
    if(!activeBunk) return; const cap = capacityFor(activeBunk); const cur = occupants(activeBunk);
    const nextIds = cur.includes(pid)? cur : [...cur, pid];
    const store = { ...assignmentsStore, [activeBunk]: { ...(assignmentsStore[activeBunk]||{}), personIds: nextIds } };
    saveAssignments(store, { event:'BUNK_ASSIGNED', payload:{ bunk: activeBunk, person: pid }, brief:`Assigned ${pid} -> ${activeBunk}` });
  };
  const removePersonFromBunk = (pid) => {
    if(!activeBunk) return; const cur = occupants(activeBunk).filter(id=> id!==pid);
    const entry = { ...(assignmentsStore[activeBunk]||{}), personIds: cur };
    const store = { ...assignmentsStore, [activeBunk]: entry };
    saveAssignments(store, { event:'BUNK_UNASSIGNED', payload:{ bunk: activeBunk, person: pid }, brief:`Removed ${pid} from ${activeBunk}` });
  };
  const clearBunk = () => {
    if(!activeBunk) return; if(!window.confirm('Unassign everyone from '+activeBunk+'?')) return;
    const store = { ...assignmentsStore }; delete store[activeBunk]; saveAssignments(store, { event:'BUNK_UNASSIGNED', payload:{ bunk: activeBunk, cleared:true }, brief:`Cleared bunk ${activeBunk}` });
  };
  const occupancyStatus = (bid) => {
    const occ = occupants(bid).length; const cap = capacityFor(bid);
    if(occ===0) return { color: theme.name==='Dark'? '#555':'#bbb', label:'Empty'};
    if(occ<cap) return { color:'#2d7d46', label: occ+'/'+cap };
    if(occ===cap) return { color:'#b58a1d', label: occ+'/'+cap };
    return { color:'#c33', label: occ+'/'+cap }; // over
  };
  // Drag & Drop state
  const [draggingPid, setDraggingPid] = useState(null);
  const [dragOverBunk, setDragOverBunk] = useState(null);
  const handleDragStart = (e, pid, fromBunk) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ pid, fromBunk: fromBunk||'' }));
    setDraggingPid(pid);
  };
  const handleDragEnd = () => { setDraggingPid(null); setDragOverBunk(null); };
  const assignPersonToBunk = (pid, targetBunk) => {
    if(!pid || !targetBunk) return;
    const currentBunk = Object.entries(bunkToPersons).find(([,ids])=> ids.includes(pid))?.[0];
    if(currentBunk === targetBunk) return; // no change
    const cap = capacityFor(targetBunk);
    const curOcc = occupants(targetBunk);
    if(curOcc.length >= cap) { return; }
    // remove from old bunk
    let nextStore = { ...assignmentsStore };
    if(currentBunk){
      const filtered = (nextStore[currentBunk]?.personIds||[]).filter(id=> id!==pid);
      if(filtered.length) nextStore[currentBunk] = { ...nextStore[currentBunk], personIds: filtered };
      else delete nextStore[currentBunk];
    }
    // add to new
    const newIds = curOcc.includes(pid)? curOcc : [...curOcc, pid];
    nextStore[targetBunk] = { ...(nextStore[targetBunk]||{}), personIds: newIds };
  saveAssignments(nextStore, { event:'BUNK_ASSIGNED', payload:{ bunk: targetBunk, person: pid, movedFrom: currentBunk||null }, brief:`Moved ${pid} to ${targetBunk}` });
  };
  const unassignPerson = (pid) => {
    if(!pid) return;
    const currentBunk = Object.entries(bunkToPersons).find(([,ids])=> ids.includes(pid))?.[0];
    if(!currentBunk) return;
    let nextStore = { ...assignmentsStore };
    const filtered = (nextStore[currentBunk]?.personIds||[]).filter(id=> id!==pid);
    if(filtered.length) nextStore[currentBunk] = { ...nextStore[currentBunk], personIds: filtered };
    else delete nextStore[currentBunk];
    saveAssignments(nextStore, { event:'BUNK_UNASSIGNED', payload:{ bunk: currentBunk, person: pid }, brief:`Unassigned ${pid} from ${currentBunk}` });
  };
  // Expose context
  useEffect(()=>{
    window.__buckPobCtx = () => ({ onboard: onboard.length, bunks: initialBunks.length, assignments: Object.keys(assignmentsStore).length });
    return ()=> { delete window.__buckPobCtx; };
  }, [onboard.length, initialBunks.length, assignmentsVersion]);

  return (
    <div key={theme.name} style={{ padding:'24px 26px 80px', background: theme.background, color: theme.text, minHeight:'100vh' }}>
      <h2 style={{ margin:'0 0 14px' }}>POB Overview</h2>
      <div style={{ fontSize:13, opacity:.75, marginBottom:24 }}>Current onboard personnel & bunk assignment snapshot. Future iterations will allow drag/drop reassign, history, and occupancy reports.</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:32 }}>
        <section style={card(theme)}>
          <div style={sectionHeader(theme)}>Onboard Roster ({onboard.length})</div>
          <div style={{ maxHeight:360, overflowY:'auto', border:'1px solid '+(theme.name==='Dark'? '#555':'#ccc'), borderRadius:8 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background: theme.primary, color: theme.text }}>
                  <th style={th}>Name</th>
                  <th style={th}>Company</th>
                  <th style={th}>Arrived</th>
                  <th style={th}>Departs</th>
                  <th style={th}>Bunk</th>
                </tr>
              </thead>
              <tbody>
                {onboard.length===0 && <tr><td colSpan={5} style={tdEmpty}>None Onboard</td></tr>}
                {assignedRoster.map(p=> {
                  const dragging = draggingPid===p.id;
                  const assigned = !!p.bunkId;
                  const green = '#2d7d46';
                  return (
                    <tr
                      key={p.id}
                      draggable
                      onDragStart={e=> handleDragStart(e, p.id, p.bunkId || null)}
                      onDragEnd={handleDragEnd}
                      style={{ background: assigned? (theme.name==='Dark'? '#2f353a':'#eef3f7'):'transparent', opacity: dragging? .45:1, cursor:'grab', borderLeft: assigned? '4px solid '+green : '4px solid transparent' }}
                      title={assigned? 'Assigned to '+p.bunkId+' (drag to move or unassign)' : 'Drag to a bed or Unassign box'}
                    >
                      <td style={{ ...td, color: assigned? green: td.color, fontWeight: assigned? 700: td.fontWeight }}>{p.firstName} {p.lastName}</td>
                      <td style={td}>{p.company||''}</td>
                      <td style={td}>{p.arrivalDate||''}</td>
                      <td style={td}>{p.departureDate||''}</td>
                      <td style={td}>{p.bunkId || <span style={{ opacity:.5 }}>—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {unassigned.length>0 && <div style={{ marginTop:8, fontSize:11, opacity:.7 }}>{unassigned.length} personnel unassigned to bunks.</div>}
        </section>
        <section style={card(theme)} key={assignmentsVersion}>
          <div style={sectionHeader(theme)}>Bed Assignments</div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:10 }}>
            <div
              onDragOver={e=> { e.preventDefault(); }}
              onDrop={e=> { e.preventDefault(); try { const data=JSON.parse(e.dataTransfer.getData('text/plain')); unassignPerson(data.pid); } catch{} handleDragEnd(); }}
              style={{ flex:'1 1 160px', minWidth:160, background: theme.name==='Dark'? '#2d3237':'#f4f7fa', border:'2px dashed '+(draggingPid? (theme.primary||'#267') : (theme.name==='Dark'? '#555':'#bbb')), borderRadius:10, padding:'8px 10px', fontSize:11, fontWeight:600, textAlign:'center', opacity: draggingPid? 1:.75 }}
            >Drop Here to Unassign</div>
            <div style={{ fontSize:10, opacity:.6, alignSelf:'center' }}>Drag a name to a bed (or to this box to unassign).</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:26 }}>
            {floors.map(floor=> (
              <div key={floor}>
                <div style={{ fontSize:13, fontWeight:800, margin:'0 0 8px' }}>Floor {floor}</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:18 }}>
                  {Object.keys(byFloor[floor]).sort().map(sec=> (
                    <div key={sec} style={{ minWidth:180 }}>
                      <div style={{ fontSize:12, fontWeight:700, marginBottom:4 }}>Room {sec}</div>
                      <div style={{ display:'grid', gap:6 }}>
                        {byFloor[floor][sec].map(b=>{
                          const occIds = occupants(b.id);
                          const occPersons = occIds.map(id=> onboard.find(p=> p.id===id)).filter(Boolean);
                          const status = occupancyStatus(b.id);
                          const isDragOver = dragOverBunk===b.id;
                          return (
                            <div key={b.id} onClick={()=> openAssign(b.id)}
                              onDragOver={e=> { e.preventDefault(); setDragOverBunk(b.id); }}
                              onDragLeave={e=> { if(dragOverBunk===b.id) setDragOverBunk(null); }}
                              onDrop={e=> { e.preventDefault(); try { const data=JSON.parse(e.dataTransfer.getData('text/plain')); assignPersonToBunk(data.pid, b.id); } catch{} handleDragEnd(); }}
                              style={{ background: theme.name==='Dark'? (isDragOver? '#45505a':'#3a4046') : (isDragOver? '#e5f2fa':'#f6f9fb'), border:'2px solid '+(isDragOver? (theme.primary||status.color): status.color), borderRadius:10, padding:'6px 8px', cursor:'pointer', boxShadow:'0 2px 4px rgba(0,0,0,0.25)', transition:'transform .15s, box-shadow .2s' }}
                              title="Click or drop to edit occupants"
                            >
                              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                                <span style={{ fontSize:11, fontWeight:700 }}>{b.id}</span>
                                <span style={{ fontSize:10, fontWeight:600, color: status.color }}>{status.label}</span>
                              </div>
                              {occPersons.length ? (
                                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                                  {occPersons.slice(0,3).map(p=> (
                                    <div
                                      key={p.id}
                                      draggable
                                      onDragStart={e=> handleDragStart(e, p.id, b.id)}
                                      onDragEnd={handleDragEnd}
                                      style={{ fontSize:10, fontWeight:600, lineHeight:1.1, padding:'3px 5px 4px', borderRadius:4, background: draggingPid===p.id? (theme.primary||'#267'):'rgba(0,0,0,0.15)', display:'flex', flexDirection:'column', gap:2 }}
                                      title={p.firstName+' '+p.lastName + (p.company? ' | '+p.company:'') + (p.position? ' | '+p.position:'')}
                                    >
                                      <span style={{ fontSize:10 }}>{p.firstName} {p.lastName}</span>
                                      {(p.company || p.position) && (
                                        <span style={{ fontSize:8, fontWeight:500, opacity:.75 }}>
                                          {(p.company||'')}{p.company && p.position ? ' / ' : ''}{p.position||''}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                  {occPersons.length>3 && <div style={{ fontSize:10, opacity:.6 }}>+{occPersons.length-3} more</div>}
                                </div>
                              ) : <div style={{ fontSize:10, opacity:.5 }}>Empty</div>}
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
          <div style={{ marginTop:10, fontSize:11, opacity:.65 }}>Drag names between beds or to the Unassign box. Click a bed for detailed modal view.</div>
        </section>
      </div>
      {/* ---- POB Table Editor ---- */}
      <div style={{ marginTop: 28 }}>
        <h2 style={{ margin:'0 0 10px' }}>POB Table Editor</h2>
        <div style={{ display:'flex', gap:12, alignItems:'center', margin:'0 0 12px', flexWrap:'wrap' }}>
          <label style={{ fontSize:12 }}>Start</label>
          <input type="date" value={viewStart} onChange={e=> setViewStart(e.target.value)} />
          <label style={{ fontSize:12 }}>End</label>
          <input type="date" value={viewEnd} onChange={e=> setViewEnd(e.target.value)} />
          <button onClick={handleResetRange} style={{ padding:'4px 10px', background: theme.primary, color: theme.text, border:'1px solid '+(theme.secondary||'#333'), borderRadius:6, fontSize:12, fontWeight:700 }}>Reset</button>
        </div>
        <CompanyTable
          rowData={rowData}
          setRowData={setRowData}
          dates={visibleDates}
          comments={comments}
          setComments={setComments}
          todayColumnRef={todayColumnRef}
          todayKey={todayKey}
          viewStart={viewStart}
          viewEnd={viewEnd}
          editing={editingCompanies}
          setEditing={setEditingCompanies}
        />
      </div>
      {activeBunk && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'60px 20px', zIndex:900 }} onClick={e=> { if(e.target===e.currentTarget) closeAssign(); }}>
          <div style={{ background: theme.surface, color: theme.text, width:'min(720px,100%)', border:'1px solid '+(theme.name==='Dark'? '#555':'#444'), borderRadius:16, padding:'20px 22px 26px', boxShadow:'0 8px 26px rgba(0,0,0,0.45)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <h3 style={{ margin:0, fontSize:18 }}>Bunk {activeBunk} Assignment</h3>
              <button onClick={closeAssign} style={closeBtn(theme)}>Close</button>
            </div>
            <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
              <div style={{ flex:'1 1 300px', minWidth:260 }}>
                <div style={{ fontSize:12, fontWeight:700, marginBottom:4 }}>Current Occupants ({occupants(activeBunk).length}/{capacityFor(activeBunk)})</div>
                <div style={{ border:'1px solid '+(theme.name==='Dark'? '#555':'#bbb'), borderRadius:8, padding:8, minHeight:80, display:'flex', flexDirection:'column', gap:6 }}>
                  {occupants(activeBunk).map(pid => {
                    const pers = onboard.find(p=> p.id===pid);
                    if(!pers) return null;
                    return (
                      <div key={pid} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background: theme.name==='Dark'? '#2f353a':'#eef3f7', padding:'4px 6px', borderRadius:6, fontSize:11 }}>
                        <span draggable onDragStart={e=> handleDragStart(e, pid, activeBunk)} onDragEnd={handleDragEnd} style={{ display:'flex', flexDirection:'column', lineHeight:1 }}>
                          <span>{pers.firstName} {pers.lastName}</span>
                          {(pers.company || pers.position) && <span style={{ fontSize:9, opacity:.6 }}>{(pers.company||'')}{pers.company && pers.position ? ' / ' : ''}{pers.position||''}</span>}
                        </span>
                        <button onClick={()=> removePersonFromBunk(pid)} style={miniBtn(theme,'#922')}>Remove</button>
                      </div>
                    );
                  })}
                  {occupants(activeBunk).length===0 && <div style={{ fontSize:11, opacity:.55 }}>None</div>}
                </div>
                <div style={{ display:'flex', gap:8, marginTop:10 }}>
                  <button disabled={occupants(activeBunk).length===0} onClick={clearBunk} style={miniBtn(theme,'#b3471b')}>Clear</button>
                </div>
              </div>
              <div style={{ flex:'2 1 340px', minWidth:300 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <div style={{ fontSize:12, fontWeight:700 }}>Unassigned Personnel ({unassignedPeople.length})</div>
                  <input value={search} onChange={e=> setSearch(e.target.value)} placeholder='Search' style={{ fontSize:11, padding:'4px 6px', border:'1px solid '+(theme.name==='Dark'? '#555':'#888'), background: theme.name==='Dark'? '#1f2428':'#fff', color: theme.text, borderRadius:6 }} />
                </div>
                <div style={{ maxHeight:300, overflowY:'auto', border:'1px solid '+(theme.name==='Dark'? '#555':'#bbb'), borderRadius:8, padding:6, display:'grid', gap:6 }}>
                  {filteredUnassigned.length===0 && <div style={{ fontSize:11, opacity:.6 }}>No matches</div>}
                  {filteredUnassigned.map(p=>{
                    const disabled = occupants(activeBunk).length >= capacityFor(activeBunk);
                    return (
                      <div key={p.id} draggable onDragStart={e=> handleDragStart(e, p.id, null)} onDragEnd={handleDragEnd} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background: theme.name==='Dark'? '#2d3237':'#f4f7fa', padding:'4px 6px', borderRadius:6, fontSize:11, opacity: disabled? .45:1 }}>
                        <span style={{ display:'flex', flexDirection:'column', lineHeight:1 }}>
                          <span>{p.firstName} {p.lastName}</span>
                          {(p.company || p.position) && <span style={{ fontSize:9, opacity:.55 }}>{(p.company||'')}{p.company && p.position ? ' / ' : ''}{p.position||''}</span>}
                        </span>
                        <button disabled={disabled} onClick={()=> addPersonToBunk(p.id)} style={miniBtn(theme, disabled? '#666': theme.primary)}>{disabled? 'Full':'Add'}</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const card = (theme) => ({ background: theme.surface, border:'1px solid '+(theme.name==='Dark'? '#555':'#bbb'), borderRadius:14, padding:'18px 20px 22px', boxShadow:'0 4px 12px rgba(0,0,0,0.25)', flex:'1 1 420px', minWidth:340 });
const sectionHeader = (theme) => ({ fontSize:16, fontWeight:800, marginBottom:12, paddingBottom:6, borderBottom:'2px solid '+(theme.primary||'#267') });
const th = { padding:'6px 8px', textAlign:'left', fontSize:11, borderBottom:'1px solid #444', position:'sticky', top:0 };
const td = { padding:'4px 6px', borderBottom:'1px solid #333' };
const tdEmpty = { padding:'10px 8px', textAlign:'center', fontStyle:'italic', opacity:.6 };
const closeBtn = (theme) => ({ background: theme.primary, color: theme.text, border:'1px solid '+(theme.secondary||'#222'), padding:'6px 10px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600 });
const miniBtn = (theme,bg) => ({ background:bg, color:'#fff', border:'1px solid '+(bg==='#922'? '#b55': bg==='#b3471b'? '#c86a34': (theme.secondary||'#222')), padding:'4px 8px', borderRadius:6, cursor:'pointer', fontSize:10, fontWeight:700 });
