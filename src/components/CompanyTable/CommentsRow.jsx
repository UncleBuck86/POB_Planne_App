// CommentsRow.jsx
// Renders the comments row for user input, one cell per date
import React from 'react';

export default function CommentsRow({ dates, comments, lastSavedComments, manualHighlights, setComments, pushUndo }) {
  return (
    <tr style={{ background: '#f0f0f0', fontStyle: 'italic', height: 'auto' }}>
      <td style={{ verticalAlign: 'top', position: 'sticky', left: 0, background: '#f0f0f0', zIndex: 2, borderRight: '2px solid #000' }}>Comments</td>
      {dates.map(d => (
        <td key={d.date} style={{ verticalAlign: 'top', whiteSpace: 'pre-wrap' }}>
          <textarea
            value={comments[d.date] || ''}
            style={{
              width: '100%',
              minHeight: '48px',
              fontStyle: 'italic',
              background:
                manualHighlights[`comment-${d.date}`]
                  ? '#b3e5fc'
                  : comments[d.date] !== (lastSavedComments[d.date] || '')
                    ? '#fffbe6'
                    : '#f9f9f9',
              border: '1px solid #ccc',
              padding: '4px 6px',
              marginBottom: '4px',
              resize: 'none',
              boxSizing: 'border-box',
              overflow: 'hidden'
            }}
            onChange={e => {
              pushUndo();
              const val = e.target.value;
              setComments(prev => ({ ...prev, [d.date]: val }));
              const ta = e.target;
              ta.style.height = 'auto';
              ta.style.height = `${ta.scrollHeight}px`;
            }}
            onDoubleClick={() => {
              const key = `comment-${d.date}`;
              manualHighlights[key] = !manualHighlights[key]; // Toggle highlight
            }}
            rows={1}
            ref={el => {
              if (el) {
                el.style.height = 'auto';
                el.style.height = `${el.scrollHeight}px`;
              }
            }}
          />
        </td>
      ))}
    </tr>
  );
}
