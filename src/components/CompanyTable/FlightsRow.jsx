// FlightsRow.jsx
// Renders a row for flights (in or out) for each date
import React from 'react';
import { useTheme } from '../../ThemeContext.jsx';

export default function FlightsRow({ type, dates, flights }) {
  const { theme } = useTheme();
  return (
    <tr style={{ background: theme.surface, color: theme.text, fontWeight: 'bold', height: 'auto' }}>
      <td style={{ verticalAlign: 'top', position: 'sticky', left: 0, background: theme.surface, color: theme.text, zIndex: 2, borderRight: '2px solid #000' }}>{type}</td>
      {dates.map(d => (
        <td key={d.date} style={{ verticalAlign: 'top', whiteSpace: 'pre-wrap', background: theme.surface, color: theme.text }}>
          {flights[d.date]?.join(', ') || ''}
        </td>
      ))}
    </tr>
  );
}
