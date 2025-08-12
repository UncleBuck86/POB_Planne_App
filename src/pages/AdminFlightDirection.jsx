import React, { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../ThemeContext.jsx';
import { loadDirectionMap, saveDirectionMap, loadDefaultMode, saveDefaultMode } from '../config/flightDirectionConfig';

export default function AdminFlightDirection({ companies = [] }) {
  const { theme } = useTheme();
  const [defaultMode, setDefaultMode] = useState(loadDefaultMode());
  const [dirMap, setDirMap] = useState(() => loadDirectionMap());

  useEffect(() => { saveDefaultMode(defaultMode); }, [defaultMode]);
  useEffect(() => { saveDirectionMap(dirMap); }, [dirMap]);

  const companyList = useMemo(() => {
    if (Array.isArray(companies) && companies.length) return companies;
    // Fallback: derive from stored planner data
    try {
      const stored = JSON.parse(window.localStorage.getItem('pobPlannerData')||'[]');
      return stored.map(r => r.company).filter(Boolean);
    } catch { return []; }
  }, [companies]);

  const setCompanyMode = (name, val) => {
    const key = (name||'').toLowerCase();
    setDirMap(prev => {
      const next = { ...prev };
      if (val === 'OB' || val === 'IB') next[key] = val; else delete next[key];
      return next;
    });
  };

  return (
    <section style={{ marginTop:16, border:'1px solid '+(theme.name==='Dark'?'#555':'#ccc'), borderRadius:12, padding:16, background: theme.surface }}>
      <h3 style={{ marginTop:0 }}>Flight Direction Settings</h3>
      <div style={{ fontSize:12, opacity:.75, marginBottom:10 }}>Choose default direction mode and override per company as needed. OB = increases count are Outbound flights; IB = increases are Inbound.</div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <label style={{ fontSize:12, fontWeight:700 }}>Default Mode</label>
        <select value={defaultMode} onChange={e=> setDefaultMode(e.target.value)} style={{ padding:'6px 8px', border:'1px solid '+(theme.name==='Dark'?'#666':'#888'), background: theme.surface, color: theme.text, borderRadius:6 }}>
          <option value="OB">OB (increase → Outbound)</option>
          <option value="IB">IB (increase → Inbound)</option>
        </select>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:8 }}>
        <div style={{ fontSize:12, opacity:.7, fontWeight:700 }}>Company</div>
        <div style={{ fontSize:12, opacity:.7, fontWeight:700, textAlign:'center' }}>Mode</div>
        {(companyList||[]).map((c,i)=> (
          <React.Fragment key={i}>
            <div style={{ fontSize:12 }}>{c}</div>
            <div>
              <select value={dirMap[(c||'').toLowerCase()] || ''} onChange={e=> setCompanyMode(c, e.target.value)} style={{ padding:'4px 6px', border:'1px solid '+(theme.name==='Dark'?'#666':'#888'), background: theme.surface, color: theme.text, borderRadius:6 }}>
                <option value="">(default: {defaultMode})</option>
                <option value="OB">OB</option>
                <option value="IB">IB</option>
              </select>
            </div>
          </React.Fragment>
        ))}
        {(!companyList || companyList.length===0) && <div style={{ gridColumn:'1 / span 2', fontSize:12, opacity:.6 }}>(no companies detected yet)</div>}
      </div>
    </section>
  );
}
