// CompanyRow.jsx
// Renders a single company row with editable cells for each date
import React from 'react';
import { useTheme } from '../../ThemeContext.jsx';

export default function CompanyRow({ row, idx, dates, hiddenRows, lastSavedById, manualHighlights, setManualHighlights, inputRefs, pushUndo, setRowData, focusCell }) {
  if (hiddenRows.includes(row.id)) return null; // Skip hidden rows by id
  const { theme } = useTheme();
  const borderColor = theme.name === 'Dark' ? '#bfc4ca66' : '#444';
  return (
    <tr key={row.id}>
  <td style={{ width:160, minWidth:160, maxWidth:160, textAlign: 'left', position: 'sticky', left: 0, background: theme.surface, color: theme.text, zIndex: 2, borderRight: `2px solid ${borderColor.replace('40','')}`, borderLeft: `1px solid ${borderColor.replace('40','')}`, borderBottom: `1px solid ${borderColor}`, borderTop: `1px solid ${borderColor}`, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
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
        let bgColor = theme.surface;
        if (manuallyHighlighted) {
          bgColor = '#b3e5fc';
        } else if (changed) {
          bgColor = '#ffeeba';
        }
        const isDark = theme.name === 'Dark';
        const textColor = (isDark && (manuallyHighlighted || changed)) ? '#111' : theme.text;
        return (
          <td
            key={d.date}
            style={{ minWidth: 80, width: 80, background: bgColor, color: textColor, border: `1px solid ${borderColor}` }}
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
              style={{ width: '60px', textAlign: 'center', background: bgColor, color: textColor, border: 'none' }}
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
