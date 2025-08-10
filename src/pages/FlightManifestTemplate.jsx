import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from '../ThemeContext.jsx';

const STORAGE_KEY = 'flightManifestTemplateV1';
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
  passengers: []
};

export default function FlightManifestTemplate() {
  const { theme } = useTheme();
  const [data, setData] = useState(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultData; } catch { return defaultData; } });
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
  const addPassenger = () => setData(d => ({ ...d, passengers: [...d.passengers, { id: crypto.randomUUID(), name:'', company:'', role:'', weight:'', comments:'' }] }));
  const updatePassenger = (id, field, value) => setData(d => ({ ...d, passengers: d.passengers.map(p => p.id === id ? { ...p, [field]: value } : p) }));
  const removePassenger = (id) => setData(d => ({ ...d, passengers: d.passengers.filter(p => p.id !== id) }));
  const clearAll = () => { if (confirm('Clear all manifest data?')) setData(defaultData); };

  const totalPassengers = data.passengers.length;
  const totalWeight = useMemo(() => data.passengers.reduce((sum,p)=> sum + (parseFloat(p.weight)||0),0), [data.passengers]);

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
      `<table><thead><tr><th>#</th><th>Name</th><th>Company</th><th>Role</th><th>Weight</th><th>Comments</th></tr></thead><tbody>`+
      data.passengers.map((p,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.company)}</td><td>${escapeHtml(p.role)}</td><td>${p.weight||''}</td><td>${escapeHtml(p.comments)}</td></tr>`).join('')+
      `</tbody></table>`+
      `<div style='margin-top:12px'><strong>Total Pax:</strong> ${totalPassengers} &nbsp; <strong>Total Weight:</strong> ${totalWeight.toFixed(1)}</div>`+
      `</body></html>`;
    w.document.write(html); w.document.close(); w.print();
  };

  return (
    <div style={{ background: theme.background, color: theme.text, minHeight:'100vh', padding:'24px 26px 80px' }}>
      <h2 style={{ marginTop:0 }}>Flight Manifest Template</h2>
      <div style={{ fontSize:12, opacity:.75, marginBottom:16 }}>Draft and store a manifest template. Auto-saves locally; not yet integrated with planner flights.</div>
      <section style={card(theme)}>
        <div style={sectionHeader(theme)}>Flight Details</div>
        <div style={gridForm}>
          <Labeled label="Flight #"><input value={data.meta.flightNumber} onChange={e=>updateMeta('flightNumber', e.target.value)} /></Labeled>
          <Labeled label="Date"><input type="date" value={data.meta.date} onChange={e=>updateMeta('date', e.target.value)} /></Labeled>
          <Labeled label="Departure"><input value={data.meta.departure} onChange={e=>updateMeta('departure', e.target.value)} placeholder="Origin" /></Labeled>
          <Labeled label="Departure Time"><input value={data.meta.departureTime} onChange={e=>updateMeta('departureTime', e.target.value)} placeholder="HHMM" /></Labeled>
          <Labeled label="Arrival"><input value={data.meta.arrival} onChange={e=>updateMeta('arrival', e.target.value)} placeholder="Destination" /></Labeled>
          <Labeled label="Arrival Time"><input value={data.meta.arrivalTime} onChange={e=>updateMeta('arrivalTime', e.target.value)} placeholder="HHMM" /></Labeled>
          <Labeled label="Aircraft Type"><input value={data.meta.aircraftType} onChange={e=>updateMeta('aircraftType', e.target.value)} placeholder="Type" /></Labeled>
          <Labeled label="Tail #"><input value={data.meta.tailNumber} onChange={e=>updateMeta('tailNumber', e.target.value)} placeholder="Registration" /></Labeled>
          <Labeled label="Captain"><input value={data.meta.captain} onChange={e=>updateMeta('captain', e.target.value)} /></Labeled>
          <Labeled label="Co-Pilot"><input value={data.meta.coPilot} onChange={e=>updateMeta('coPilot', e.target.value)} /></Labeled>
          <Labeled label="Dispatcher"><input value={data.meta.dispatcher} onChange={e=>updateMeta('dispatcher', e.target.value)} /></Labeled>
        </div>
        <Labeled label="Notes" full>
          <textarea rows={4} value={data.meta.notes} onChange={e=>updateMeta('notes', e.target.value)} style={{ resize:'vertical' }} />
        </Labeled>
        <div style={{ fontSize:11, opacity:.6, marginTop:6 }}>{autoSaveState}</div>
      </section>
      <section style={card(theme)}>
        <div style={sectionHeader(theme)}>Passengers ({totalPassengers})</div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ borderCollapse:'collapse', width:'100%', fontSize:12 }}>
            <thead>
              <tr>
                <Th theme={theme}>#</Th>
                <Th theme={theme}>Name</Th>
                <Th theme={theme}>Company</Th>
                <Th theme={theme}>Role</Th>
                <Th theme={theme}>Weight</Th>
                <Th theme={theme}>Comments</Th>
                <Th theme={theme}>Action</Th>
              </tr>
            </thead>
            <tbody>
              {data.passengers.map((p,i)=>(
                <tr key={p.id} style={{ background: i%2? (theme.name==='Dark'? '#3d4146':'#f7f7f7'):'transparent' }}>
                  <Td>{i+1}</Td>
                  <Td><input value={p.name} onChange={e=>updatePassenger(p.id,'name',e.target.value)} placeholder="Full Name" /></Td>
                  <Td><input value={p.company} onChange={e=>updatePassenger(p.id,'company',e.target.value)} placeholder="Company" /></Td>
                  <Td><input value={p.role} onChange={e=>updatePassenger(p.id,'role',e.target.value)} placeholder="Role" /></Td>
                  <Td style={{ width:80 }}><input value={p.weight} onChange={e=>updatePassenger(p.id,'weight',e.target.value)} placeholder="lb" style={{ width:'100%' }} /></Td>
                  <Td><input value={p.comments} onChange={e=>updatePassenger(p.id,'comments',e.target.value)} placeholder="Notes" /></Td>
                  <Td><button onClick={()=>removePassenger(p.id)} style={smallBtn(theme)}>✕</button></Td>
                </tr>
              ))}
              {data.passengers.length===0 && (
                <tr><Td colSpan={7} style={{ fontStyle:'italic', opacity:.6 }}>No passengers added.</Td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ display:'flex', gap:12, marginTop:12, flexWrap:'wrap' }}>
          <button onClick={addPassenger} style={actionBtn(theme)}>Add Passenger</button>
          <button onClick={exportJSON} style={actionBtn(theme)}>Export JSON</button>
          <button onClick={printView} style={actionBtn(theme)}>Print</button>
          <button onClick={clearAll} style={{ ...actionBtn(theme), background:'#aa3333' }}>Clear All</button>
          <div style={{ marginLeft:'auto', fontSize:12, opacity:.7, display:'flex', alignItems:'center' }}>Total Weight: {totalWeight.toFixed(1)}</div>
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
