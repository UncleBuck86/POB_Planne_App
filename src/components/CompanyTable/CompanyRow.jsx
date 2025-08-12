// CompanyRow.jsx
// Renders a single company row with editable cells for each date
import React from 'react';
import { useTheme } from '../../ThemeContext.jsx';

export default function CompanyRow({ row, idx, dates, hiddenRows, lastSavedById, manualHighlights, setManualHighlights, inputRefs, pushUndo, setRowData, focusCell, hoverCell, activeCell, setHoverCell, setActiveCell }) {
  if (hiddenRows.includes(row.id)) return null; // Skip hidden rows by id
  const { theme } = useTheme();
  const borderColor = theme.name === 'Dark' ? '#bfc4ca66' : '#444';
  // Zebra banding base background for this row
  const zebraBg = idx % 2 === 1 ? (theme.name === 'Dark' ? '#3d4146' : '#f6f8f9') : theme.surface;
  const isHoverRow = hoverCell.r === idx;
  const isActiveRow = activeCell.r === idx;
  const focusRing = (isHoverRow || isActiveRow) ? (theme.name === 'Dark' ? '#3b82f640' : '#60a5fa40') : 'transparent';
  const colHighlight = (colIdx) => (hoverCell.c === colIdx || activeCell.c === colIdx);

  return (
    <tr key={row.id}
      onMouseEnter={() => setHoverCell({ r: idx, c: hoverCell.c })}
      onMouseLeave={() => setHoverCell(prev => ({ r: null, c: prev.c }))}
    >
  <td style={{ width:160, minWidth:160, maxWidth:160, textAlign: 'left', position: 'sticky', left: 0, background: zebraBg, color: theme.text, zIndex: 2, borderRight: `2px solid ${borderColor.replace('40','')}`, borderLeft: `1px solid ${borderColor.replace('40','')}`, borderBottom: `1px solid ${borderColor}`, borderTop: `1px solid ${borderColor}`, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', boxShadow: `inset 0 0 0 9999px ${isHoverRow || isActiveRow ? focusRing : 'transparent'}` }}>
        <span>{row.company}</span>
      </td>
      {dates.map((d, colIdx) => {
        const lastSavedRow = lastSavedById[row.id] || {};
        const lastSavedVal = lastSavedRow[d.date] ?? '';
  const rawVal = row[d.date];
  const currVal = rawVal === 0 ? 0 : (rawVal ?? '');
        const changed = String(currVal) !== String(lastSavedVal);
        const cellKey = `${row.id}-${d.date}`;
        const manuallyHighlighted = manualHighlights[cellKey];
        let bgColor = zebraBg;
        if (manuallyHighlighted) {
          bgColor = '#b3e5fc';
        } else if (changed) {
          bgColor = '#ffeeba';
        }
        const isDark = theme.name === 'Dark';
        const textColor = (isDark && (manuallyHighlighted || changed)) ? '#111' : theme.text;
        const isHoverCol = colHighlight(colIdx);
        const cellShadow = isHoverCol ? (theme.name === 'Dark' ? 'inset 0 0 0 9999px #3b82f612' : 'inset 0 0 0 9999px #60a5fa12') : 'none';
        const activeShadow = (activeCell.r === idx && activeCell.c === colIdx) ? (theme.name === 'Dark' ? '0 0 0 2px #3b82f6' : '0 0 0 2px #2563eb') : 'none';
        return (
          <td
            key={d.date}
            style={{ minWidth: 80, width: 80, background: bgColor, color: textColor, border: `1px solid ${borderColor}`, position:'relative', boxShadow: cellShadow }}
            onMouseEnter={() => setHoverCell({ r: idx, c: colIdx })}
            onFocus={() => setActiveCell({ r: idx, c: colIdx })}
            onClick={() => setActiveCell({ r: idx, c: colIdx })}
            onDoubleClick={() => {
              setManualHighlights(prev => {
                const next = { ...prev };
                next[cellKey] = !next[cellKey];
                return next;
              });
            }}
          >
            <input
              type="number"
              value={currVal === 0 ? '' : currVal}
              min={0}
              style={{ width: '100%', maxWidth:'60px', textAlign: 'center', background: bgColor, color: textColor, border: 'none', outline: 'none', boxShadow: activeShadow, borderRadius: 4 }}
              ref={el => {
                if (!inputRefs.current[idx]) inputRefs.current[idx] = [];
                inputRefs.current[idx][colIdx] = el;
              }}
              onChange={e => {
                pushUndo();
                const newValue = e.target.value === '' ? '' : Number(e.target.value);
                setRowData(prev => prev.map(r => (r.id === row.id ? { ...r, [d.date]: newValue } : r)));
              }}
              onKeyDown={e => {
                // Keyboard navigation between cells
                if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  focusCell(idx, colIdx + 1);
                } else if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  focusCell(idx, colIdx - 1);
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  focusCell(idx + 1, colIdx);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  focusCell(idx - 1, colIdx);
                }
              }}
            />
          </td>
        );
      })}
    </tr>
  );
}
