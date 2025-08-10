import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from '../ThemeContext.jsx';

const STORAGE_KEY = 'flightManifestTemplateV1';
const FIELD_VIS_KEY = 'flightManifestVisibleFields';
const defaultData = {
  meta: {
    flightNumber: '',
    date: new Date().toISOString().slice(0,10),
    departure: '',
    arrival: '',
    departureTime: '',
    arrivalTime: '',
    aircraftType: '',
    tailNumber: '',
    captain: '',
    coPilot: '',
    dispatcher: '',
    notes: ''
  },
  outbound: [], // passengers departing (Flights Out)
  inbound: []   // passengers arriving (Flights In)
};

export default function FlightManifestTemplate() {
  const { theme } = useTheme();
  const [data, setData] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
      const initial = raw ? { ...defaultData, ...raw } : { ...defaultData };
      // Migration: old format used `passengers` single list
      if (!initial.outbound && Array.isArray(initial.passengers)) initial.outbound = initial.passengers;
      if (!Array.isArray(initial.outbound)) initial.outbound = [];
      if (!Array.isArray(initial.inbound)) initial.inbound = [];
      delete initial.passengers;
      return initial;
    } catch {
      return { ...defaultData };
    }
  });
  const isAdmin = () => { try { return localStorage.getItem('pobIsAdmin') === 'true'; } catch { return false; } };
  const allFieldKeys = ['flightNumber','date','departure','departureTime','arrival','arrivalTime','aircraftType','tailNumber','captain','coPilot','dispatcher','notes'];
  const [visibleFields, setVisibleFields] = useState(()=>{
    try { const stored = JSON.parse(localStorage.getItem(FIELD_VIS_KEY)); if (stored && typeof stored === 'object') return { ...allFieldKeys.reduce((a,k)=> (a[k]=true,a),{}), ...stored }; } catch{/*ignore*/}
    return allFieldKeys.reduce((a,k)=> (a[k]=true,a),{});
  });
  const [configOpen, setConfigOpen] = useState(false);
  useEffect(()=>{ try { localStorage.setItem(FIELD_VIS_KEY, JSON.stringify(visibleFields)); } catch {/* ignore */} }, [visibleFields]);
  const toggleField = (k) => setVisibleFields(v => ({ ...v, [k]: !v[k] }));
  const [autoSaveState, setAutoSaveState] = useState('');
  const saveTimer = useRef();

  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); setAutoSaveState('Saved ' + new Date().toLocaleTimeString()); } catch { setAutoSaveState('Save failed'); }
    }, 400);
    return () => clearTimeout(saveTimer.current);
  }, [data]);

  const updateMeta = (field, value) => setData(d => ({ ...d, meta: { ...d.meta, [field]: value } }));
  const newPax = () => ({ id: crypto.randomUUID(), name:'', company:'', bodyWeight:'', bagWeight:'', bagCount:'', comments:'' });
  const addPassenger = (dir) => setData(d => ({ ...d, [dir]: [...d[dir], newPax()] }));
  const updatePassenger = (dir, id, field, value) => setData(d => ({ ...d, [dir]: d[dir].map(p => p.id === id ? { ...p, [field]: value } : p) }));
  const removePassenger = (dir, id) => setData(d => ({ ...d, [dir]: d[dir].filter(p => p.id !== id) }));
  const clearAll = () => { if (confirm('Clear all manifest data?')) setData(defaultData); };

  const safeOutbound = data.outbound || [];
  const safeInbound = data.inbound || [];
  const totalOutbound = safeOutbound.length;
  const totalInbound = safeInbound.length;
  const totalWeightOutbound = useMemo(()=> safeOutbound.reduce((s,p)=> {
    const bw = parseFloat(p.bodyWeight)||0; const gw = parseFloat(p.bagWeight)||0; return s + bw + gw; },0), [safeOutbound]);
  const totalWeightInbound = useMemo(()=> safeInbound.reduce((s,p)=> { const bw = parseFloat(p.bodyWeight)||0; const gw = parseFloat(p.bagWeight)||0; return s + bw + gw; },0), [safeInbound]);
  const totalBodyOutbound = useMemo(()=> safeOutbound.reduce((s,p)=> s + (parseFloat(p.bodyWeight)||0),0), [safeOutbound]);
  const totalBagOutbound = useMemo(()=> safeOutbound.reduce((s,p)=> s + (parseFloat(p.bagWeight)||0),0), [safeOutbound]);
  const totalBodyInbound = useMemo(()=> safeInbound.reduce((s,p)=> s + (parseFloat(p.bodyWeight)||0),0), [safeInbound]);
  const totalBagInbound = useMemo(()=> safeInbound.reduce((s,p)=> s + (parseFloat(p.bagWeight)||0),0), [safeInbound]);
  const grandTotalPax = totalOutbound + totalInbound;
  const grandTotalWeight = totalWeightOutbound + totalWeightInbound;

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`flight-manifest-${data.meta.flightNumber||'draft'}.json`; a.click(); URL.revokeObjectURL(url);
  };
  const printView = () => {
    const w = window.open('', '_blank'); if (!w) return;
    const css = `body{font-family:Segoe UI,Arial,sans-serif;padding:16px;} h2{margin-top:0;} table{border-collapse:collapse;width:100%;font-size:12px;} th,td{border:1px solid #444;padding:4px 6px;} th{background:#ddd;} .section{margin-bottom:18px;}`;
    const html = `<!DOCTYPE html><html><head><title>Flight Manifest</title><style>${css}</style></head><body>`+
      `<h2>Flight Manifest ${data.meta.flightNumber? ' - '+data.meta.flightNumber:''}</h2>`+
      `<div class='section'><strong>Date:</strong> ${data.meta.date||''} &nbsp; <strong>Route:</strong> ${data.meta.departure||'???'} → ${data.meta.arrival||'???'} &nbsp; <strong>ETD:</strong> ${data.meta.departureTime||''} &nbsp; <strong>ETA:</strong> ${data.meta.arrivalTime||''}</div>`+
      `<div class='section'><strong>Aircraft:</strong> ${data.meta.aircraftType||''} ${data.meta.tailNumber||''} &nbsp; <strong>Captain:</strong> ${data.meta.captain||''} &nbsp; <strong>Co-Pilot:</strong> ${data.meta.coPilot||''} &nbsp; <strong>Dispatcher:</strong> ${data.meta.dispatcher||''}</div>`+
      `<div class='section'><strong>Notes:</strong><br/>${(data.meta.notes||'').replace(/</g,'&lt;').replace(/\n/g,'<br/>')}</div>`+
  `<h3>Outbound (${totalOutbound})</h3>`+
  `<table><thead><tr><th>#</th><th>Name</th><th>Company</th><th>Body Wt</th><th>Bag Wt</th><th># Bags</th><th>Total Wt</th><th>Origin</th><th>Destination</th><th>Comments</th></tr></thead><tbody>`+
  data.outbound.map((p,i)=>{ const bw=parseFloat(p.bodyWeight)||0; const gw=parseFloat(p.bagWeight)||0; const tot=bw+gw; return `<tr><td>${i+1}</td><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.company)}</td><td>${p.bodyWeight||''}</td><td>${p.bagWeight||''}</td><td>${p.bagCount||''}</td><td>${tot?tot:''}</td><td>${escapeHtml(data.meta.departure||'')}</td><td>${escapeHtml(data.meta.arrival||'')}</td><td>${escapeHtml(p.comments)}</td></tr>`; }).join('')+
      `</tbody></table>`+
      `<div style='margin:6px 0 18px'><strong>Outbound Weight Total:</strong> ${totalWeightOutbound.toFixed(1)}</div>`+
  `<h3>Inbound (${totalInbound})</h3>`+
  `<table><thead><tr><th>#</th><th>Name</th><th>Company</th><th>Body Wt</th><th>Bag Wt</th><th># Bags</th><th>Total Wt</th><th>Origin</th><th>Destination</th><th>Comments</th></tr></thead><tbody>`+
  data.inbound.map((p,i)=>{ const bw=parseFloat(p.bodyWeight)||0; const gw=parseFloat(p.bagWeight)||0; const tot=bw+gw; return `<tr><td>${i+1}</td><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.company)}</td><td>${p.bodyWeight||''}</td><td>${p.bagWeight||''}</td><td>${p.bagCount||''}</td><td>${tot?tot:''}</td><td>${escapeHtml(data.meta.arrival||'')}</td><td>${escapeHtml(data.meta.departure||'')}</td><td>${escapeHtml(p.comments)}</td></tr>`; }).join('')+
      `</tbody></table>`+
      `<div style='margin-top:6px'><strong>Inbound Weight Total:</strong> ${totalWeightInbound.toFixed(1)}</div>`+
      `<div style='margin-top:14px'><strong>Grand Total Pax:</strong> ${grandTotalPax} &nbsp; <strong>Grand Total Weight:</strong> ${grandTotalWeight.toFixed(1)}</div>`+
      `</body></html>`;
    w.document.write(html); w.document.close(); w.print();
  };

  return (
    <div style={{ background: theme.background, color: theme.text, minHeight:'100vh', padding:'24px 26px 80px', position:'relative' }}>
      {isAdmin() && (
        <button
          onClick={()=>setConfigOpen(o=>!o)}
          title="Admin Settings"
          style={{ position:'fixed', top:14, right:20, zIndex:500, background:'transparent', border:'none', cursor:'pointer', fontSize:24, color: theme.primary }}
        >⚙️</button>
      )}
      {configOpen && isAdmin() && (
        <div style={{ position:'fixed', top:54, right:16, zIndex:520, background: theme.surface, border:'1px solid '+(theme.primary||'#267'), borderRadius:12, padding:'14px 16px 18px', width:300, boxShadow:'0 6px 18px rgba(0,0,0,0.4)', maxHeight:'70vh', overflowY:'auto' }}>
          <div style={{ fontWeight:700, marginBottom:10, fontSize:14 }}>Manifest Admin Settings</div>
          <div style={{ fontSize:11, opacity:.7, marginBottom:10 }}>Toggle which flight detail fields appear. These preferences persist locally.</div>
          <div style={{ display:'flex', gap:8, marginBottom:12 }}>
            <button onClick={()=>setVisibleFields(allFieldKeys.reduce((a,k)=> (a[k]=true,a),{}))} style={smallBtn(theme)}>All</button>
            <button onClick={()=>setVisibleFields(allFieldKeys.reduce((a,k)=> (a[k]=false,a),{}))} style={smallBtn(theme)}>None</button>
            <button onClick={()=>setConfigOpen(false)} style={{ ...smallBtn(theme), marginLeft:'auto' }}>Close</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {allFieldKeys.map(k=> (
              <label key={k} style={{ fontSize:12, display:'flex', alignItems:'center', gap:6, background: visibleFields[k]? (theme.name==='Dark'? '#2e3237':'#eef3f7'):'#00000011', padding:'4px 8px', borderRadius:6 }}>
                <input type="checkbox" checked={!!visibleFields[k]} onChange={()=>toggleField(k)} />
                <span style={{ textTransform:'capitalize' }}>{k.replace(/([A-Z])/g,' $1')}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <h2 style={{ marginTop:0 }}>Flight Manifest Template</h2>
      <div style={{ fontSize:12, opacity:.75, marginBottom:16 }}>Draft and store a manifest template. Auto-saves locally; not yet integrated with planner flights.</div>
      <section style={card(theme)}>
        <div style={sectionHeader(theme)}>Flight Details</div>
        <div style={gridForm}>
          {visibleFields.flightNumber && <Labeled label="Flight #"><input value={data.meta.flightNumber} onChange={e=>updateMeta('flightNumber', e.target.value)} /></Labeled>}
          {visibleFields.date && <Labeled label="Date"><input type="date" value={data.meta.date} onChange={e=>updateMeta('date', e.target.value)} /></Labeled>}
          {visibleFields.departure && <Labeled label="Departure"><input value={data.meta.departure} onChange={e=>updateMeta('departure', e.target.value)} placeholder="Origin" /></Labeled>}
          {visibleFields.departureTime && <Labeled label="Departure Time"><input value={data.meta.departureTime} onChange={e=>updateMeta('departureTime', e.target.value)} placeholder="HHMM" /></Labeled>}
          {visibleFields.arrival && <Labeled label="Arrival"><input value={data.meta.arrival} onChange={e=>updateMeta('arrival', e.target.value)} placeholder="Destination" /></Labeled>}
            {visibleFields.arrivalTime && <Labeled label="Arrival Time"><input value={data.meta.arrivalTime} onChange={e=>updateMeta('arrivalTime', e.target.value)} placeholder="HHMM" /></Labeled>}
            {visibleFields.aircraftType && <Labeled label="Aircraft Type"><input value={data.meta.aircraftType} onChange={e=>updateMeta('aircraftType', e.target.value)} placeholder="Type" /></Labeled>}
            {visibleFields.tailNumber && <Labeled label="Tail #"><input value={data.meta.tailNumber} onChange={e=>updateMeta('tailNumber', e.target.value)} placeholder="Registration" /></Labeled>}
            {visibleFields.captain && <Labeled label="Captain"><input value={data.meta.captain} onChange={e=>updateMeta('captain', e.target.value)} /></Labeled>}
            {visibleFields.coPilot && <Labeled label="Co-Pilot"><input value={data.meta.coPilot} onChange={e=>updateMeta('coPilot', e.target.value)} /></Labeled>}
            {visibleFields.dispatcher && <Labeled label="Dispatcher"><input value={data.meta.dispatcher} onChange={e=>updateMeta('dispatcher', e.target.value)} /></Labeled>}
        </div>
        {visibleFields.notes && (
          <Labeled label="Notes" full>
            <textarea rows={4} value={data.meta.notes} onChange={e=>updateMeta('notes', e.target.value)} style={{ resize:'vertical' }} />
          </Labeled>
        )}
        <div style={{ fontSize:11, opacity:.6, marginTop:6 }}>{autoSaveState}</div>
      </section>
      <section style={card(theme)}>
        <div style={sectionHeader(theme)}>Outbound Passengers ({totalOutbound})</div>
  {passengerTable(theme, 'outbound', safeOutbound, (id,f,v)=>updatePassenger('outbound',id,f,v), (id)=>removePassenger('outbound',id))}
        <div style={{ display:'flex', gap:12, marginTop:12, flexWrap:'wrap', alignItems:'center' }}>
          <button onClick={()=>addPassenger('outbound')} style={actionBtn(theme)}>Add Outbound</button>
          <div style={{ marginLeft:'auto', fontSize:12, opacity:.8, display:'flex', gap:14, flexWrap:'wrap' }}>
            <span>Pax: {totalOutbound}</span>
            <span>Body Wt: {totalBodyOutbound.toFixed(1)}</span>
            <span>Bag Wt: {totalBagOutbound.toFixed(1)}</span>
            <span>Total: {totalWeightOutbound.toFixed(1)}</span>
          </div>
        </div>
      </section>
      <section style={card(theme)}>
        <div style={sectionHeader(theme)}>Inbound Passengers ({totalInbound})</div>
  {passengerTable(theme, 'inbound', safeInbound, (id,f,v)=>updatePassenger('inbound',id,f,v), (id)=>removePassenger('inbound',id))}
        <div style={{ display:'flex', gap:12, marginTop:12, flexWrap:'wrap', alignItems:'center' }}>
          <button onClick={()=>addPassenger('inbound')} style={actionBtn(theme)}>Add Inbound</button>
          <div style={{ marginLeft:'auto', fontSize:12, opacity:.8, display:'flex', gap:14, flexWrap:'wrap' }}>
            <span>Pax: {totalInbound}</span>
            <span>Body Wt: {totalBodyInbound.toFixed(1)}</span>
            <span>Bag Wt: {totalBagInbound.toFixed(1)}</span>
            <span>Total: {totalWeightInbound.toFixed(1)}</span>
          </div>
        </div>
      </section>
      <section style={card(theme)}>
        <div style={sectionHeader(theme)}>Actions & Totals</div>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          <button onClick={exportJSON} style={actionBtn(theme)}>Export JSON</button>
          <button onClick={printView} style={actionBtn(theme)}>Print</button>
          <button onClick={clearAll} style={{ ...actionBtn(theme), background:'#aa3333' }}>Clear All</button>
          <div style={{ marginLeft:'auto', fontSize:12, opacity:.8, display:'flex', alignItems:'center', gap:16 }}>
            <span>Grand Total Pax: {grandTotalPax}</span>
            <span>Grand Total Weight: {grandTotalWeight.toFixed(1)}</span>
          </div>
        </div>
      </section>
      <div style={{ fontSize:10, opacity:.5, marginTop:30 }}>Future: auto-populate from planner deltas; attach saved templates to flights; CSV export.</div>
    </div>
  );
}

const card = (theme) => ({ background: theme.surface, border:'1px solid '+(theme.name==='Dark' ? '#555':'#ccc'), borderRadius:12, padding:'16px 18px 20px', marginBottom:28, boxShadow:'0 4px 12px rgba(0,0,0,0.25)' });
const sectionHeader = (theme) => ({ fontSize:16, fontWeight:700, marginBottom:14, paddingBottom:6, borderBottom:'2px solid '+(theme.primary||'#267') });
const gridForm = { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:'10px 16px', marginBottom:12 };
const labelStyle = { fontSize:10, textTransform:'uppercase', letterSpacing:'.5px', fontWeight:600, opacity:.75, marginBottom:2 };
function Labeled({ label, children, full }) { return (
  <label style={{ display:'flex', flexDirection:'column', ...(full?{gridColumn:'1 / -1'}:{}) }}>
    <span style={labelStyle}>{label}</span>
    {children}
  </label>
);} 
const Th = ({ children, theme }) => <th style={{ padding:'6px 8px', textAlign:'left', background: theme.primary, color: theme.text, border:'1px solid '+(theme.name==='Dark' ? '#444':'#888'), fontSize:11 }}>{children}</th>;
const Td = ({ children, colSpan, style }) => <td colSpan={colSpan} style={{ padding:'4px 6px', border:'1px solid #555', fontSize:11, ...style }}>{children}</td>;
const actionBtn = (theme) => ({ background: theme.primary, color: theme.text, border:'1px solid '+(theme.secondary||'#222'), padding:'6px 12px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600, boxShadow:'0 2px 4px rgba(0,0,0,0.3)' });
const smallBtn = (theme) => ({ background: theme.primary, color: theme.text, border:'1px solid '+(theme.secondary||'#222'), padding:'4px 6px', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:600 });
function escapeHtml(str='') { return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }
function passengerTable(theme, dir, list, onUpdate, onRemove) {
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ borderCollapse:'collapse', width:'100%', fontSize:12 }}>
        <thead>
          <tr>
            <Th theme={theme}>#</Th>
            <Th theme={theme}>Name</Th>
            <Th theme={theme}>Company</Th>
            <Th theme={theme}>Body Wt</Th>
            <Th theme={theme}>Bag Wt</Th>
            <Th theme={theme}># Bags</Th>
            <Th theme={theme}>Total Wt</Th>
            <Th theme={theme}>Origin</Th>
            <Th theme={theme}>Destination</Th>
            <Th theme={theme}>Comments</Th>
            <Th theme={theme}>Action</Th>
          </tr>
        </thead>
        <tbody>
          {list.map((p,i)=>{
            const origin = dir === 'outbound' ? (p.origin || p.metaOrigin) : (p.origin || p.metaOrigin);
            const destination = dir === 'outbound' ? (p.destination || p.metaDestination) : (p.destination || p.metaDestination);
            const bw = parseFloat(p.bodyWeight)||0; const gw = parseFloat(p.bagWeight)||0; const total = bw + gw;
            return (
            <tr key={p.id} style={{ background: i%2? (theme.name==='Dark'? '#3d4146':'#f7f7f7'):'transparent' }}>
              <Td>{i+1}</Td>
              <Td><input value={p.name} onChange={e=>onUpdate(p.id,'name',e.target.value)} placeholder="Full Name" /></Td>
              <Td><input value={p.company} onChange={e=>onUpdate(p.id,'company',e.target.value)} placeholder="Company" /></Td>
              <Td style={{ width:80 }}><input value={p.bodyWeight||''} onChange={e=>onUpdate(p.id,'bodyWeight',e.target.value.replace(/[^0-9.]/g,''))} placeholder="Body" /></Td>
              <Td style={{ width:80 }}><input value={p.bagWeight||''} onChange={e=>onUpdate(p.id,'bagWeight',e.target.value.replace(/[^0-9.]/g,''))} placeholder="Bags" /></Td>
              <Td style={{ width:70 }}><input value={p.bagCount||''} onChange={e=>onUpdate(p.id,'bagCount',e.target.value.replace(/[^0-9]/g,''))} placeholder="#" /></Td>
              <Td style={{ width:80, fontWeight:600 }}>{total ? total.toFixed(1) : ''}</Td>
              <Td style={{ width:90 }}><input value={dir==='outbound'? (p.origin||''): (p.origin||'')} onChange={e=>onUpdate(p.id,'origin',e.target.value)} placeholder={dir==='outbound'? 'Dep':'Arr'} /></Td>
              <Td style={{ width:110 }}><input value={dir==='outbound'? (p.destination||''): (p.destination||'')} onChange={e=>onUpdate(p.id,'destination',e.target.value)} placeholder={dir==='outbound'? 'Arr':'Dep'} /></Td>
              <Td><input value={p.comments} onChange={e=>onUpdate(p.id,'comments',e.target.value)} placeholder="Notes" /></Td>
              <Td><button onClick={()=>onRemove(p.id)} style={smallBtn(theme)}>✕</button></Td>
            </tr>
          )})}
          {list.length===0 && <tr><Td colSpan={11} style={{ fontStyle:'italic', opacity:.6 }}>None</Td></tr>}
        </tbody>
      </table>
    </div>
  );
}
