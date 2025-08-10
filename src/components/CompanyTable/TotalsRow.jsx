// TotalsRow.jsx
// Renders the totals row for daily POB (person on board) counts
import React from 'react';

export default function TotalsRow({ rowData, dates }) {
  return (
    <tr style={{ background: '#e0e0e0', fontWeight: 'bold' }}>
      <td style={{ position: 'sticky', left: 0, background: '#e0e0e0', zIndex: 2, borderRight: '2px solid #000' }}>Total Daily POB</td>
      {dates.map(d => {
        // Sum all company values for this date
        const total = rowData.reduce((sum, row) => sum + (Number(row[d.date]) || 0), 0);
        return <td key={d.date}>{total}</td>;
      })}
    </tr>
  );
}
