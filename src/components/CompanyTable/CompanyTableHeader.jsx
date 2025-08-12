// CompanyTableHeader.jsx
// Renders the header row for the company table (dates and company label)

import React from 'react';
import { useTheme } from '../../ThemeContext.jsx';

export default function CompanyTableHeader({ dates, todayKey, todayColumnRef }) {
  const { theme } = useTheme();
  const headerBg = theme.headerBg || theme.surface;
  const headerText = theme.headerText || theme.text;
  const borderColor = theme.name === 'Dark' ? '#bfc4ca' : '#444';
  return (
    <thead>
      <tr>
  <th style={{ width:160, minWidth: 160, maxWidth:160, textAlign: 'left', position: 'sticky', left: 0, top: 0, background: headerBg, color: headerText, zIndex: 3, borderRight: `2px solid ${borderColor}`, borderBottom: `1px solid ${borderColor}`, borderTop: `1px solid ${borderColor}`, borderLeft: `1px solid ${borderColor}` }}>
          Company
        </th>
        {dates.map(d => {
          const isToday = todayKey && d.date === todayKey;
          return (
            <th
              key={d.date}
              ref={isToday ? todayColumnRef : undefined}
              style={{
                minWidth: 80,
                width: 80,
                height: 84,
                position: 'sticky',
                top: 0,
                background: headerBg,
                color: headerText,
                zIndex: 2,
                border: `1px solid ${borderColor}`,
                padding: 0
              }}
            >
              <div style={{ position:'relative', width: '100%', height: '84px' }} title={`${d.date}${d.day ? ' • '+d.day : ''}`}>
                <div
                  style={{
                    position: 'absolute',
                    bottom: 8,
                    left: 10,
                    transform: 'rotate(-45deg)',
                    transformOrigin: 'bottom left',
                    whiteSpace: 'nowrap',
                    lineHeight: 1,
                    fontSize: 12,
                    color: headerText
                  }}
                >
                  <span>{d.date}</span>
                  {d.day ? <span style={{ opacity: 0.8, marginLeft: 6, fontSize: 11 }}>{d.day}</span> : null}
                </div>
              </div>
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
