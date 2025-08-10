import React, { useEffect } from 'react';
import { useTheme } from '../ThemeContext.jsx';

const ADMIN_KEY = 'pobIsAdmin';
export const isAdmin = () => {
  try { return localStorage.getItem(ADMIN_KEY) === 'true'; } catch { return false; }
};

export default function AdminPage() {
  const { theme } = useTheme();
  useEffect(()=> { if (!isAdmin()) window.location.hash = '#dashboard'; }, []);
  return (
    <div style={{ background: theme.background, color: theme.text, minHeight:'100vh', padding:'24px 26px 60px' }}>
      <h2 style={{ marginTop:0 }}>Admin Panel</h2>
      <div style={{ fontSize:12, opacity:.75, marginBottom:18 }}>Restricted utilities and configuration.</div>
      <section style={card(theme)}>
        <div style={sectionHeader(theme)}>Flight Tools</div>
        <p style={{ marginTop:0, fontSize:13, lineHeight:1.4 }}>Access the manifest template builder to prepare, export, and print flight manifests.</p>
        <a href="#manifest" style={btn(theme)}>Open Manifest Template</a>
      </section>
      <section style={card(theme)}>
        <div style={sectionHeader(theme)}>Admin Access</div>
        <p style={{ marginTop:0, fontSize:12, opacity:.7 }}>To revoke admin mode run in console:<br/><code>localStorage.removeItem('pobIsAdmin'); location.reload();</code></p>
      </section>
    </div>
  );
}

const card = (theme) => ({ background: theme.surface, border:'1px solid '+(theme.name==='Dark' ? '#555':'#ccc'), borderRadius:12, padding:'16px 18px 18px', marginBottom:28, boxShadow:'0 4px 10px rgba(0,0,0,0.25)' });
const sectionHeader = (theme) => ({ fontSize:15, fontWeight:700, marginBottom:10, paddingBottom:4, borderBottom:'2px solid '+(theme.primary||'#267') });
const btn = (theme) => ({ display:'inline-block', background: theme.primary, color: theme.text, textDecoration:'none', fontWeight:600, padding:'10px 16px', borderRadius:8, border:'1px solid '+(theme.secondary||'#222'), boxShadow:'0 2px 6px rgba(0,0,0,0.3)', fontSize:13 });
