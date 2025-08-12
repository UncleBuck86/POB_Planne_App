// CompanyTableHeader.jsx
// Renders the header row for the company table (dates and company label)

import React from 'react';
import { formatByPreference } from '../../utils/dateUtils.js';
import { useTheme } from '../../ThemeContext.jsx';

export default function CompanyTableHeader({ dates, todayKey, todayColumnRef, hoverCell, activeCell, setHoverCell }) {
  const { theme, dateFormat } = useTheme();
  const headerBg = theme.headerBg || theme.surface;
  const headerText = theme.headerText || theme.text;
  const borderColor = theme.name === 'Dark' ? '#bfc4ca' : '#444';
  const colOn = (ci) => hoverCell?.c === ci || activeCell?.c === ci;
  const onHeaderEnter = (ci) => setHoverCell?.({ r: -1, c: ci });
  const onHeaderLeave = () => setHoverCell?.(prev => ({ r: prev?.r ?? null, c: null }));
  return (
    <thead>
      <tr>
  <th
          onMouseEnter={()=> onHeaderEnter(-1)}
          onMouseLeave={onHeaderLeave}
          style={{ width:160, minWidth: 160, maxWidth:160, textAlign: 'left', position: 'sticky', left: 0, top: 0, background: headerBg, color: headerText, zIndex: 3, borderRight: `2px solid ${borderColor}`, borderBottom: `1px solid ${borderColor}`, borderTop: `1px solid ${borderColor}`, borderLeft: `1px solid ${borderColor}` }}>
          Company
        </th>
  {dates.map((d, colIdx) => {
          const isToday = todayKey && d.date === todayKey;
          return (
            <th
              key={d.date}
              ref={isToday ? todayColumnRef : undefined}
              onMouseEnter={()=> onHeaderEnter(colIdx)}
              onMouseLeave={onHeaderLeave}
              style={{
                minWidth: 80,
                width: 80,
                position: 'sticky',
                top: 0,
                background: headerBg,
                color: headerText,
                zIndex: 2,
                border: `1px solid ${borderColor}`,
                boxShadow: colOn(colIdx) ? (theme.name==='Dark' ? 'inset 0 -4px 0 #3b82f6, inset 0 0 0 9999px #3b82f612' : 'inset 0 -4px 0 #2563eb, inset 0 0 0 9999px #60a5fa12') : 'none'
              }}
            >
              {formatByPreference(d.date, dateFormat)}<br /><span style={{ fontSize: 'smaller' }}>{d.day}</span>
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
