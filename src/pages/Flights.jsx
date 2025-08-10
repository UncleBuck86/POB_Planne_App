import React, { useState, useMemo } from 'react';
import { useTheme } from '../ThemeContext.jsx';
import { generateFlightComments } from '../utils/generateFlightComment.js';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

// Format date into planner key (M/D/YYYY)
const keyForDate = (d) => (d.getMonth()+1) + '/' + d.getDate() + '/' + d.getFullYear();

export default function FlightsPage() {
  const { theme } = useTheme();
  const rowData = useMemo(() => { try { return JSON.parse(localStorage.getItem('pobPlannerData')) || []; } catch { return []; } }, []);
  const today = new Date();
  const [displayMonth, setDisplayMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDates, setSelectedDates] = useState([]);
  // Removed manifestOpen popup; movement widget + direct manifest link replaces it
  const [catalogOpen, setCatalogOpen] = useState(false);
  const catalog = useMemo(()=>{ try { return JSON.parse(localStorage.getItem('flightManifestCatalogV1'))||[]; } catch { return []; } }, []);
  const openCatalogManifest = (entry) => {
    try {
      // seed manifestGenerateDates with just the entry date so existing logic pre-fills route if desired
      const d = new Date(entry.meta.date || entry.date);
      const key = keyForDate(d);
      localStorage.setItem('manifestGenerateDates', JSON.stringify([key]));
      // store entry directly for immediate load
      localStorage.setItem('flightManifestTemplateV1', JSON.stringify({ meta: entry.meta, outbound: entry.outbound, inbound: entry.inbound }));
    } catch {}
    window.location.hash = '#manifest';
  };
  const openManifestTemplate = () => {
    try {
      const keys = selectedDates.map(d=> keyForDate(d));
      localStorage.setItem('manifestGenerateDates', JSON.stringify(keys));
    } catch {}
    window.location.hash = '#manifest';
  };

  const allDatesForMonth = useMemo(() => {
    const y = displayMonth.getFullYear();
    const m = displayMonth.getMonth();
    const first = new Date(y, m, 1);
    const arr = []; let d = new Date(first);
    while (d.getMonth() === m) { arr.push(new Date(d)); d.setDate(d.getDate()+1); }
    return arr;
  }, [displayMonth]);
  const { flightsOut, flightsIn } = useMemo(() => {
    if (!allDatesForMonth.length) return { flightsOut:{}, flightsIn:{} };
    const base = new Date(allDatesForMonth[0]); base.setDate(base.getDate()-1);
    const dateObjs = [base, ...allDatesForMonth].map(d => ({ date: keyForDate(d) }));
    return generateFlightComments(rowData, dateObjs);
  }, [allDatesForMonth, rowData]);
  const movementCounts = useMemo(()=> {
    const map = {};
    allDatesForMonth.forEach(d => { const k = keyForDate(d); map[k] = (flightsOut[k]?.length||0) + (flightsIn[k]?.length||0); });
    return map;
  }, [allDatesForMonth, flightsOut, flightsIn]);
  const sortedSelectedKeys = selectedDates.map(d => keyForDate(d)).sort((a,b)=> new Date(a)-new Date(b));
  const clearSelection = () => { setSelectedDates([]); };
  // Personnel movement widget data (combines personnel database and planner delta logic)
  const personnelRecords = useMemo(()=> { try { return JSON.parse(localStorage.getItem('personnelRecords'))||[]; } catch { return []; } }, []);
  const plannerRows = rowData; // existing rowData from planner
  // Track selected personnel from movement widgets to send to manifest
  const [selectedPeople, setSelectedPeople] = useState({}); // key -> person payload
  // Current working manifest passengers (for green highlight if already present)
  const manifestPassengersSet = useMemo(()=>{
    const ignoreKeywords = ['cargo','package','packages','sample','samples','mail','tool','tools','parts','supply','supplies'];
    try {
      const raw = JSON.parse(localStorage.getItem('flightManifestTemplateV1'));
      if(!raw) return new Set();
      const collect = [];
      ['outbound','inbound'].forEach(dir=>{
        (raw[dir]||[]).forEach(p=>{
          if(!p) return;
          const full = (p.name||'').trim().toLowerCase();
          const company = (p.company||'').trim().toLowerCase();
            if(full && !ignoreKeywords.some(k=> full.includes(k))) collect.push(full+'|'+company);
        });
      });
      return new Set(collect);
    } catch { return new Set(); }
  }, []);
  const personInManifest = (person) => {
    const full = ((person.firstName||'').trim()+' '+(person.lastName||'').trim()).trim().toLowerCase();
    const company = (person.company||'').trim().toLowerCase();
    return full && manifestPassengersSet.has(full+'|'+company);
  };
  const toggleSelectPerson = (person, source, dateKey) => {
    // source: 'arrivals'|'departures'|'onBoard'
    // Domain meaning: Inbound = headed to land (departing facility); Outbound = headed to facility.
    // Arrivals (arrivalDate today) are coming OUT to facility -> outbound.
    // Departures (departureDate today) are leaving facility inbound to land -> inbound.
    // OnBoard default assumption: if selecting for an inbound flight (bringing people to land) -> inbound.
    const dir = source==='arrivals' ? 'outbound' : (source==='departures' ? 'inbound' : 'inbound');
    const key = dateKey+':'+person.id+':'+dir;
    setSelectedPeople(prev => {
      const next = { ...prev };
      if(next[key]) delete next[key]; else {
        next[key] = {
          id: person.id,
          firstName: person.firstName||'',
          lastName: person.lastName||'',
          company: person.company||'',
          bodyWeight: person.bodyWeight||'',
          bagWeight: person.bagWeight||'',
          bagCount: person.bagCount||'',
          direction: dir,
          date: dateKey,
          source
        };
      }
      return next;
    });
  };
  const selectedCount = Object.keys(selectedPeople).length;
  const sendSelectedToManifest = () => {
    try {
      const ignoreKeywords = ['cargo','package','packages','sample','samples','mail','tool','tools','parts','supply','supplies'];
      const existingRaw = JSON.parse(localStorage.getItem('flightManifestTemplateV1')||'{}');
      const mkKey = (f,l,c) => ((f||'').trim().toLowerCase()+' '+(l||'').trim().toLowerCase()).trim()+'|'+(c||'').trim().toLowerCase();
      const existingOutbound = new Set((existingRaw.outbound||[]).map(p=>mkKey(...((p.name||'').split(' ')).slice(0,1), (p.name||'').split(' ').slice(1).join(' '), p.company))); // simplified but will be refined below
      const existingInbound = new Set((existingRaw.inbound||[]).map(p=>mkKey(...((p.name||'').split(' ')).slice(0,1), (p.name||'').split(' ').slice(1).join(' '), p.company)));
      const payload = Object.values(selectedPeople).filter(p=>{
        const key = mkKey(p.firstName, p.lastName, p.company);
        if(ignoreKeywords.some(w=> key.includes(w))) return false;
        if(p.direction==='outbound') return !existingOutbound.has(key);
        if(p.direction==='inbound') return !existingInbound.has(key);
        return true;
      });
      localStorage.setItem('manifestSelectedPersonnel', JSON.stringify(payload));
    } catch {/* ignore */}
    // Check catalog for existing manifest on target date (use last selected date or today fallback)
    try {
      const targetDateMdy = selectedDates.length ? keyForDate(selectedDates.sort((a,b)=>a-b)[selectedDates.length-1]) : null;
      let targetIso = null;
      if(targetDateMdy){
        const [m,d,y] = targetDateMdy.split('/');
        targetIso = y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');
      }
      if(targetIso){
        const existing = catalog.find(c=> c.meta && c.meta.date === targetIso);
        if(existing){
          const load = window.confirm('A saved manifest already exists for '+targetIso+' (Flight # '+(existing.meta.flightNumber||'N/A')+').\nLoad it before adding selected personnel?');
          if(load){
            try {
              localStorage.setItem('flightManifestTemplateV1', JSON.stringify({ meta: existing.meta, outbound: existing.outbound, inbound: existing.inbound }));
            } catch {/* ignore */}
          }
        }
      }
    } catch {/* ignore */}
    if(selectedDates.length) openManifestTemplate(); else window.location.hash = '#manifest';
  };
  const movementForSelected = useMemo(()=>{
    if(!selectedDates.length) return [];
    const parseEntries = (arr, dir) => arr.flatMap(e=>{ const dash=e.indexOf('-'); if(dash===-1) return []; const num=parseInt(e.slice(0,dash),10)||0; const company=e.slice(dash+1); return [{ company, count:num, dir }]; });
    return selectedDates.sort((a,b)=>a-b).map(dateObj=>{
      const key = keyForDate(dateObj);
      const plannerOutRaw = flightsOut[key]||[];
      const plannerInRaw = flightsIn[key]||[];
      const plannerMovements = [...parseEntries(plannerOutRaw,'OUT'), ...parseEntries(plannerInRaw,'IN')];
      const dateIso = dateObj.toISOString().slice(0,10);
      const arrivals = personnelRecords.filter(p=> p.arrivalDate===dateIso);
      const departures = personnelRecords.filter(p=> p.departureDate===dateIso);
      const onBoard = personnelRecords.filter(p=> {
        if(!p.arrivalDate) return false; const arr = new Date(p.arrivalDate+'T00:00:00'); const dep = p.departureDate? new Date(p.departureDate+'T00:00:00'): null; return arr <= dateObj && (!dep || dep >= dateObj);
      });
      return { date:key, plannerMovements, arrivals, departures, onBoard };
    });
  }, [selectedDates, flightsOut, flightsIn, personnelRecords]);

  return (
    <div style={{ color: theme.text, background: theme.background, minHeight:'100vh', padding:'24px' }}>
      <a href="#logistics" style={{ textDecoration:'none', color: theme.primary, fontSize:12, fontWeight:600 }}>← Back</a>
      <h2 style={{ margin:'8px 0 12px' }}>Flights</h2>
      <div style={{ display:'flex', gap:40, alignItems:'flex-start', flexWrap:'wrap' }}>
        <div style={{ background: theme.surface, padding:16, border:'1px solid '+(theme.name==='Dark' ? '#555':'#ccc'), borderRadius:12, boxShadow:'0 4px 10px rgba(0,0,0,0.25)' }}>
          <DayPicker
            mode="multiple"
            month={displayMonth}
            onMonthChange={setDisplayMonth}
            selected={selectedDates}
            onSelect={(days)=> { setSelectedDates(days||[]); }}
            showOutsideDays
            weekStartsOn={0}
            modifiers={{}}
            components={{
              DayContent: (props) => {
                const day = props.date;
                const k = keyForDate(day);
                const movement = movementCounts[k] || 0;
                return (
                  <div style={{ position:'relative', width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }} title={movement? `${movement} flight movement change(s)`: undefined}>
                    <span>{day.getDate()}</span>
                    {movement>0 && <span style={{ position:'absolute', bottom:2, right:2, fontSize:9, padding:'1px 3px', borderRadius:6, background: theme.secondary, color: theme.text }}>{movement}</span>}
                  </div>
                );
              }
            }}
            styles={{
              caption:{ color: theme.text },
              head_cell:{ background: theme.primary, color: theme.text, fontWeight:600, fontSize:12 },
              day:{ fontSize:'0.7rem', padding:'6px 0' },
              day_selected:{ background: theme.primary, color: theme.text },
              day_today:{ outline:'2px solid '+theme.secondary },
              nav_button_previous:{ background: theme.primary, color: theme.text },
              nav_button_next:{ background: theme.primary, color: theme.text }
            }}
          />
          <div style={{ marginTop:8, fontSize:11, opacity:.75 }}>Select one or more dates to view flight manifest.</div>
          {selectedDates.length>0 && <button onClick={openManifestTemplate} style={{ marginTop:8, ...navBtnStyle(theme), padding:'6px 10px' }}>Open Manifest Template</button>}
          <button onClick={()=> setCatalogOpen(o=>!o)} style={{ marginTop:8, ...navBtnStyle(theme), padding:'6px 10px' }}>{catalogOpen? 'Close Saved Catalog':'Saved Manifests'}</button>
          {selectedDates.length>0 && <button onClick={clearSelection} style={{ marginTop:8, ...navBtnStyle(theme), padding:'6px 10px' }}>Clear Selection</button>}
        </div>
      </div>
      {movementForSelected.length>0 && (
        <div style={{ marginTop:24, display:'flex', flexDirection:'column', gap:24 }}>
          {movementForSelected.map(mv => (
            <div key={mv.date} style={{ background: theme.surface, padding:16, border:'1px solid '+(theme.name==='Dark' ? '#555':'#ccc'), borderRadius:12, boxShadow:'0 4px 10px rgba(0,0,0,0.25)', width:'min(980px,100%)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <div style={{ fontSize:16, fontWeight:700 }}>Personnel Movement - {mv.date}</div>
                <div style={{ fontSize:11, opacity:.7 }}>Click names to select (Arrivals→Outbound, Departures→Inbound)</div>
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:24 }}>
                <div style={{ minWidth:220 }}>
                  <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Arrivals</div>
                  {mv.arrivals.length? (
                    <ul style={{ margin:0, padding:'0 0 0 16px', fontSize:12, listStyle:'disc' }}>
                      {mv.arrivals.map(p=> {
                        const key = mv.date+':'+p.id+':outbound';
                        const sel = !!selectedPeople[key];
                        const inMan = personInManifest(p);
                        return (
                          <li key={p.id} onClick={()=>toggleSelectPerson(p,'arrivals', mv.date)} style={{ cursor:'pointer', userSelect:'none', background: sel? (theme.primary): (inMan? '#1d7f3a':'transparent'), color: sel? theme.text: (inMan? '#fff': undefined), borderRadius:4, padding:'2px 4px', margin:'2px 0', boxShadow: inMan && !sel ? '0 0 0 1px #1d7f3a inset' : undefined }} title={inMan? 'Already on manifest':''}>
                            {p.firstName} {p.lastName} <span style={{ opacity:.6 }}>({p.company||'No Co'})</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : <div style={{ fontSize:11, opacity:.6 }}>None</div>}
                </div>
                <div style={{ minWidth:220 }}>
                  <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Departures</div>
                  {mv.departures.length? (
                    <ul style={{ margin:0, padding:'0 0 0 16px', fontSize:12 }}>
                      {mv.departures.map(p=> {
                        const key = mv.date+':'+p.id+':inbound';
                        const sel = !!selectedPeople[key];
                        const inMan = personInManifest(p);
                        return (
                          <li key={p.id} onClick={()=>toggleSelectPerson(p,'departures', mv.date)} style={{ cursor:'pointer', userSelect:'none', background: sel? (theme.primary): (inMan? '#1d7f3a':'transparent'), color: sel? theme.text: (inMan? '#fff': undefined), borderRadius:4, padding:'2px 4px', margin:'2px 0', boxShadow: inMan && !sel ? '0 0 0 1px #1d7f3a inset' : undefined }} title={inMan? 'Already on manifest':''}>
                            {p.firstName} {p.lastName} <span style={{ opacity:.6 }}>({p.company||'No Co'})</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : <div style={{ fontSize:11, opacity:.6 }}>None</div>}
                </div>
                <div style={{ minWidth:220 }}>
                  <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Planner Movements</div>
                  {mv.plannerMovements.length? <ul style={{ margin:0, padding:'0 0 0 16px', fontSize:12 }}>{mv.plannerMovements.map((m,i)=> <li key={i}>{m.dir==='OUT'? '+':''}{m.dir==='IN'? '-':''}{m.count} {m.company}</li>)}</ul> : <div style={{ fontSize:11, opacity:.6 }}>None</div>}
                </div>
                <div style={{ flex:1, minWidth:260 }}>
                  <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>On Board</div>
                  <div style={{ fontSize:12, marginBottom:6 }}>Total: {mv.onBoard.length}</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:4, maxHeight:180, overflowY:'auto', border:'1px solid '+(theme.name==='Dark'? '#444':'#bbb'), padding:6, borderRadius:6 }}>
                    {mv.onBoard.map(p=> {
                      const key = mv.date+':'+p.id+':inbound';
                      const sel = !!selectedPeople[key];
                      const inMan = personInManifest(p);
                      return (
                        <div key={p.id} onClick={()=>toggleSelectPerson(p,'onBoard', mv.date)} style={{ fontSize:11, background: sel? (theme.primary): (inMan? '#1d7f3a': (theme.name==='Dark'? '#2e3439':'#eef3f7')), padding:'4px 5px', borderRadius:6, cursor:'pointer', userSelect:'none', color: sel? theme.text: (inMan? '#fff': undefined), boxShadow: inMan && !sel ? '0 0 0 1px #1d7f3a inset' : undefined }} title={inMan? 'Already on manifest':''}>
                          {p.firstName} {p.lastName}<br/><span style={{ opacity:.6 }}>{p.company||''}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {selectedCount>0 && (
            <div style={{ background: theme.surface, padding:12, border:'1px solid '+(theme.name==='Dark'? '#555':'#ccc'), borderRadius:10, boxShadow:'0 2px 6px rgba(0,0,0,0.25)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
                <span style={{ fontSize:12 }}>Selected Personnel: <strong>{selectedCount}</strong></span>
                <button onClick={()=> setSelectedPeople({})} style={{ background: theme.name==='Dark'? '#444':'#d3dde5', color: theme.text, border:'1px solid '+(theme.name==='Dark'? '#666':'#999'), padding:'4px 8px', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:600 }}>Clear</button>
                <button onClick={sendSelectedToManifest} style={{ background: theme.primary, color: theme.text, border:'1px solid '+(theme.secondary||'#222'), padding:'6px 12px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600 }}>Send To Manifest</button>
                <span style={{ fontSize:11, opacity:.65 }}>Arrivals→Outbound, Departures→Inbound (On Board defaults Inbound). Green = already on manifest.</span>
              </div>
            </div>
          )}
        </div>
      )}
      {catalogOpen && (
        <div style={{ marginTop:24, background: theme.surface, padding:16, border:'1px solid '+(theme.name==='Dark' ? '#555':'#ccc'), borderRadius:12, boxShadow:'0 4px 10px rgba(0,0,0,0.25)', width:'min(740px,100%)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div style={{ fontSize:16, fontWeight:700 }}>Saved Manifests ({catalog.length})</div>
            <button onClick={()=> setCatalogOpen(false)} style={navBtnStyle(theme)}>Close</button>
          </div>
          {catalog.length===0 && <div style={{ fontSize:12, opacity:.6 }}>No saved manifests yet (save from Manifest page).</div>}
          <div style={{ display:'grid', gap:10 }}>
            {catalog.map(e=> (
              <div key={e.id} style={{ display:'flex', gap:12, alignItems:'center', background: theme.name==='Dark'? '#2a3035':'#f1f6fa', padding:'8px 10px', borderRadius:10, border:'1px solid '+(theme.name==='Dark'? '#444':'#b8c2cc') }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{e.meta.flightNumber || 'No Flight #'}</div>
                  <div style={{ fontSize:11, opacity:.7 }}>{e.meta.date} • OB {e.outbound.length} / IB {e.inbound.length}</div>
                </div>
                <button onClick={()=> openCatalogManifest(e)} style={navBtnStyle(theme)}>Load</button>
              </div>
            ))}
          </div>
        </div>
      )}

  {/* Removed legacy manifest popup overlay */}
    </div>
  );
}

const navBtnStyle = (theme) => ({ background: theme.primary, color: theme.text, border:'1px solid '+theme.secondary, borderRadius:6, padding:'4px 8px', cursor:'pointer', fontSize:12, fontWeight:600 });
const overlayStyle = { position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'60px 20px', zIndex:400 };
const modalStyle = (theme) => ({ background: theme.background, color: theme.text, width:'min(820px,100%)', maxHeight:'80vh', overflowY:'auto', border:'1px solid '+(theme.name==='Dark'?'#777':'#444'), borderRadius:12, padding:'14px 16px', boxShadow:'0 8px 24px rgba(0,0,0,0.35)' });
