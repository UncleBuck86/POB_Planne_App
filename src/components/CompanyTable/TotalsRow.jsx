// TotalsRow.jsx
// Renders the totals row for daily POB (person on board) counts
import React from 'react';
import { useTheme } from '../../ThemeContext.jsx';

export default function TotalsRow({ rowData, dates }) {
  const { theme } = useTheme();
  const borderColor = theme.name === 'Dark' ? '#bfc4ca40' : '#444';
  return (
    <tr style={{ background: theme.surface, color: theme.text, fontWeight: 'bold', position:'sticky', bottom:0, zIndex:4 }}>
      <td style={{ position: 'sticky', left: 0, background: theme.surface, color: theme.text, zIndex: 5, borderRight: `2px solid ${borderColor.replace('40','')}`, borderLeft: `1px solid ${borderColor.replace('40','')}`, borderTop: `1px solid ${borderColor}`, borderBottom: `1px solid ${borderColor}` }}>Total Daily POB</td>
      {dates.map(d => {
        // Sum all company values for this date
        const total = rowData.reduce((sum, row) => sum + (Number(row[d.date]) || 0), 0);
  return <td key={d.date} style={{ background: theme.surface, color: theme.text, border: `1px solid ${borderColor}` }}>{total}</td>;
      })}
    </tr>
  );
}
