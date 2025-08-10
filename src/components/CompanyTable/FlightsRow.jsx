// FlightsRow.jsx
// Renders a row for flights (in or out) for each date
import React from 'react';

export default function FlightsRow({ type, dates, flights }) {
  return (
    <tr style={{ background: '#f5f5f5', fontWeight: 'bold', height: 'auto' }}>
      <td style={{ verticalAlign: 'top', position: 'sticky', left: 0, background: '#f5f5f5', zIndex: 2, borderRight: '2px solid #000' }}>{type}</td>
      {dates.map(d => (
        <td key={d.date} style={{ verticalAlign: 'top', whiteSpace: 'pre-wrap' }}>
          {flights[d.date]?.join(', ') || ''}
        </td>
      ))}
    </tr>
  );
}
