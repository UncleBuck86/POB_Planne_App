import React, { useMemo, useState, useEffect } from 'react';
import { sanitizeManifestForExport } from '../utils/privacy.js';
import { useTheme } from '../ThemeContext.jsx';
import { storage } from '../utils/storageAdapter';

const CATALOG_KEY = 'flightManifestCatalogV1';

export default function FlightManifestView() {
  const { theme } = useTheme();
  const hash = window.location.hash; // #logistics/manifest-view/<id> OR legacy #manifest-view/<id>
  const parts = hash.replace('#','').split('/');
  // legacy pattern: ['manifest-view','<id>'] new: ['logistics','manifest-view','<id>']
  const id = parts[0]==='logistics' ? (parts[2]||'') : (parts[1]||'');
  const [catalog, setCatalog] = useState(()=> storage.getJSON(CATALOG_KEY, []));
  useEffect(()=>{ try { storage.setJSON(CATALOG_KEY, catalog); } catch {/* ignore */} }, [catalog]);
  const entry = catalog.find(e=> e.id === id);
  const [showWeights, setShowWeights] = useState(()=> storage.getBool('manifestViewShowWeights', true));
  useEffect(()=>{ try { storage.setBool('manifestViewShowWeights', !!showWeights); } catch {/* ignore */} }, [showWeights]);
  // Capacity badge (if aircraft type defined and limits exist)
  const aircraftTypes = useMemo(()=> storage.getJSON('flightManifestAircraftTypes', []), []);
  const capacity = useMemo(()=>{
    if(!entry) return null;
    const type = aircraftTypes.find(a=> a.type === entry.meta?.aircraftType);
    if(!type) return null;
    const maxPax = parseInt(type.maxPax)||null;
    const maxOB = parseFloat(type.maxOutboundWeight)||null;
    const maxIB = parseFloat(type.maxInboundWeight)||null;
    const pax = (entry.outbound?.length||0)+(entry.inbound?.length||0);
    const sumWt = (list)=> list.reduce((s,p)=> s + ((parseFloat(p.bodyWeight)||0)+(parseFloat(p.bagWeight)||0)),0);
    const obWt = sumWt(entry.outbound||[]);
    const ibWt = sumWt(entry.inbound||[]);
    const issues = [];
    if(maxPax!=null && pax>maxPax) issues.push('PAX');
    if(maxOB!=null && obWt>maxOB) issues.push('OB WT');
    if(maxIB!=null && ibWt>maxIB) issues.push('IB WT');
    return { maxPax, maxOB, maxIB, pax, obWt, ibWt, issues };
  }, [entry, aircraftTypes]);
  const backBtn = (
    <button onClick={()=> window.location.hash = '#logistics/flights'} style={backStyle(theme)}>← Flights</button>
  );
  if(!entry) {
    return (
      <div style={{ padding:24, minHeight:'100vh', background: theme.background, color: theme.text }}>
        {backBtn}
        <h2 style={{ margin:'12px 0 4px' }}>Manifest Not Found</h2>
        <div style={{ fontSize:13, opacity:.7 }}>The saved manifest could not be located. It may have been deleted.</div>
      </div>
    );
  }
  const outbound = entry.outbound||[];
  const inbound = entry.inbound||[];
  const totalOutbound = outbound.length;
  const totalInbound = inbound.length;
  const sumWeight = (list)=> list.reduce((s,p)=> s + ((parseFloat(p.bodyWeight)||0)+(parseFloat(p.bagWeight)||0)),0);
  const outboundWt = sumWeight(outbound);
  const inboundWt = sumWeight(inbound);
  const totalPax = totalOutbound + totalInbound;
  const totalWt = outboundWt + inboundWt;
  const [exportIncludeComments, setExportIncludeComments] = useState(false);
  // Print options (persisted)
  const defaultPrint = { includeWeights: true, includeComments: true, compact: false, landscape: false, includeNotes: true, includeTotals: true };
  const [printOptions, setPrintOptions] = useState(()=> { try { return { ...defaultPrint, ...(storage.getJSON('printOptionsManifest', {})||{}) }; } catch { return defaultPrint; } });
  const [showPrintOpts, setShowPrintOpts] = useState(false);
  useEffect(()=>{ try { storage.setJSON('printOptionsManifest', printOptions); } catch {/* ignore */} }, [printOptions]);

  const editManifest = () => {
    try {
      storage.setJSON('flightManifestTemplateV1', { meta: entry.meta, outbound: entry.outbound, inbound: entry.inbound });
    } catch {/* ignore */}
  window.location.hash = '#logistics/manifest';
  };
  const exportJSON = () => {
    try {
      const safe = sanitizeManifestForExport({ meta: entry.meta, outbound: entry.outbound, inbound: entry.inbound }, { includeComments: exportIncludeComments });
      const blob = new Blob([JSON.stringify(safe, null, 2)], { type:'application/json' });
      const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`manifest-${entry.meta.flightNumber||'saved'}.json`; a.click(); URL.revokeObjectURL(url);
    } catch {/* ignore */}
  };
  const copyJSON = () => {
    try {
      const safe = sanitizeManifestForExport({ meta: entry.meta, outbound: entry.outbound, inbound: entry.inbound }, { includeComments: exportIncludeComments });
      const txt = JSON.stringify(safe, null, 2);
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt);
      else {
        const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      }
    } catch {/* ignore */}
  };
  const csvEscape = (v='') => {
    const s = String(v??'');
    if (/[",\n]/.test(s)) return '"'+s.replace(/"/g,'""')+'"';
    return s;
  };
  const exportCSV = (dir) => {
    if(!entry) return;
    const list = (dir==='outbound'? (entry.outbound||[]) : (entry.inbound||[]));
    const isOB = dir==='outbound';
    const headers = exportIncludeComments ? ['#','Name','Company','Body Wt','Bag Wt','# Bags','Total Wt','Origin','Destination','Comments'] : ['#','Name','Company','Body Wt','Bag Wt','# Bags','Total Wt','Origin','Destination'];
    const rows = list.map((p,i)=>{
      const bw = parseFloat(p.bodyWeight)||0; const gw = parseFloat(p.bagWeight)||0; const tot = bw + gw;
      const origin = p.origin || (isOB? entry.meta.departure : entry.meta.arrival) || '';
      const dest = p.destination || (isOB? entry.meta.arrival : entry.meta.departure) || '';
      const base = [i+1, p.name||'', p.company||'', p.bodyWeight||'', p.bagWeight||'', p.bagCount||'', tot? tot.toFixed(1):'', origin, dest];
      if (exportIncludeComments) base.push(p.comments||'');
      return base.map(csvEscape).join(',');
    });
    const content = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([content], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`manifest-${entry.meta.flightNumber||'saved'}-${isOB? 'outbound':'inbound'}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  const printManifest = () => {
    const opts = printOptions || defaultPrint;
    const w = window.open('', '_blank'); if(!w) return;
    const baseCss = `body{font-family:Segoe UI,Arial,sans-serif;padding:16px;}${opts.compact? 'body{font-size:12px;} table{font-size:10px;} th,td{padding:3px 4px;}':'body{font-size:14px;} table{font-size:12px;} th,td{padding:4px 6px;}'} table{border-collapse:collapse;width:100%;} th,td{border:1px solid #444;} th{background:#ddd;} @page{${opts.landscape? 'size: landscape;':''} margin:12mm;}`;
    const sumWt = (list)=> list.reduce((s,p)=> s + ((parseFloat(p.bodyWeight)||0)+(parseFloat(p.bagWeight)||0)),0);
    const outboundWt = sumWt(entry.outbound||[]).toFixed(1);
    const inboundWt = sumWt(entry.inbound||[]).toFixed(1);
    const totalWt = (parseFloat(outboundWt)+parseFloat(inboundWt)).toFixed(1);
    const header = `<h2>Flight Manifest ${entry.meta.flightNumber? ' - '+entry.meta.flightNumber:''}</h2>`+
      `<div><strong>Date:</strong> ${entry.meta.date||''} &nbsp; <strong>Route:</strong> ${entry.meta.departure||''} → ${entry.meta.arrival||''}</div>`+
      `<div style='margin-top:4px'><strong>Aircraft:</strong> ${entry.meta.aircraftType||''} ${entry.meta.tailNumber||''}</div>`+
      (opts.includeNotes && entry.meta.notes? `<div style='margin-top:10px;white-space:pre-wrap'><strong>Notes:</strong> ${entry.meta.notes.replace(/</g,'&lt;')}</div>`:'');
    const totals = opts.includeTotals ? `<div style='margin-top:14px'><strong>Total Pax:</strong> ${(entry.outbound.length+entry.inbound.length)}${opts.includeWeights? ` &nbsp; <strong>Total Weight:</strong> ${totalWt}`:''}</div>` : '';
    const html = `<!DOCTYPE html><html><head><title>Manifest ${entry.meta.flightNumber||''}</title><style>${baseCss}</style></head><body>`+
      header +
      `<h3 style='margin-top:16px'>Outbound (${entry.outbound.length})</h3>`+
      renderPrintTable(entry.outbound||[], { includeWeights: opts.includeWeights, includeComments: opts.includeComments }, entry.meta.departure, entry.meta.arrival)+
      `<h3 style='margin-top:16px'>Inbound (${entry.inbound.length})</h3>`+
      renderPrintTable(entry.inbound||[], { includeWeights: opts.includeWeights, includeComments: opts.includeComments }, entry.meta.arrival, entry.meta.departure)+
      totals +
      `</body></html>`;
    w.document.write(html); w.document.close(); w.print();
  };
  const duplicateManifest = () => {
    if(!entry) return; const copy={ ...entry, id: crypto.randomUUID(), savedAt:new Date().toISOString() };
  delete copy.updatedAt; setCatalog(list=> [copy, ...list]); window.location.hash = '#logistics/manifest-view/'+copy.id;
  };
  const deleteManifest = () => {
    if(!entry) return; if(!window.confirm('Delete this saved manifest?')) return; setCatalog(list=> list.filter(e=> e.id!==entry.id)); window.location.hash = '#logistics/flights';
  };

  return (
    <div className="manifest-view-root" style={{ padding:'24px 26px 80px', minHeight:'100vh', background: theme.background, color: theme.text }}>
      <div className="no-print" style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
        {backBtn}
        <h2 style={{ margin:'0 0 4px' }}>Saved Flight Manifest</h2>
        <div style={{ marginLeft:'auto', display:'flex', gap:10, flexWrap:'wrap' }}>
          <button onClick={()=> setShowWeights(w=>!w)} style={actionBtn(theme)}>{showWeights? 'Hide Wt':'Show Wt'}</button>
          <button onClick={printManifest} style={actionBtn(theme)}>Print</button>
          <button onClick={()=> setShowPrintOpts(true)} style={actionBtn(theme)}>Print Options</button>
          <button onClick={exportJSON} style={actionBtn(theme)}>Export</button>
          <button onClick={()=>exportCSV('outbound')} style={actionBtn(theme)}>Export OB CSV</button>
          <button onClick={()=>exportCSV('inbound')} style={actionBtn(theme)}>Export IB CSV</button>
          <button onClick={copyJSON} style={actionBtn(theme)}>Copy</button>
          <label style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12 }}>
            <input type="checkbox" checked={exportIncludeComments} onChange={e=> setExportIncludeComments(e.target.checked)} /> Include comments in exports
          </label>
          <button onClick={duplicateManifest} style={actionBtn(theme)}>Duplicate</button>
          <button onClick={deleteManifest} style={{ ...actionBtn(theme), background:'#922' }}>Delete</button>
          <button onClick={editManifest} style={{ ...actionBtn(theme), background:'#2d6cdf' }}>Edit</button>
        </div>
      </div>
      <div style={{ fontSize:12, opacity:.7, marginBottom:18 }}>Read-only view of a saved manifest. Use Edit to modify in template.</div>
      {capacity && (
        <div style={{ margin:'-6px 0 16px', display:'flex', gap:10, flexWrap:'wrap' }}>
          <span style={{ background: capacity.issues.length? '#c8423b':'#2d7d46', color:'#fff', padding:'6px 10px', borderRadius:8, fontSize:12, fontWeight:600, display:'flex', gap:10 }}>
            {capacity.maxPax!=null && <span>Pax {capacity.pax}/{capacity.maxPax}</span>}
            {capacity.maxOB!=null && <span>OB {capacity.obWt.toFixed(0)}/{capacity.maxOB}</span>}
            {capacity.maxIB!=null && <span>IB {capacity.ibWt.toFixed(0)}/{capacity.maxIB}</span>}
            {capacity.issues.length>0 && <span style={{ textDecoration:'underline' }}>OVER</span>}
          </span>
        </div>
      )}
      <section style={card(theme)}>
        <div style={sectionHeader(theme)}>Flight Details</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12, fontSize:13 }}>
          {field('Flight #', entry.meta.flightNumber)}
          {field('Date', entry.meta.date)}
          {field('Departure', entry.meta.departure)}
          {field('Departure Time', entry.meta.departureTime)}
          {field('Arrival', entry.meta.arrival)}
          {field('Arrival Time', entry.meta.arrivalTime)}
          {field('Aircraft Type', entry.meta.aircraftType)}
          {field('Tail #', entry.meta.tailNumber)}
          {field('Captain', entry.meta.captain)}
          {field('Co-Pilot', entry.meta.coPilot)}
          {field('Dispatcher', entry.meta.dispatcher)}
        </div>
        {entry.meta.notes && <div style={{ marginTop:14 }}>
          <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'.5px', fontWeight:600, opacity:.7, marginBottom:4 }}>Notes</div>
          <div style={{ whiteSpace:'pre-wrap', fontSize:12, background: theme.name==='Dark'? '#2e3439':'#f2f7fa', padding:'10px 12px', borderRadius:8, border:'1px solid '+(theme.name==='Dark'? '#555':'#ccc') }}>{entry.meta.notes}</div>
        </div>}
      </section>
      <section style={card(theme)}>
        <div style={sectionHeader(theme)}>Outbound Passengers ({totalOutbound})</div>
  <PassengerTable list={outbound} dir="outbound" theme={theme} showWeights={showWeights} />
        <TotalsBar theme={theme} label="Outbound Weight" weight={outboundWt} />
      </section>
      <section style={card(theme)}>
        <div style={sectionHeader(theme)}>Inbound Passengers ({totalInbound})</div>
  <PassengerTable list={inbound} dir="inbound" theme={theme} showWeights={showWeights} />
        <TotalsBar theme={theme} label="Inbound Weight" weight={inboundWt} />
      </section>
      <section style={card(theme)}>
        <div style={sectionHeader(theme)}>Totals</div>
        <div style={{ fontSize:13, display:'flex', gap:30, flexWrap:'wrap' }}>
          <span><strong>Total Pax:</strong> {totalPax}</span>
          <span><strong>Total Weight:</strong> {totalWt.toFixed(1)}</span>
          <span><strong>Outbound Wt:</strong> {outboundWt.toFixed(1)}</span>
          <span><strong>Inbound Wt:</strong> {inboundWt.toFixed(1)}</span>
        </div>
      </section>
      {showPrintOpts && (
        <div className="no-print" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:900, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={e=>{ if(e.target===e.currentTarget) setShowPrintOpts(false); }}>
          <div style={{ background: theme.surface, color: theme.text, width:'min(420px,90%)', border:'1px solid '+(theme.name==='Dark'? '#555':'#444'), borderRadius:12, padding:16, boxShadow:'0 8px 24px rgba(0,0,0,0.45)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <div style={{ fontWeight:700 }}>Print Options</div>
              <button onClick={()=> setShowPrintOpts(false)} style={actionBtn(theme)}>Close</button>
            </div>
            <div style={{ display:'grid', gap:8 }}>
              <label style={{ fontSize:12 }}><input type="checkbox" checked={!!printOptions.includeWeights} onChange={e=> setPrintOptions(o=> ({ ...o, includeWeights: e.target.checked }))} /> Include weights</label>
              <label style={{ fontSize:12 }}><input type="checkbox" checked={!!printOptions.includeComments} onChange={e=> setPrintOptions(o=> ({ ...o, includeComments: e.target.checked }))} /> Include comments</label>
              <label style={{ fontSize:12 }}><input type="checkbox" checked={!!printOptions.includeNotes} onChange={e=> setPrintOptions(o=> ({ ...o, includeNotes: e.target.checked }))} /> Include notes</label>
              <label style={{ fontSize:12 }}><input type="checkbox" checked={!!printOptions.includeTotals} onChange={e=> setPrintOptions(o=> ({ ...o, includeTotals: e.target.checked }))} /> Include totals</label>
              <label style={{ fontSize:12 }}><input type="checkbox" checked={!!printOptions.compact} onChange={e=> setPrintOptions(o=> ({ ...o, compact: e.target.checked }))} /> Compact layout</label>
              <label style={{ fontSize:12 }}><input type="checkbox" checked={!!printOptions.landscape} onChange={e=> setPrintOptions(o=> ({ ...o, landscape: e.target.checked }))} /> Landscape</label>
            </div>
            <div style={{ marginTop:12, display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={()=> setShowPrintOpts(false)} style={actionBtn(theme)}>Save</button>
              <button onClick={()=> { setShowPrintOpts(false); printManifest(); }} style={actionBtn(theme)}>Print Now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PassengerTable({ list, dir, theme, showWeights }) {
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ borderCollapse:'collapse', width:'100%', fontSize:12 }}>
        <thead>
          <tr style={{ background: theme.primary, color: theme.text }}>
            <th style={thStyle(theme)}>#</th>
            <th style={thStyle(theme)}>Name</th>
            <th style={thStyle(theme)}>Company</th>
            {showWeights && <th style={thStyle(theme)}>Body Wt</th>}
            {showWeights && <th style={thStyle(theme)}>Bag Wt</th>}
            {showWeights && <th style={thStyle(theme)}># Bags</th>}
            {showWeights && <th style={thStyle(theme)}>Total Wt</th>}
            <th style={thStyle(theme)}>Origin</th>
            <th style={thStyle(theme)}>Destination</th>
            <th style={thStyle(theme)}>Comments</th>
          </tr>
        </thead>
        <tbody>
          {list.length===0 && <tr><td colSpan={showWeights?10:6} style={{ padding:10, fontStyle:'italic', opacity:.6 }}>None</td></tr>}
          {list.map((p,i)=> {
            const bw = parseFloat(p.bodyWeight)||0; const gw = parseFloat(p.bagWeight)||0; const total = bw+gw;
            return (
              <tr key={p.id} style={{ background: i%2? (theme.name==='Dark'? '#3d4146':'#f6f8f9'):'transparent' }}>
                <td style={tdStyle}>{i+1}</td>
                <td style={tdStyle}>{p.name}</td>
                <td style={tdStyle}>{p.company}</td>
                {showWeights && <td style={{ ...tdStyle, textAlign:'center' }}>{p.bodyWeight}</td>}
                {showWeights && <td style={{ ...tdStyle, textAlign:'center' }}>{p.bagWeight}</td>}
                {showWeights && <td style={{ ...tdStyle, textAlign:'center' }}>{p.bagCount}</td>}
                {showWeights && <td style={{ ...tdStyle, fontWeight:600, textAlign:'center' }}>{total? total.toFixed(0): ''}</td>}
                <td style={tdStyle}>{p.origin}</td>
                <td style={tdStyle}>{p.destination}</td>
                <td style={tdStyle}>{p.comments}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TotalsBar({ theme, label, weight }) {
  return (
    <div style={{ marginTop:10, fontSize:12, opacity:.85 }}><strong>{label}:</strong> {weight.toFixed(1)}</div>
  );
}

const field = (label, value) => (
  <div>
    <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.5px', fontWeight:600, opacity:.65, marginBottom:2 }}>{label}</div>
    <div style={{ fontSize:13 }}>{value || <span style={{ opacity:.4 }}>—</span>}</div>
  </div>
);

const card = (theme) => ({ background: theme.surface, border:'1px solid '+(theme.name==='Dark'? '#555':'#ccc'), borderRadius:12, padding:'16px 18px 20px', marginBottom:28, boxShadow:'0 4px 12px rgba(0,0,0,0.25)' });
const sectionHeader = (theme) => ({ fontSize:16, fontWeight:700, marginBottom:14, paddingBottom:6, borderBottom:'2px solid '+(theme.primary||'#267') });
const actionBtn = (theme) => ({ background: theme.primary, color: theme.text, border:'1px solid '+(theme.secondary||'#222'), padding:'6px 12px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600, boxShadow:'0 2px 4px rgba(0,0,0,0.3)' });
const backStyle = (theme) => ({ background: theme.name==='Dark'? '#333b42':'#d8e2ea', color: theme.text, border:'1px solid '+(theme.name==='Dark'? '#555':'#888'), padding:'6px 12px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600 });
const tdStyle = { padding:'4px 6px', border:'1px solid #555' };
const thStyle = (theme) => ({ padding:'6px 8px', textAlign:'left', border:'1px solid '+(theme.name==='Dark'? '#666':'#666'), fontSize:11 });

// Helper for print
function renderPrintTable(list, label, origin, destination){
  const rows = list.map((p,i)=>{
    const bw=parseFloat(p.bodyWeight)||0; const gw=parseFloat(p.bagWeight)||0; const tot=bw+gw; return `<tr><td>${i+1}</td><td>${escapeHtml(p.name||'')}</td><td>${escapeHtml(p.company||'')}</td><td>${p.bodyWeight||''}</td><td>${p.bagWeight||''}</td><td>${p.bagCount||''}</td><td>${tot?tot:''}</td><td>${escapeHtml(p.origin||origin||'')}</td><td>${escapeHtml(p.destination||destination||'')}</td><td>${escapeHtml(p.comments||'')}</td></tr>`;
  }).join('');
  return `<table><thead><tr><th>#</th><th>Name</th><th>Company</th><th>Body Wt</th><th>Bag Wt</th><th>#</th><th>Total</th><th>Origin</th><th>Destination</th><th>Comments</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function escapeHtml(str=''){ return str.replace(/[&<>"]?/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]||c)); }
