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
  const [manifestOpen, setManifestOpen] = useState(false);
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
  const clearSelection = () => { setSelectedDates([]); setManifestOpen(false); };
  // Personnel movement widget data (combines personnel database and planner delta logic)
  const personnelRecords = useMemo(()=> { try { return JSON.parse(localStorage.getItem('personnelRecords'))||[]; } catch { return []; } }, []);
  const plannerRows = rowData; // existing rowData from planner
  const selectedSingleDate = selectedDates.length===1 ? selectedDates[0] : null;
  const movementForSelected = useMemo(()=>{
    if(!selectedSingleDate) return null;
    const key = keyForDate(selectedSingleDate);
    // Planner based movements (already computed in flightsOut / flightsIn maps)
    const plannerOutRaw = flightsOut[key]||[]; // entries like '3-Company'
    const plannerInRaw = flightsIn[key]||[];
    const parseEntries = (arr, dir) => arr.flatMap(e=>{ const dash=e.indexOf('-'); if(dash===-1) return []; const num=parseInt(e.slice(0,dash),10)||0; const company=e.slice(dash+1); return [{ company, count:num, dir }]; });
    const plannerMovements = [...parseEntries(plannerOutRaw,'OUT'), ...parseEntries(plannerInRaw,'IN')];
    // Personnel DB based movements: arrivals on this date, departures on this date
    const dateIso = selectedSingleDate.toISOString().slice(0,10);
    const arrivals = personnelRecords.filter(p=> p.arrivalDate===dateIso);
    const departures = personnelRecords.filter(p=> p.departureDate===dateIso);
    const onBoard = personnelRecords.filter(p=> {
      if(!p.arrivalDate) return false; const arr = new Date(p.arrivalDate+'T00:00:00'); const dep = p.departureDate? new Date(p.departureDate+'T00:00:00'): null; return arr <= selectedSingleDate && (!dep || dep >= selectedSingleDate);
    });
    return {
      date:key,
      plannerMovements,
      arrivals,
      departures,
      onBoard
    };
  }, [selectedSingleDate, flightsOut, flightsIn, personnelRecords]);

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
            onSelect={(days)=> { setSelectedDates(days||[]); if (days && days.length) setManifestOpen(true); }}
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
      {movementForSelected && (
        <div style={{ marginTop:24, background: theme.surface, padding:16, border:'1px solid '+(theme.name==='Dark' ? '#555':'#ccc'), borderRadius:12, boxShadow:'0 4px 10px rgba(0,0,0,0.25)', width:'min(900px,100%)' }}>
          <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>Personnel Movement - {movementForSelected.date}</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:24 }}>
            <div style={{ minWidth:220 }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Arrivals (Personnel DB)</div>
              {movementForSelected.arrivals.length? <ul style={{ margin:0, padding:'0 0 0 16px', fontSize:12 }}>{movementForSelected.arrivals.map(p=> <li key={p.id}>{p.firstName} {p.lastName} <span style={{ opacity:.6 }}>({p.company||'No Co'})</span></li>)}</ul> : <div style={{ fontSize:11, opacity:.6 }}>None</div>}
            </div>
            <div style={{ minWidth:220 }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Departures (Personnel DB)</div>
              {movementForSelected.departures.length? <ul style={{ margin:0, padding:'0 0 0 16px', fontSize:12 }}>{movementForSelected.departures.map(p=> <li key={p.id}>{p.firstName} {p.lastName} <span style={{ opacity:.6 }}>({p.company||'No Co'})</span></li>)}</ul> : <div style={{ fontSize:11, opacity:.6 }}>None</div>}
            </div>
            <div style={{ minWidth:220 }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Planner Movements</div>
              {movementForSelected.plannerMovements.length? <ul style={{ margin:0, padding:'0 0 0 16px', fontSize:12 }}>{movementForSelected.plannerMovements.map((m,i)=> <li key={i}>{m.dir==='OUT'? '+':''}{m.dir==='IN'? '-':''}{m.count} {m.company}</li>)}</ul> : <div style={{ fontSize:11, opacity:.6 }}>None</div>}
            </div>
            <div style={{ flex:1, minWidth:200 }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>On Board (Combined)</div>
              <div style={{ fontSize:12, marginBottom:6 }}>Total: {movementForSelected.onBoard.length}</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:4, maxHeight:160, overflowY:'auto', border:'1px solid '+(theme.name==='Dark'? '#444':'#bbb'), padding:6, borderRadius:6 }}>
                {movementForSelected.onBoard.map(p=> <div key={p.id} style={{ fontSize:11, background: theme.name==='Dark'? '#2e3439':'#eef3f7', padding:'4px 5px', borderRadius:6 }}>{p.firstName} {p.lastName}<br/><span style={{ opacity:.6 }}>{p.company||''}</span></div>)}
              </div>
            </div>
          </div>
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

  {manifestOpen && selectedDates.length>0 && (
        <div style={overlayStyle} onClick={e=> { if(e.target===e.currentTarget) setManifestOpen(false); }}>
          <div style={modalStyle(theme)}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <div style={{ fontSize:18, fontWeight:700 }}>Flight Manifest</div>
              <button onClick={()=> setManifestOpen(false)} style={navBtnStyle(theme)}>Close</button>
            </div>
    {sortedSelectedKeys.map(k => {
      const outs = flightsOut[k] || [];
      const ins = flightsIn[k] || [];
              const totalOut = outs.reduce((s,v)=> s + (parseInt(String(v).split('-')[0],10)||0),0);
              const totalIn = ins.reduce((s,v)=> s + (parseInt(String(v).split('-')[0],10)||0),0);
              return (
                <div key={k} style={{ marginBottom:16, border:'1px solid '+(theme.name==='Dark' ? '#666':'#ccc'), borderRadius:8, overflow:'hidden' }}>
                  <div style={{ background: theme.primary, color: theme.text, padding:'6px 10px', fontWeight:600 }}>{k}</div>
                  <div style={{ padding:'8px 10px', background: theme.surface }}>
                    <div style={{ fontSize:12, fontWeight:600, marginBottom:4 }}>Flights Out (+) {totalOut? `Total: ${totalOut}`:''}</div>
                    {outs.length ? <ul style={{ margin:0, padding:'0 0 0 18px', fontSize:12 }}>{outs.map((c,i)=> <li key={i}>{c}</li>)}</ul> : <div style={{ fontSize:11, fontStyle:'italic', opacity:.6 }}>No increases</div>}
                    <div style={{ fontSize:12, fontWeight:600, margin:'8px 0 4px' }}>Flights In (-) {totalIn? `Total: ${totalIn}`:''}</div>
                    {ins.length ? <ul style={{ margin:0, padding:'0 0 0 18px', fontSize:12 }}>{ins.map((c,i)=> <li key={i}>{c}</li>)}</ul> : <div style={{ fontSize:11, fontStyle:'italic', opacity:.6 }}>No decreases</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const navBtnStyle = (theme) => ({ background: theme.primary, color: theme.text, border:'1px solid '+theme.secondary, borderRadius:6, padding:'4px 8px', cursor:'pointer', fontSize:12, fontWeight:600 });
const overlayStyle = { position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'60px 20px', zIndex:400 };
const modalStyle = (theme) => ({ background: theme.background, color: theme.text, width:'min(820px,100%)', maxHeight:'80vh', overflowY:'auto', border:'1px solid '+(theme.name==='Dark'?'#777':'#444'), borderRadius:12, padding:'14px 16px', boxShadow:'0 8px 24px rgba(0,0,0,0.35)' });
