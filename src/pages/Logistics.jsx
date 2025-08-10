import React from 'react';
import { useTheme } from '../ThemeContext.jsx';

export default function Logistics() {
  const { theme } = useTheme();
  const cards = [
    { key: 'flights', label: 'Flights', color: '#2d6cdf', hash: '#logistics/flights', desc: 'Manage flight movements, manifests, and passenger deltas.' },
    { key: 'boats', label: 'Boats', color: '#c2571d', hash: '#logistics/boats', desc: 'Track vessel schedules, departures, and arrivals.' },
    { key: 'other', label: 'Other', color: '#7a3cc2', hash: '#logistics/other', desc: 'Other logistics (ground, medevac, special transport).' }
  ];
  const subPath = window.location.hash.split('/')[1] || '';
  if (subPath && ['flights','boats','other'].includes(subPath)) {
    return (
      <div style={{ padding: 24, color: theme.text }}>
        <h2 style={{ marginTop:0 }}>Logistics: {subPath.charAt(0).toUpperCase()+subPath.slice(1)}</h2>
        <div style={{ fontSize:13, opacity:.75, marginBottom:16 }}>Placeholder page for {subPath}. Build out details here.</div>
        <a href="#logistics" style={{ color: theme.primary, fontWeight:'bold', textDecoration:'none' }}>← Back to Logistics Home</a>
      </div>
    );
  }
  return (
    <div style={{ padding: 24, color: theme.text }}>
      <h2 style={{ marginTop:0 }}>Logistics</h2>
      <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
        {cards.map(c => (
          <a key={c.key} href={c.hash} style={{ textDecoration:'none', color: theme.text }}>
            <div style={{ width:220, padding:'18px 16px 20px', border:'1px solid '+(theme.name==='Dark' ? '#bfc4ca40':'#333'), background: theme.surface, borderRadius:12, boxShadow:'0 4px 8px rgba(0,0,0,0.25)', position:'relative', overflow:'hidden', cursor:'pointer', transition:'transform .2s, box-shadow .2s' }}
              onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 6px 14px rgba(0,0,0,0.35)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 8px rgba(0,0,0,0.25)'; }}
            >
              <div style={{ fontSize:20, fontWeight:700, marginBottom:6, color: c.color }}>{c.label}</div>
              <div style={{ fontSize:12, lineHeight:1.4, opacity:.85 }}>{c.desc}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
