// CommentsRow.jsx
// Renders the comments row for user input, one cell per date
import React from 'react';
import { useTheme } from '../../ThemeContext.jsx';

export default function CommentsRow({ dates, comments, lastSavedComments, manualHighlights, setComments, pushUndo }) {
  const { theme } = useTheme();
  const isDark = theme.name === 'Dark' || (theme.background || '').toLowerCase() === '#22223b';
  const borderColor = theme.name === 'Dark' ? '#bfc4ca40' : '#444';
  return (
    <tr style={{ background: theme.surface, color: theme.text, fontStyle: 'italic', height: 'auto' }}>
      <td style={{ verticalAlign: 'top', position: 'sticky', left: 0, background: theme.surface, color: theme.text, zIndex: 2, borderRight: `2px solid ${borderColor.replace('40','')}`, borderLeft: `1px solid ${borderColor.replace('40','')}`, borderTop: `1px solid ${borderColor}`, borderBottom: `1px solid ${borderColor}` }}>Comments</td>
      {dates.map(d => (
        <td key={d.date} style={{ verticalAlign: 'top', whiteSpace: 'pre-wrap', background: theme.surface, color: theme.text, border: `1px solid ${borderColor}` }}>
          <textarea
            value={comments[d.date] || ''}
            style={{
              width: '100%',
              minHeight: '48px',
              fontStyle: 'italic',
              background: manualHighlights[`comment-${d.date}`]
                ? '#b3e5fc'
                : isDark
                  ? theme.surface // keep same as chart regardless of unsaved change
                  : comments[d.date] !== (lastSavedComments[d.date] || '')
                    ? '#fffbe6'
                    : theme.surface,
              color: theme.text,
              border: '1px solid transparent',
              padding: '4px 6px',
              marginBottom: '4px',
              resize: 'none',
              boxSizing: 'border-box',
              overflow: 'hidden',
              height: 'auto',
              maxHeight: '300px'
            }}
            onChange={e => {
              pushUndo();
              const val = e.target.value;
              setComments(prev => ({ ...prev, [d.date]: val }));
              const ta = e.target;
              ta.style.height = 'auto';
              ta.style.height = `${ta.scrollHeight}px`;
            }}
            onInput={e => {
              const ta = e.target;
              ta.style.height = 'auto';
              ta.style.height = `${ta.scrollHeight}px`;
            }}
            onDoubleClick={() => {
              const key = `comment-${d.date}`;
              manualHighlights[key] = !manualHighlights[key]; // Toggle highlight
            }}
          />
        </td>
      ))}
    </tr>
  );
}
