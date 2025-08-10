// CompanyTableHeader.jsx
// Renders the header row for the company table (dates and company label)

import React from 'react';
import { useTheme } from '../../ThemeContext.jsx';

export default function CompanyTableHeader({ dates }) {
  const { theme } = useTheme();
  const headerBg = theme.headerBg || theme.surface;
  const headerText = theme.headerText || theme.text;
  const borderColor = theme.name === 'Dark' ? '#bfc4ca' : '#444';
  return (
    <thead>
      <tr>
    <th style={{ minWidth: 160, textAlign: 'left', position: 'sticky', left: 0, top: 0, background: headerBg, color: headerText, zIndex: 3, borderRight: `2px solid ${borderColor}`, borderBottom: `1px solid ${borderColor}`, borderTop: `1px solid ${borderColor}`, borderLeft: `1px solid ${borderColor}` }}>
          Company
        </th>
        {dates.map(d => (
          <th
            key={d.date}
            style={{
              minWidth: 80,
              width: 80,
              position: 'sticky',
              top: 0,
              background: headerBg,
              color: headerText,
              zIndex: 2,
      border: `1px solid ${borderColor}`
            }}
          >
            {d.date}<br /><span style={{ fontSize: 'smaller' }}>{d.day}</span>
          </th>
        ))}
      </tr>
    </thead>
  );
}
