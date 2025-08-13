// CompanyTableDirect.jsx - simplified direct-on-page table for comparison
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../ThemeContext.jsx';
import CompanyRowDirect from './CompanyTable/CompanyRowDirect.jsx';
import { getAllDates } from '../utils/dateUtils';

export default function CompanyTableDirect() {
  const { theme } = useTheme();
  // Pull existing planner data structure; fallback gracefully.
  const load = () => {
    try {
      const raw = localStorage.getItem('pobPlannerData');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      // Support both array-of-rows and object with companies field
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed.companies)) return parsed.companies;
      return [];
    } catch { return []; }
  };
  const [rows, setRows] = useState(load);
  // Derive rolling date window identical to main planner (-7, +28)
  const today = new Date();
  const yearDates = useMemo(()=> getAllDates(today.getFullYear()), [today.getFullYear()]);
  const defaultStart = useMemo(()=>{ const d=new Date(today); d.setDate(d.getDate()-7); return d; }, [today]);
  const defaultEnd = useMemo(()=>{ const d=new Date(today); d.setDate(d.getDate()+28); return d; }, [today]);
  const [viewStart, setViewStart] = useState(defaultStart.toISOString().split('T')[0]);
  const [viewEnd, setViewEnd] = useState(defaultEnd.toISOString().split('T')[0]);
  const visibleDates = useMemo(()=> yearDates.filter(d => {
    const dt = new Date(d.date);
    return dt >= new Date(viewStart) && dt <= new Date(viewEnd);
  }), [yearDates, viewStart, viewEnd]);
  const [manualHighlights, setManualHighlights] = useState({});
  const hiddenRows = [];
  const undoRef = useRef([]);
  const inputRefs = useRef([]);

  const lastSavedById = useMemo(()=>{
    const map = {};
    rows.forEach(r=> { if (r?.id) map[r.id]=r; });
    return map;
  }, [rows]);

  const focusCell = (ri, ci) => {
    const el = inputRefs.current?.[ri]?.[ci];
    if (el) el.focus();
  };
  const pushUndo = () => {
    undoRef.current.push(JSON.stringify(rows));
    if (undoRef.current.length > 100) undoRef.current.shift();
  };
  const undo = () => {
    if (!undoRef.current.length) return;
    const prev = undoRef.current.pop();
    try { setRows(JSON.parse(prev)); } catch {}
  };

  // Basic alpha sort
  const sortedRows = useMemo(()=>
    [...rows].sort((a,b)=> (a.company||'').localeCompare(b.company||''))
  , [rows]);

  const save = () => {
    try { localStorage.setItem('pobPlannerData', JSON.stringify(rows)); } catch {}
  };

  const borderColor = theme.name === 'Dark' ? '#bfc4ca40' : '#444';
  const borderCore = borderColor.replace('40','');

  return (
    <div style={{ padding:'4px 0 40px' }}>
      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:10, flexWrap:'wrap' }}>
        <button onClick={save}>Save Direct</button>
        <button onClick={undo} disabled={!undoRef.current.length}>Undo</button>
        <span style={{ fontSize:12, opacity:.7 }}>Direct table (no frame). Same date range logic.</span>
        <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
          <label style={{ fontSize:11 }}>Start</label>
          <input type="date" value={viewStart} onChange={e=> setViewStart(e.target.value)} />
          <label style={{ fontSize:11 }}>End</label>
          <input type="date" value={viewEnd} onChange={e=> setViewEnd(e.target.value)} />
          <button style={{ fontSize:11 }} onClick={()=> { setViewStart(defaultStart.toISOString().split('T')[0]); setViewEnd(defaultEnd.toISOString().split('T')[0]); }}>Reset</button>
        </div>
      </div>
      <div style={{ overflowX:'auto' }}>
        <table style={{ borderCollapse:'separate', borderSpacing:0, tableLayout:'fixed' }}>
          <colgroup>
            <col style={{ width:160 }} />
            {visibleDates.map(d => <col key={d.date} style={{ width:80 }} />)}
          </colgroup>
          <thead>
            <tr>
              <th style={{ width:160, minWidth:160, maxWidth:160, position:'sticky', top:0, left:0, zIndex:6, background:theme.surface, color:theme.text, padding:'4px 6px', textAlign:'left', border:`1px solid ${borderCore}`, whiteSpace:'nowrap' }}>Company</th>
              {visibleDates.map(d => (
                <th key={d.date} style={{ width:80, minWidth:80, maxWidth:80, position:'sticky', top:0, zIndex:5, background:theme.surface, color:theme.text, padding:'4px 4px', textAlign:'center', border:`1px solid ${borderColor}`, whiteSpace:'nowrap' }}>{d.labelShort || d.label || d.date}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, idx) => (
              <CompanyRowDirect
                key={row.id || idx}
                row={row}
                idx={idx}
                dates={visibleDates}
                hiddenRows={hiddenRows}
                lastSavedById={lastSavedById}
                manualHighlights={manualHighlights}
                setManualHighlights={setManualHighlights}
                inputRefs={inputRefs}
                pushUndo={pushUndo}
                setRowData={setRows}
                focusCell={focusCell}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
