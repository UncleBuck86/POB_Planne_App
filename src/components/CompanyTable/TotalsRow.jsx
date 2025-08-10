// TotalsRow.jsx
// Renders the totals row for daily POB (person on board) counts
import React from 'react';
import { useTheme } from '../../ThemeContext.jsx';

export default function TotalsRow({ rowData, dates }) {
  const { theme } = useTheme();
  return (
    <tr style={{ background: theme.surface, color: theme.text, fontWeight: 'bold' }}>
      <td style={{ position: 'sticky', left: 0, background: theme.surface, color: theme.text, zIndex: 2, borderRight: '2px solid #000' }}>Total Daily POB</td>
      {dates.map(d => {
        // Sum all company values for this date
        const total = rowData.reduce((sum, row) => sum + (Number(row[d.date]) || 0), 0);
        return <td key={d.date} style={{ background: theme.surface, color: theme.text }}>{total}</td>;
      })}
    </tr>
  );
}
