// TableControlsBar.jsx
// Renders the controls bar for the company table (scroll, save, autosave, auto-hide, undo/redo, zoom slider)
import React from 'react';

export default function TableControlsBar({
  theme,
  autosave,
  setAutosave,
  autoHide,
  setAutoHide,
  handleSave,
  saveMsg,
  unsaved,
  undoStack,
  redoStack,
  pushUndo,
  setUndoStack,
  setRedoStack,
  rowData,
  localComments,
  setRowData,
  setLocalComments,
  // zoom slider removed
  scrollTable,
  // onBulkImport removed
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }} role="toolbar" aria-label="Table controls">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button title="Scroll to start" aria-label="Scroll to start" onClick={() => scrollTable('start')} style={{ padding: '4px 10px', background: theme.primary, color: theme.text, border: '1px solid #bbb', borderRadius: 4 }}>{'<<'}</button>
        <button title="Scroll left" aria-label="Scroll left" onClick={() => scrollTable('left')} style={{ padding: '4px 10px', background: theme.primary, color: theme.text, border: '1px solid #bbb', borderRadius: 4 }}>{'<'}</button>
        <button title="Scroll right" aria-label="Scroll right" onClick={() => scrollTable('right')} style={{ padding: '4px 10px', background: theme.primary, color: theme.text, border: '1px solid #bbb', borderRadius: 4 }}>{'>'}</button>
        <button title="Scroll to end" aria-label="Scroll to end" onClick={() => scrollTable('end')} style={{ padding: '4px 10px', background: theme.primary, color: theme.text, border: '1px solid #bbb', borderRadius: 4 }}>{'>>'}</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span aria-live="polite" style={{
          fontSize: 12,
          fontWeight: 700,
          padding: '4px 10px',
          borderRadius: 999,
          color: '#fff',
          background: unsaved ? '#d97706' : '#10b981',
          border: '1px solid ' + (unsaved ? '#b45309' : '#059669')
        }} title={unsaved ? 'There are unsaved changes' : 'All changes saved'}>
          {unsaved ? 'Unsaved' : 'Saved'}
        </span>
        <button
          onClick={handleSave}
          disabled={autosave}
          style={{
            fontSize: '1em',
            padding: '6px 18px',
            background: autosave
              ? 'repeating-linear-gradient(135deg, #c2c2c2 0 8px, #b5b5b5 8px 16px)'
              : theme.primary,
            color: autosave ? '#333' : (theme.buttonText || theme.text),
            border: '1px solid ' + (autosave ? '#999' : theme.primary),
            borderRadius: 4,
            position: 'relative',
            cursor: autosave ? 'not-allowed' : 'pointer',
            opacity: autosave ? 0.85 : 1,
            fontWeight: autosave ? '600' : 'bold',
            letterSpacing: '0.5px'
          }}
          title={autosave ? 'Disabled while Autosave is ON' : 'Save changes (Ctrl/Cmd+S)'}
        >
          Save
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '1em' }}>
          <input type="checkbox" checked={autosave} onChange={e => setAutosave(e.target.checked)} /> Autosave
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '1em' }} title="When enabled, hides all dates prior to today so the view starts at today's column.">
          <input type="checkbox" checked={autoHide} onChange={e => setAutoHide(e.target.checked)} /> Auto Hide
        </label>
  {/* Bulk Import button removed from planner controls */}
        <span role="img" aria-label="Undo" title="Undo" style={{ cursor: undoStack.length ? 'pointer' : 'not-allowed', fontSize: '1.5em', opacity: undoStack.length ? 1 : 0.5 }} onClick={() => { if (undoStack.length > 0) { const last = undoStack[undoStack.length - 1]; setRedoStack(prev => [ ...prev, { rowData: JSON.parse(JSON.stringify(rowData)), localComments: { ...localComments } } ]); setRowData(last.rowData); setLocalComments(last.localComments); setUndoStack(prev => prev.slice(0, -1)); } }}>↩️</span>
        <span role="img" aria-label="Redo" title="Redo" style={{ cursor: redoStack.length ? 'pointer' : 'not-allowed', fontSize: '1.5em', opacity: redoStack.length ? 1 : 0.5 }} onClick={() => { if (redoStack.length > 0) { const last = redoStack[redoStack.length - 1]; setUndoStack(prev => [ ...prev, { rowData: JSON.parse(JSON.stringify(rowData)), localComments: { ...localComments } } ]); setRowData(last.rowData); setLocalComments(last.localComments); setRedoStack(prev => prev.slice(0, -1)); } }}>↪️</span>
  {/* Zoom slider removed */}
      </div>
    </div>
  );
}
