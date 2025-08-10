// FlightsRow.jsx
// Renders a row for flights (in or out) for each date
import React from 'react';
import { useTheme } from '../../ThemeContext.jsx';

export default function FlightsRow({ type, dates, flights }) {
  const { theme } = useTheme();
  const borderColor = theme.name === 'Dark' ? '#bfc4ca40' : '#444';
  return (
    <tr style={{ background: theme.surface, color: theme.text, fontWeight: 'bold', height: 'auto' }}>
      <td style={{ verticalAlign: 'top', position: 'sticky', left: 0, background: theme.surface, color: theme.text, zIndex: 2, borderRight: `2px solid ${borderColor.replace('40','')}`, borderLeft: `1px solid ${borderColor.replace('40','')}`, borderTop: `1px solid ${borderColor}`, borderBottom: `1px solid ${borderColor}` }}>{type}</td>
      {dates.map(d => (
        <td key={d.date} style={{ verticalAlign: 'top', whiteSpace: 'pre-wrap', background: theme.surface, color: theme.text, border: `1px solid ${borderColor}` }}>
          {flights[d.date]?.join(', ') || ''}
        </td>
      ))}
    </tr>
  );
}
