// CompanyTableHeader.jsx
// Renders the header row for the company table (dates and company label)

import React from 'react';

export default function CompanyTableHeader({ dates }) {
  return (
    <thead>
      <tr>
        <th style={{ minWidth: 160, textAlign: 'left', position: 'sticky', left: 0, background: '#fff', zIndex: 2, borderRight: '2px solid #000' }}>
          Company
        </th>
        {dates.map(d => (
          <th key={d.date} style={{ minWidth: 80, width: 80, background: '#fff' }}>
            {d.date}<br /><span style={{ fontSize: 'smaller' }}>{d.day}</span>
          </th>
        ))}
      </tr>
    </thead>
  );
}
