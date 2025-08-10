import React, { useMemo } from 'react';
import { useTheme } from '../ThemeContext.jsx';

const CATALOG_KEY = 'flightManifestCatalogV1';

export default function FlightManifestView() {
  const { theme } = useTheme();
  const hash = window.location.hash; // #manifest-view/<id>
  const id = hash.split('/')[1] || ''; // after manifest-view/
  const catalog = useMemo(()=> { try { return JSON.parse(localStorage.getItem(CATALOG_KEY))||[]; } catch { return []; } }, []);
  const entry = catalog.find(e=> e.id === id);
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

  const editManifest = () => {
    try {
      localStorage.setItem('flightManifestTemplateV1', JSON.stringify({ meta: entry.meta, outbound: entry.outbound, inbound: entry.inbound }));
    } catch {/* ignore */}
    window.location.hash = '#manifest';
  };

  return (
    <div style={{ padding:'24px 26px 80px', minHeight:'100vh', background: theme.background, color: theme.text }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
        {backBtn}
        <h2 style={{ margin:'0 0 4px' }}>Saved Flight Manifest</h2>
        <div style={{ marginLeft:'auto', display:'flex', gap:10 }}>
          <button onClick={editManifest} style={actionBtn(theme)}>Edit</button>
        </div>
      </div>
      <div style={{ fontSize:12, opacity:.7, marginBottom:18 }}>Read-only view of a saved manifest. Use Edit to modify in template.</div>
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
        <PassengerTable list={outbound} dir="outbound" theme={theme} />
        <TotalsBar theme={theme} label="Outbound Weight" weight={outboundWt} />
      </section>
      <section style={card(theme)}>
        <div style={sectionHeader(theme)}>Inbound Passengers ({totalInbound})</div>
        <PassengerTable list={inbound} dir="inbound" theme={theme} />
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
    </div>
  );
}

function PassengerTable({ list, dir, theme }) {
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ borderCollapse:'collapse', width:'100%', fontSize:12 }}>
        <thead>
          <tr style={{ background: theme.primary, color: theme.text }}>
            {['#','Name','Company','Body Wt','Bag Wt','# Bags','Total Wt','Origin','Destination','Comments'].map(h=> <th key={h} style={{ padding:'6px 8px', textAlign:'left', border:'1px solid '+(theme.name==='Dark'? '#444':'#666'), fontSize:11 }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {list.length===0 && <tr><td colSpan={10} style={{ padding:10, fontStyle:'italic', opacity:.6 }}>None</td></tr>}
          {list.map((p,i)=> {
            const bw = parseFloat(p.bodyWeight)||0; const gw = parseFloat(p.bagWeight)||0; const total = bw+gw;
            return (
              <tr key={p.id} style={{ background: i%2? (theme.name==='Dark'? '#3d4146':'#f6f8f9'):'transparent' }}>
                <td style={tdStyle}>{i+1}</td>
                <td style={tdStyle}>{p.name}</td>
                <td style={tdStyle}>{p.company}</td>
                <td style={{ ...tdStyle, textAlign:'center' }}>{p.bodyWeight}</td>
                <td style={{ ...tdStyle, textAlign:'center' }}>{p.bagWeight}</td>
                <td style={{ ...tdStyle, textAlign:'center' }}>{p.bagCount}</td>
                <td style={{ ...tdStyle, fontWeight:600, textAlign:'center' }}>{total? total.toFixed(0): ''}</td>
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
