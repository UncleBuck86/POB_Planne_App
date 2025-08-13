import React, { useState, useMemo, useEffect } from 'react';
import { emitDomain } from '../ai/eventBus.js';
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
  const [largeCalendar, setLargeCalendar] = useState(()=>{ try { return localStorage.getItem('pobLargeCalendar')==='true'; } catch { return false; } });
  useEffect(()=>{ try { localStorage.setItem('pobLargeCalendar', largeCalendar?'true':'false'); } catch{} }, [largeCalendar]);
  const [selectedDates, setSelectedDates] = useState([]);
    const [hideNoMovement, setHideNoMovement] = useState(()=> { try { return localStorage.getItem('pobHideNoMovement')==='true'; } catch { return false; } });
    useEffect(()=>{ try { localStorage.setItem('pobHideNoMovement', hideNoMovement?'true':'false'); } catch {/* ignore */} }, [hideNoMovement]);
  // Removed manifestOpen popup; movement widget + direct manifest link replaces it
  const [catalogOpen, setCatalogOpen] = useState(false);
  const catalog = useMemo(()=>{ try { return JSON.parse(localStorage.getItem('flightManifestCatalogV1'))||[]; } catch { return []; } }, []);
  const openCatalogManifest = (entry) => {
    try {
      const d = new Date(entry.meta.date || entry.date);
      const key = keyForDate(d);
      localStorage.setItem('manifestGenerateDates', JSON.stringify([key]));
    } catch {/* ignore */}
  window.location.hash = '#logistics/manifest-view/'+entry.id;
  };
  const openManifestTemplate = () => {
    try {
      const keys = selectedDates.map(d=> keyForDate(d));
      localStorage.setItem('manifestGenerateDates', JSON.stringify(keys));
    } catch {}
  window.location.hash = '#logistics/manifest';
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
  // Highlight map: yellow if planner has pax but no manifest; green if manifest exists and passenger counts match planner (excluding cargo-like items)
  const highlightMap = useMemo(()=>{
    const ignoreKeywords = ['cargo','package','packages','sample','samples','mail','tool','tools','parts','supply','supplies'];
    const map = {};
    const parseEntries = (arr) => arr.reduce((sum, e)=>{ const dash=e.indexOf('-'); if(dash===-1) return sum; const num=parseInt(e.slice(0,dash),10); return sum + (isNaN(num)?0:num); },0);
    const isoFromKey = (k)=>{ try { const [m,d,y]=k.split('/'); return y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0'); } catch { return null; } };
    // load aircraft type limits for capacity error detection
    let aircraftTypes=[]; try { aircraftTypes = JSON.parse(localStorage.getItem('flightManifestAircraftTypes'))||[]; } catch { aircraftTypes=[]; }
    allDatesForMonth.forEach(d=>{
      const k=keyForDate(d); const iso=isoFromKey(k);
      const plannerOutboundCount = parseEntries(flightsOut[k]||[]);
      const plannerInboundCount = parseEntries(flightsIn[k]||[]);
      const plannerCount = plannerOutboundCount + plannerInboundCount;
      let manifestEntry = null;
      if(iso) manifestEntry = catalog.find(c=> (c.meta && c.meta.date===iso) || c.date===iso);
      let manifestCount = 0; let capacityError=false; const reasons=[];
      if(manifestEntry){
        const outbound = manifestEntry.outbound||[];
        const inbound = manifestEntry.inbound||[];
        const allPax = [...outbound, ...inbound];
        const outboundFiltered = outbound.filter(p=>{ const full=((p.name||'')+' '+(p.company||'')).toLowerCase(); return !ignoreKeywords.some(w=> full.includes(w)); });
        const inboundFiltered = inbound.filter(p=>{ const full=((p.name||'')+' '+(p.company||'')).toLowerCase(); return !ignoreKeywords.some(w=> full.includes(w)); });
        const manifestOutboundCount = outboundFiltered.length;
        const manifestInboundCount = inboundFiltered.length;
        manifestCount = manifestOutboundCount + manifestInboundCount;
        const type = aircraftTypes.find(a=> a.type === (manifestEntry.meta?.aircraftType));
        if(type){
          const maxPax = parseInt(type.maxPax)||null;
          const maxOutboundWeight = parseFloat(type.maxOutboundWeight)||null;
          const maxInboundWeight = parseFloat(type.maxInboundWeight)||null;
          const totalPax = (outbound.length + inbound.length);
            const sumWeight = (list)=> list.reduce((s,p)=> s + ((parseFloat(p.bodyWeight)||0)+(parseFloat(p.bagWeight)||0)),0);
          const outboundWt = sumWeight(outbound);
          const inboundWt = sumWeight(inbound);
          if(maxPax!=null && totalPax>maxPax){ capacityError=true; reasons.push(`PAX ${totalPax}/${maxPax} OVER`); }
          if(maxOutboundWeight!=null && outboundWt>maxOutboundWeight){ capacityError=true; reasons.push(`Outbound Wt ${outboundWt.toFixed(1)}/${maxOutboundWeight} OVER`); }
          if(maxInboundWeight!=null && inboundWt>maxInboundWeight){ capacityError=true; reasons.push(`Inbound Wt ${inboundWt.toFixed(1)}/${maxInboundWeight} OVER`); }
        }
        // If any mismatch or capacity error we'll append detailed counts line
        const countsLine = `Counts: Planner OB ${plannerOutboundCount} / IB ${plannerInboundCount} | Manifest OB ${manifestEntry.outbound?.length||0} (${manifestCount? outboundFiltered.length:''}) / IB ${manifestEntry.inbound?.length||0} (${manifestCount? inboundFiltered.length:''})`;
        // We'll append counts line later if mismatch or error
        manifestEntry.__countsLine = countsLine; // temp attach (not persisted)
        manifestEntry.__plannerOutboundCount = plannerOutboundCount;
        manifestEntry.__plannerInboundCount = plannerInboundCount;
        manifestEntry.__manifestOutboundCount = outboundFiltered.length;
        manifestEntry.__manifestInboundCount = inboundFiltered.length;
      }
      let color=null;
      if(plannerCount>0 && !manifestEntry) color='yellow';
      else if(manifestEntry){
        if(capacityError){ color='red'; if(!reasons.length) reasons.push('Capacity limit exceeded'); if(manifestEntry.__countsLine) reasons.push(manifestEntry.__countsLine); }
        else if(plannerCount>0 && manifestCount !== plannerCount){ color='red'; reasons.push(`Planner PAX ${plannerCount} vs Manifest ${manifestCount}`); if(manifestEntry.__countsLine) reasons.push(manifestEntry.__countsLine); }
        else if(plannerCount>0 && manifestCount === plannerCount) color='green';
      }
      if(color) map[k] = { color, plannerCount, manifestCount, reasons };
    });
    return map;
  }, [allDatesForMonth, flightsOut, flightsIn, catalog]);
  const sortedSelectedKeys = selectedDates.map(d => keyForDate(d)).sort((a,b)=> new Date(a)-new Date(b));
  const [popup, setPopup] = useState(null);
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
  emitDomain('MANIFEST_TEMPLATE_CHANGED', { added: Object.keys(selectedPeople).length }, 'Selected personnel staged for manifest');
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
            emitDomain('MANIFEST_TEMPLATE_CHANGED', { loadedExisting:true, date: targetIso }, 'Loaded existing manifest '+targetIso);
          }
        }
      }
    } catch {/* ignore */}
  if(selectedDates.length) openManifestTemplate(); else window.location.hash = '#logistics/manifest';
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

  // Open manifest for a specific planner date key (M/D/YYYY)
  const openManifestForDate = (mdyKey) => {
    try {
      localStorage.setItem('manifestGenerateDates', JSON.stringify([mdyKey]));
      const [m,d,y] = mdyKey.split('/');
      const iso = y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');
      const existing = catalog.find(c=> c.meta && c.meta.date === iso);
      if(existing){
  window.location.hash = '#logistics/manifest-view/'+existing.id;
        emitDomain('MANIFEST_GENERATED', { id: existing.id, date: iso, existing:true }, 'Opened existing manifest '+iso);
        return;
      } else {
        try {
          const prev = JSON.parse(localStorage.getItem('flightManifestTemplateV1'))||{};
          const meta = { ...(prev.meta||{}), date: iso };
          localStorage.setItem('flightManifestTemplateV1', JSON.stringify({ meta, outbound: [], inbound: [] }));
        } catch {/* ignore */}
        emitDomain('MANIFEST_TEMPLATE_CHANGED', { date: iso, newTemplate:true }, 'Started new manifest '+iso);
      }
    } catch {/* ignore */}
  window.location.hash = '#logistics/manifest';
  };
  useEffect(()=>{
    // expose lightweight flights context for passive AI
    window.__buckFlightsCtx = () => ({ month: displayMonth.toISOString().slice(0,7), selectedDays: selectedDates.length, catalog: catalog.length });
    return () => { delete window.__buckFlightsCtx; };
  }, [displayMonth, selectedDates, catalog]);

  return (
    <div style={{ color: theme.text, background: theme.background, minHeight:'100vh', padding:'24px' }}>
      <a href="#logistics" style={{ textDecoration:'none', color: theme.primary, fontSize:12, fontWeight:600 }}>← Back</a>
      <h2 style={{ margin:'8px 0 12px' }}>Flights</h2>
      {/* Inline manifest access cards (moved from Logistics) */}
      <div style={{ display:'flex', gap:18, flexWrap:'wrap', margin:'4px 0 22px' }}>
        <a href="#logistics/flights/manifest" style={{ textDecoration:'none' }}>
          <div style={manifestCardStyle(theme,'#d94f90')}>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>Manifest Template</div>
            <div style={{ fontSize:11, lineHeight:1.35, opacity:.85 }}>Create / edit current flight manifest, manage passengers & flight details.</div>
          </div>
        </a>
        <div onClick={()=> setCatalogOpen(true)} style={manifestCardStyle(theme,'#6c8bff', true)} role="button" tabIndex={0}
             onKeyDown={e=> { if(e.key==='Enter'||e.key===' ') { e.preventDefault(); setCatalogOpen(true); } }}>
          <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>Saved Manifests</div>
          <div style={{ fontSize:11, lineHeight:1.35, opacity:.85 }}>Browse & load saved manifests ({catalog.length}).</div>
        </div>
      </div>
      <div style={{ display:'flex', gap:40, alignItems:'flex-start', flexWrap:'wrap' }}>
        <div style={{ background: theme.surface, padding:20, border:'1px solid '+(theme.name==='Dark' ? '#555':'#ccc'), borderRadius:16, boxShadow:'0 4px 12px rgba(0,0,0,0.3)', display:'flex', flexDirection:'column', alignItems:'stretch' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div style={{ fontSize:14, fontWeight:600 }}>Select Flight Date(s)</div>
            <button onClick={()=> setLargeCalendar(l=>!l)} style={{ background: theme.primary, color: theme.text, border:'1px solid '+(theme.secondary||'#222'), padding:'4px 8px', borderRadius:8, cursor:'pointer', fontSize:11, fontWeight:600 }}>{largeCalendar? 'Normal Size':'Large Size'}</button>
          </div>
          <DayPicker
            mode="multiple"
            month={displayMonth}
            onMonthChange={setDisplayMonth}
            selected={selectedDates}
            onSelect={(days)=> { setSelectedDates(days||[]); }}
            showOutsideDays
            weekStartsOn={0}
            modifiers={{}}
            onDayClick={(day)=>{
              const k = keyForDate(day);
              const hl = highlightMap[k];
              if(hl && hl.color==='red' && hl.reasons && hl.reasons.length){
                setPopup({ dateKey:k, reasons: hl.reasons });
              }
            }}
            components={{
              DayContent: (props) => {
                const day = props.date;
                const k = keyForDate(day);
                const movement = movementCounts[k] || 0;
                const hl = highlightMap[k];
                let bg='transparent', border='transparent';
                if(hl){
                  if(hl.color==='yellow') { bg = theme.name==='Dark'? '#665c1b':'#ffe58a'; border = theme.name==='Dark'? '#c8a93c':'#d1a500'; }
                  else if(hl.color==='green'){ bg = theme.name==='Dark'? '#1f6135':'#9de6b9'; border = theme.name==='Dark'? '#2fa764':'#1f7a44'; }
                  else if(hl.color==='red'){ bg = theme.name==='Dark'? '#632727':'#ffb3b3'; border = theme.name==='Dark'? '#c33':'#c62828'; }
                }
                return (
                  <div style={{ position:'relative', width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:600, background:bg, border: hl? '1px solid '+border: undefined, borderRadius:8, boxSizing:'border-box', padding:0 }} title={movement? `${movement} flight movement change(s)` : undefined}>
                    <span>{day.getDate()}</span>
                    {movement>0 && <span style={{ position:'absolute', bottom:2, right:2, fontSize:largeCalendar?11:9, padding:largeCalendar?'2px 4px':'1px 3px', borderRadius:6, background: theme.secondary, color: theme.text }}>{movement}</span>}
                  </div>
                );
              }
            }}
            styles={{
              caption:{ color: theme.text, fontSize: largeCalendar? '1.15rem':'0.9rem', padding: largeCalendar? '8px 0':'4px 0', fontWeight:700 },
              head:{ marginTop:4 },
              head_cell:{ background: theme.primary, color: theme.text, fontWeight:700, fontSize: largeCalendar? 14:12, padding: largeCalendar? '10px 0':'6px 0' },
              table:{ width:'100%', fontSize: largeCalendar? '0.95rem':'0.75rem' },
              day:{ fontSize: largeCalendar? '0.95rem':'0.70rem', padding: largeCalendar? '10px 0':'6px 0', margin:0, borderRadius:8 },
              day_outside:{ opacity:.35 },
              day_selected:{ background: theme.primary, color: theme.text, fontWeight:700, borderRadius:8, boxShadow:'0 0 0 2px '+(theme.secondary||'#000')+'55 inset' },
              day_today:{ outline:'2px solid '+theme.secondary, fontWeight:700 },
              nav:{ marginBottom:4 },
              nav_button_previous:{ background: theme.primary, color: theme.text, width: largeCalendar? '2.2rem':'1.8rem', height: largeCalendar? '2.2rem':'1.8rem', borderRadius:8 },
              nav_button_next:{ background: theme.primary, color: theme.text, width: largeCalendar? '2.2rem':'1.8rem', height: largeCalendar? '2.2rem':'1.8rem', borderRadius:8 }
            }}
          />
          <div style={{ marginTop:8, fontSize:largeCalendar?13:11, opacity:.75 }}>Select one or more dates to view flight manifest.</div>
            <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:6 }}>
              <label style={{ fontSize:11, display:'flex', alignItems:'center', gap:6 }}>
                <input type='checkbox' checked={hideNoMovement} onChange={e=> setHideNoMovement(e.target.checked)} /> Hide days with no movements
              </label>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', fontSize:11 }}>
                <span style={legendBadge(theme,'yellow')}>Missing Manifest</span>
                <span style={legendBadge(theme,'green')}>Manifest Correct</span>
                <span style={legendBadge(theme,'red')}>Manifest Error</span>
              </div>
            </div>
          {selectedDates.length>0 && <button onClick={openManifestTemplate} style={{ marginTop:8, ...navBtnStyle(theme), padding:'6px 10px' }}>Open Manifest Template</button>}
          <button onClick={()=> setCatalogOpen(o=>!o)} style={{ marginTop:8, ...navBtnStyle(theme), padding:'6px 10px' }}>{catalogOpen? 'Close Saved Catalog':'Saved Manifests'}</button>
          {selectedDates.length>0 && <button onClick={clearSelection} style={{ marginTop:8, ...navBtnStyle(theme), padding:'6px 10px' }}>Clear Selection</button>}
        </div>
      </div>
      {popup && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:800 }} onClick={e=>{ if(e.target===e.currentTarget) setPopup(null); }}>
          <div style={{ background: theme.surface, color: theme.text, padding:24, borderRadius:14, width:'min(440px,90%)', border:'1px solid '+(theme.name==='Dark'? '#666':'#555'), boxShadow:'0 8px 28px rgba(0,0,0,0.45)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <h3 style={{ margin:0, fontSize:18 }}>Flight Issues - {popup.dateKey}</h3>
              <button onClick={()=>setPopup(null)} style={{ background: theme.primary, color: theme.text, border:'1px solid '+(theme.secondary||'#222'), borderRadius:8, padding:'4px 8px', cursor:'pointer', fontSize:11, fontWeight:600 }}>Close</button>
            </div>
            <ul style={{ margin:0, padding:'0 0 0 18px', fontSize:13 }}>
              {popup.reasons.map((r,i)=>(<li key={i} style={{ marginBottom:4 }}>{r}</li>))}
            </ul>
            <div style={{ fontSize:11, opacity:.7, marginTop:10 }}>Resolve by adjusting manifest counts or weights to stay within aircraft limits and match planner totals.</div>
          </div>
        </div>
      )}
      {movementForSelected.length>0 && (
        <div style={{ marginTop:24, display:'flex', flexDirection:'column', gap:24 }}>
          {movementForSelected.map(mv => (
            <div key={mv.date} style={{ background: theme.surface, padding:16, border:'1px solid '+(theme.name==='Dark' ? '#555':'#ccc'), borderRadius:12, boxShadow:'0 4px 10px rgba(0,0,0,0.25)', width:'min(980px,100%)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <div style={{ fontSize:16, fontWeight:700, cursor:'pointer', textDecoration:'underline' }} onClick={()=> openManifestForDate(mv.date)} title="Open manifest for this date">Personnel Movement - {mv.date}</div>
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
const legendBadge = (theme,color)=>{
  let bg='#ccc', border='#999';
  if(color==='yellow'){ bg= theme.name==='Dark'? '#665c1b':'#ffe58a'; border= theme.name==='Dark'? '#c8a93c':'#d1a500'; }
  if(color==='green'){ bg= theme.name==='Dark'? '#1f6135':'#9de6b9'; border= theme.name==='Dark'? '#2fa764':'#1f7a44'; }
  if(color==='red'){ bg= theme.name==='Dark'? '#632727':'#ffb3b3'; border= theme.name==='Dark'? '#c33':'#c62828'; }
  return { background:bg, border:'1px solid '+border, padding:'4px 8px', borderRadius:20, fontWeight:600 };
};
const manifestCardStyle = (theme,color,clickable)=> ({
  width:220,
  padding:'14px 14px 16px',
  background: theme.name==='Dark'? '#3b4045':'#f4f7fa',
  border:'1px solid '+(theme.name==='Dark'? '#555':'#bbb'),
  borderRadius:12,
  cursor: clickable? 'pointer':'pointer',
  position:'relative',
  boxShadow:'0 3px 8px rgba(0,0,0,0.25)',
  transition:'transform .2s, box-shadow .2s',
  color: theme.text,
  outline:'none'
});
const overlayStyle = { position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'60px 20px', zIndex:400 };
const modalStyle = (theme) => ({ background: theme.background, color: theme.text, width:'min(820px,100%)', maxHeight:'80vh', overflowY:'auto', border:'1px solid '+(theme.name==='Dark'?'#777':'#444'), borderRadius:12, padding:'14px 16px', boxShadow:'0 8px 24px rgba(0,0,0,0.35)' });
