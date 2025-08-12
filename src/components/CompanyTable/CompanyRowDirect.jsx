// CompanyRowDirect.jsx - simplified direct comparison row (no frame-specific styling)
import React from 'react';
import { useTheme } from '../../ThemeContext.jsx';

export default function CompanyRowDirect({ row, idx, dates, hiddenRows, lastSavedById, manualHighlights, setManualHighlights, inputRefs, pushUndo, setRowData, focusCell }) {
  const { theme, readOnly } = useTheme();
  if (hiddenRows.includes(row.id)) return null;
  const borderColor = theme.name === 'Dark' ? '#bfc4ca66' : '#444';
  const zebraBg = idx % 2 === 1 ? (theme.name === 'Dark' ? '#3d4146' : '#f6f8f9') : theme.surface;
  return (
    <tr>
      <td style={{ width:160, minWidth:160, maxWidth:160, textAlign:'left', position:'sticky', left:0, background:zebraBg, color:theme.text, zIndex:3, borderRight:`1px solid ${borderColor.replace('40','')}`, borderLeft:`1px solid ${borderColor.replace('40','')}`, borderBottom:`1px solid ${borderColor}`, borderTop:`1px solid ${borderColor}`, padding:'4px 6px', boxSizing:'border-box', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.company}</td>
      {dates.map((d,colIdx)=>{
        const lastSavedRow = lastSavedById[row.id] || {};
        const lastSavedVal = lastSavedRow[d.date] ?? '';
        const currVal = row[d.date] ?? '';
        const changed = String(currVal) !== String(lastSavedVal);
        const cellKey = `${row.id}-${d.date}`;
        const manuallyHighlighted = manualHighlights[cellKey];
        let bg = zebraBg;
        if (manuallyHighlighted) bg = '#b3e5fc';
        else if (changed) bg = '#ffeeba';
        const isDark = theme.name === 'Dark';
        const textColor = (isDark && (manuallyHighlighted || changed)) ? '#111' : theme.text;
        return (
          <td key={d.date} style={{ width:80, minWidth:80, maxWidth:80, background:bg, color:textColor, border:`1px solid ${borderColor}`, padding:'2px 4px', boxSizing:'border-box', textAlign:'center' }}
            onDoubleClick={()=>{
              setManualHighlights(prev=>{ const next={...prev}; next[cellKey]=!next[cellKey]; return next; });
            }}
          >
            <input type="number" value={currVal} min={0} disabled={!!readOnly} style={{ width:'100%', background:bg, color:textColor, border:'none', outline:'none', textAlign:'center', cursor: readOnly? 'not-allowed':'text', opacity: readOnly? .6:1 }}
              ref={el=>{ if(!inputRefs.current[idx]) inputRefs.current[idx]=[]; inputRefs.current[idx][colIdx]=el; }}
              onChange={e=>{ if (readOnly) return; pushUndo(); const newValue = e.target.value===''? '' : Number(e.target.value); setRowData(prev=> prev.map(r=> r.id===row.id ? { ...r, [d.date]: newValue } : r)); }}
              onKeyDown={e=>{
                if (readOnly) return;
                // Shift + Arrow behaviors: increment/decrement and Excel-like fill copy
                if (e.shiftKey) {
                  if (e.key==='ArrowUp' || e.key==='ArrowDown'){
                    e.preventDefault();
                    pushUndo();
                    setRowData(prev=> prev.map(r=>{
                      if (r.id!==row.id) return r;
                      const curr = r[d.date];
                      const base = (curr === '' || curr == null) ? 0 : Number(curr) || 0;
                      const next = e.key==='ArrowUp' ? base+1 : Math.max(0, base-1);
                      return { ...r, [d.date]: next };
                    }));
                    return;
                  }
                  if (e.key==='ArrowRight' || e.key==='ArrowLeft'){
                    e.preventDefault();
                    const targetCol = e.key==='ArrowRight' ? colIdx+1 : colIdx-1;
                    if (targetCol < 0 || targetCol >= dates.length) return;
                    const targetDate = dates[targetCol].date;
                    const sourceVal = row[d.date];
                    pushUndo();
                    setRowData(prev=> prev.map(r=> r.id===row.id ? { ...r, [targetDate]: sourceVal } : r));
                    focusCell(idx, targetCol);
                    return;
                  }
                }
                // Keyboard navigation between cells
                if(e.key==='ArrowRight'){ e.preventDefault(); focusCell(idx,colIdx+1);} 
                else if(e.key==='ArrowLeft'){ e.preventDefault(); focusCell(idx,colIdx-1);} 
                else if(e.key==='ArrowDown'){ e.preventDefault(); focusCell(idx+1,colIdx);} 
                else if(e.key==='ArrowUp'){ e.preventDefault(); focusCell(idx-1,colIdx);} 
              }}
            />
          </td>
        );
      })}
    </tr>
  );
}
