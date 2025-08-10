import React from 'react';
import { useTheme } from '../ThemeContext.jsx';

export default function Logistics() {
  const { theme } = useTheme();
  const cards = [
  { key: 'flights', label: 'Flights', color: '#4fa8ff', hash: '#logistics/flights', desc: 'Manage flight movements, manifests, and passenger deltas.' },
  { key: 'boats', label: 'Boats', color: '#ff9a42', hash: '#logistics/boats', desc: 'Track vessel schedules, departures, and arrivals.' },
  { key: 'other', label: 'Other', color: '#35c27a', hash: '#logistics/other', desc: 'Other logistics (ground, medevac, special transport).' }
  ];
  const subPath = window.location.hash.split('/')[1] || '';
  const pageStyle = { padding:24, color: theme.text, minHeight:'100vh', background: theme.background };
  const cardStyle = (c) => ({
    width:220,
    padding:'18px 16px 20px',
  border:'1px solid '+(theme.name==='Dark' ? '#666' : '#333'),
  background: theme.name==='Dark' ? '#4a4d52' : theme.surface,
  color: theme.name==='Dark' ? theme.text : theme.text,
    borderRadius:12,
    boxShadow:'0 4px 8px rgba(0,0,0,0.35)',
    position:'relative',
    overflow:'hidden',
    cursor:'pointer',
    transition:'transform .2s, box-shadow .2s'
  });
  const Card = ({ c }) => (
    <a key={c.key} href={c.hash} style={{ textDecoration:'none', color: theme.name==='Dark' ? '#111' : theme.text }}>
      <div style={cardStyle(c)}
        onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 6px 14px rgba(0,0,0,0.35)'; }}
        onMouseLeave={e=>{ e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 8px rgba(0,0,0,0.25)'; }}
      >
  <div style={{ fontSize:20, fontWeight:700, marginBottom:6, color: c.color }}>{c.label}</div>
  <div style={{ fontSize:12, lineHeight:1.4, opacity:.85, color: theme.name==='Dark' ? '#e0e0e0' : undefined }}>{c.desc}</div>
      </div>
    </a>
  );
  if (subPath && ['flights','boats','other'].includes(subPath)) {
    return (
      <div style={pageStyle}>
        <h2 style={{ marginTop:0 }}>Logistics: {subPath.charAt(0).toUpperCase()+subPath.slice(1)}</h2>
        <div style={{ fontSize:13, opacity:.75, marginBottom:16 }}>Placeholder page for {subPath}. Build out details here.</div>
        <a href="#logistics" style={{ color: theme.primary, fontWeight:'bold', textDecoration:'none' }}>← Back to Logistics Home</a>
      </div>
    );
  }
  return (
    <div style={pageStyle}>
      <h2 style={{ marginTop:0 }}>Logistics</h2>
      <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
        {cards.map(c => <Card key={c.key} c={c} />)}
      </div>
    </div>
  );
}
