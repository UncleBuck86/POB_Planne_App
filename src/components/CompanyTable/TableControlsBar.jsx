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
  undoStack,
  redoStack,
  pushUndo,
  setUndoStack,
  setRedoStack,
  rowData,
  localComments,
  setRowData,
  setLocalComments,
  zoom,
  setZoom,
  minZoom,
  maxZoom = 1,
  resetZoom,
  autoFit,
  toggleAutoFit,
  scrollTable
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button title="Scroll to start" onClick={() => scrollTable('start')} style={{ padding: '4px 10px', background: theme.primary, color: theme.text, border: '1px solid #bbb', borderRadius: 4 }}>{'<<'}</button>
        <button title="Scroll left" onClick={() => scrollTable('left')} style={{ padding: '4px 10px', background: theme.primary, color: theme.text, border: '1px solid #bbb', borderRadius: 4 }}>{'<'}</button>
        <button title="Scroll right" onClick={() => scrollTable('right')} style={{ padding: '4px 10px', background: theme.primary, color: theme.text, border: '1px solid #bbb', borderRadius: 4 }}>{'>'}</button>
        <button title="Scroll to end" onClick={() => scrollTable('end')} style={{ padding: '4px 10px', background: theme.primary, color: theme.text, border: '1px solid #bbb', borderRadius: 4 }}>{'>>'}</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
          title={autosave ? 'Disabled while Autosave is ON' : 'Save changes'}
        >
          Save
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '1em' }}>
          <input type="checkbox" checked={autosave} onChange={e => setAutosave(e.target.checked)} /> Autosave
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '1em' }}>
          <input type="checkbox" checked={autoHide} onChange={e => setAutoHide(e.target.checked)} /> Auto Hide
        </label>
        <span role="img" aria-label="Undo" title="Undo" style={{ cursor: undoStack.length ? 'pointer' : 'not-allowed', fontSize: '1.5em', opacity: undoStack.length ? 1 : 0.5 }} onClick={() => { if (undoStack.length > 0) { const last = undoStack[undoStack.length - 1]; setRedoStack(prev => [ ...prev, { rowData: JSON.parse(JSON.stringify(rowData)), localComments: { ...localComments } } ]); setRowData(last.rowData); setLocalComments(last.localComments); setUndoStack(prev => prev.slice(0, -1)); } }}>↩️</span>
        <span role="img" aria-label="Redo" title="Redo" style={{ cursor: redoStack.length ? 'pointer' : 'not-allowed', fontSize: '1.5em', opacity: redoStack.length ? 1 : 0.5 }} onClick={() => { if (redoStack.length > 0) { const last = redoStack[redoStack.length - 1]; setUndoStack(prev => [ ...prev, { rowData: JSON.parse(JSON.stringify(rowData)), localComments: { ...localComments } } ]); setRowData(last.rowData); setLocalComments(last.localComments); setRedoStack(prev => prev.slice(0, -1)); } }}>↪️</span>
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: 24 }}>
          <label style={{ fontWeight: 'bold', marginRight: 8 }}>Zoom:</label>
          <input
            type="range"
            min={minZoom}
            max={maxZoom}
            step={0.01}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            style={{ width: 140 }}
          />
          <span style={{ marginLeft: 8 }}>{Math.round(zoom * 100)}%</span>
          <button
            onClick={toggleAutoFit}
            style={{ marginLeft: 8, padding: '4px 10px', background: autoFit ? theme.secondary || '#555' : theme.primary, color: theme.buttonText || theme.text, border: 'none', borderRadius: 4, fontSize: '0.75em', fontWeight: 'bold' }}
            title={autoFit ? 'Click to set max frame height' : 'Click to auto-fit frame height'}
          >
            {autoFit ? 'Auto-Fit ON' : 'Auto-Fit OFF'}
          </button>
        </div>
      </div>
    </div>
  );
}
