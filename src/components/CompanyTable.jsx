// CompanyTable.jsx
// Main table component: manages state, layout, and connects all subcomponents
import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../ThemeContext.jsx';
import { generateFlightComments } from '../utils/generateFlightComment';
// Import subcomponents for modular table rendering
import CompanyTableHeader from './CompanyTable/CompanyTableHeader';
import CompanyRow from './CompanyTable/CompanyRow';
import CommentsRow from './CompanyTable/CommentsRow';
import FlightsRow from './CompanyTable/FlightsRow';
import TotalsRow from './CompanyTable/TotalsRow';
import EditCompaniesModal from './CompanyTable/EditCompaniesModal';

export default function CompanyTable({ rowData, setRowData, dates, comments, setComments, todayColumnRef, themeOverride = {}, editing, setEditing }) {
  // Zoom state for chart vertical size
  const [zoom, setZoom] = useState(1);
  // Calculate minimum zoom to fit all rows vertically
  const minZoom = Math.min(1, 400 / ((rowData.length + 5) * 48)); // 48px per row, 5 extra rows for totals/flights/comments
  const maxHeight = zoom === minZoom
    ? (rowData.length + 5) * 48 + 60 // fit all rows + header
    : 400 / zoom; // default 400px, zoomed in/out
  // ...existing code...
  const [autoHide, setAutoHide] = useState(true);
  // ...existing code...
  // Auto-hide companies with no numbers in the next 28 days
  // Auto-hide logic removed; hiddenRows is now only controlled manually.
  const { theme } = useTheme ? useTheme() : { theme: { primary: '#388e3c', text: '#fff' } };
  const appliedTheme = { ...theme, ...themeOverride };
  // For light theme, set chart/table background to light gray
  if (appliedTheme.surface && appliedTheme.surface === '#e0e0e0') {
    appliedTheme.background = '#e0e0e0';
  }
  // State hooks for undo/redo, highlights, autosave, modal, etc.
  const [undoStack, setUndoStack] = useState([]); // For undo history
  const [redoStack, setRedoStack] = useState([]); // For redo history
  const [manualHighlights, setManualHighlights] = useState({}); // For cell highlights
  const [saveMsg, setSaveMsg] = useState(''); // For save status message
  const [localComments, setLocalComments] = useState(comments); // For comments row
  const [autosave, setAutosave] = useState(true); // Autosave toggle
  const [editCompanies, setEditCompanies] = useState(rowData.map(r => r.company)); // Companies being edited
  const [pinnedCompanies, setPinnedCompanies] = useState([]); // Pinned companies
  const [hiddenRows, setHiddenRows] = useState([]); // Hidden company rows
  const [lastSavedData, setLastSavedData] = useState(rowData); // Last saved table data
  const [lastSavedComments, setLastSavedComments] = useState(localComments); // Last saved comments
  const [flightsOut, setFlightsOut] = useState({}); // Flights out per date
  const [flightsIn, setFlightsIn] = useState({}); // Flights in per date
  const inputRefs = useRef([]); // Refs for table cell inputs
  const tableScrollRef = useRef(null); // Ref for scrollable table div

  // Helper: merge flights into comments (not used for user comments)
  const generateMergedComments = (out, inn) => {
    const result = {};
    dates.forEach(d => {
      const outStr = out[d.date]?.join(', ') || '';
      const inStr  = inn[d.date]?.join(', ') || '';
      result[d.date] = [
        outStr && `Out: ${outStr}`,
        inStr  && `In: ${inStr}`
      ].filter(Boolean).join('\n');
    });
    return result;
  };

  // Effect: update flights info when data changes
  useEffect(() => {
    // Only update flights if rowData or dates actually change
    const { flightsOut: out, flightsIn: inn } = generateFlightComments(rowData, dates);
    setFlightsOut(out);
    setFlightsIn(inn);
    // Comments row is for user input only
  }, [rowData, dates]);

  // Effect: autosave table and comments to localStorage
  useEffect(() => {
    if (autosave) {
      localStorage.setItem('pobPlannerData', JSON.stringify(rowData));
      localStorage.setItem('pobPlannerComments', JSON.stringify(localComments));
      setLastSavedData(rowData);
      setLastSavedComments(localComments);
    }
  }, [rowData, localComments, autosave]);

  // Helper: push current state to undo stack
  const pushUndo = () => {
    setUndoStack(prev => [
      ...prev,
      { rowData: JSON.parse(JSON.stringify(rowData)), localComments: { ...localComments } }
    ]);
    setRedoStack([]);
  };

  // Helper: focus a cell by row/column index
  const focusCell = (rowIdx, colIdx) => {
    if (inputRefs.current[rowIdx] && inputRefs.current[rowIdx][colIdx]) {
      inputRefs.current[rowIdx][colIdx].focus();
    }
  };

  // Modal logic: open, add, remove, save companies
  const openEditor = () => {
    setEditCompanies(rowData.map(r => r.company));
    setEditing(true);
  };
  const addCompany = () => setEditCompanies(prev => [...prev, '']);
  const removeCompany = idx => setEditCompanies(prev => prev.filter((_, i) => i !== idx));
  const saveCompanies = () => {
    setRowData(prev => editCompanies.map((name, i) => (prev[i] ? { ...prev[i], company: name } : { company: name })));
    setEditing(false);
    setSaveMsg('Companies updated');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  // Hide/unhide company row (manual override)
  const toggleRow = (company, hide) => {
    setHiddenRows(prev => hide ? [...new Set([...prev, company])] : prev.filter(c => c !== company));
  };

  // Manual save button
  const handleSave = () => {
    localStorage.setItem('pobPlannerData', JSON.stringify(rowData));
    localStorage.setItem('pobPlannerComments', JSON.stringify(localComments));
    setLastSavedData(rowData);
    setLastSavedComments(localComments);
    setSaveMsg('Saved!');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  // Scroll table horizontally by px (used for scroll buttons)
  const scrollTable = (action) => {
    if (tableScrollRef.current) {
      if (action === 'start') {
        tableScrollRef.current.scrollLeft = 0;
      } else if (action === 'end') {
        tableScrollRef.current.scrollLeft = tableScrollRef.current.scrollWidth;
      } else if (action === 'left') {
        tableScrollRef.current.scrollLeft -= 100;
      } else if (action === 'right') {
        tableScrollRef.current.scrollLeft += 100;
      }
    }
  };

  // Main render
  return (
    <div>
      {/* Zoom slider */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontWeight: 'bold', marginRight: 8 }}>Zoom:</label>
        <input
          type="range"
          min={minZoom}
          max={1}
          step={0.01}
          value={zoom}
          onChange={e => setZoom(Number(e.target.value))}
          style={{ width: 120 }}
        />
        <span style={{ marginLeft: 8 }}>{zoom === minZoom ? 'Fit All' : `${Math.round(zoom * 100)}%`}</span>
      </div>
      {/* Controls: scroll, save, autosave, edit companies, undo/redo */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          title="Scroll to start"
          onClick={() => scrollTable('start')}
          style={{ padding: '4px 10px', background: theme.primary, color: theme.text, border: '1px solid #bbb', borderRadius: 4 }}
        >{'<<'}</button>
        <button
          title="Scroll left"
          onClick={() => scrollTable('left')}
          style={{ padding: '4px 10px', background: theme.primary, color: theme.text, border: '1px solid #bbb', borderRadius: 4 }}
        >{'<'}</button>
        <button
          title="Scroll right"
          onClick={() => scrollTable('right')}
          style={{ padding: '4px 10px', background: theme.primary, color: theme.text, border: '1px solid #bbb', borderRadius: 4 }}
        >{'>'}</button>
        <button
          title="Scroll to end"
          onClick={() => scrollTable('end')}
          style={{ padding: '4px 10px', background: theme.primary, color: theme.text, border: '1px solid #bbb', borderRadius: 4 }}
        >{'>>'}</button>
      </div>
      <button
        onClick={handleSave}
        disabled={autosave}
        style={{ fontSize: '1em', padding: '6px 18px', background: autosave ? '#bbb' : theme.primary, color: theme.buttonText || theme.text, border: 'none', borderRadius: 4 }}
      >
        Save
      </button>
      <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '1em' }}>
          <input type="checkbox" checked={autosave} onChange={e => setAutosave(e.target.checked)} /> Autosave
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '1em' }}>
          <input type="checkbox" checked={autoHide} onChange={e => setAutoHide(e.target.checked)} /> Auto Hide
        </label>
        <span
          role="img"
          aria-label="Undo"
          title="Undo"
          style={{ cursor: undoStack.length ? 'pointer' : 'not-allowed', fontSize: '1.5em', opacity: undoStack.length ? 1 : 0.5 }}
          onClick={() => {
            if (undoStack.length > 0) {
              const last = undoStack[undoStack.length - 1];
              setRedoStack(prev => [
                ...prev,
                { rowData: JSON.parse(JSON.stringify(rowData)), localComments: { ...localComments } }
              ]);
              setRowData(last.rowData);
              setLocalComments(last.localComments);
              setUndoStack(prev => prev.slice(0, -1));
            }
          }}
        >↩️</span>
        <span
          role="img"
          aria-label="Redo"
          title="Redo"
          style={{ cursor: redoStack.length ? 'pointer' : 'not-allowed', fontSize: '1.5em', opacity: redoStack.length ? 1 : 0.5 }}
          onClick={() => {
            if (redoStack.length > 0) {
              const last = redoStack[redoStack.length - 1];
              setUndoStack(prev => [
                ...prev,
                { rowData: JSON.parse(JSON.stringify(rowData)), localComments: { ...localComments } }
              ]);
              setRowData(last.rowData);
              setLocalComments(last.localComments);
              setRedoStack(prev => prev.slice(0, -1));
            }
          }}
        >↪️</span>
      </div>
      {saveMsg && <span style={{ color: '#388e3c', fontWeight: 'bold' }}>{saveMsg}</span>}

      {/* Table/chart inside scrollable frame with header */}
      <div
        ref={tableScrollRef}
        style={{
          overflowX: 'auto',
          overflowY: 'auto',
          maxHeight: maxHeight,
          background: appliedTheme.background,
          position: 'relative',
          width: '100%',
          maxWidth: '100vw',
          boxSizing: 'border-box',
          border: '2px solid ' + appliedTheme.primary,
          borderRadius: 8,
          margin: '0 auto',
        }}
      >
        <table
          border="1"
          cellPadding="6"
          style={{
            minWidth: '900px',
            width: 'max-content',
            borderCollapse: 'collapse',
            tableLayout: 'auto',
            marginTop: 0,
            background: appliedTheme.background,
            color: appliedTheme.text,
          }}
        >
          <CompanyTableHeader dates={dates} />
          <tbody>
            {/* Render each company row */}
            {rowData.map((row, idx) => (
              <CompanyRow
                key={row.company || idx}
                row={row}
                idx={idx}
                dates={dates}
                hiddenRows={hiddenRows}
                lastSavedData={lastSavedData}
                manualHighlights={manualHighlights}
                inputRefs={inputRefs}
                pushUndo={pushUndo}
                setRowData={setRowData}
                focusCell={focusCell}
              />
            ))}
            {/* Render totals, flights, comments rows */}
            <TotalsRow rowData={rowData} dates={dates} />
            <FlightsRow type="Flights Out" dates={dates} flights={flightsOut} />
            <FlightsRow type="Flights In" dates={dates} flights={flightsIn} />
            <CommentsRow
              dates={dates}
              comments={comments}
              lastSavedComments={lastSavedComments}
              manualHighlights={manualHighlights}
              setComments={setComments}
              pushUndo={pushUndo}
            />
            {/* Hidden rows controls */}
            {rowData.map((row, idx) =>
              hiddenRows.includes(row.company) ? (
                <tr key={`${row.company}-hidden`} style={{ background: '#f9f9f9' }}>
                  <td colSpan={dates.length + 1}>
                    <span style={{ color: '#888' }}>{row.company} (hidden)</span>
                    <input
                      type="checkbox"
                      checked
                      onChange={() => toggleRow(row.company, false)}
                      style={{ marginLeft: 8, transform: 'scale(0.8)', verticalAlign: 'middle' }}
                      title="Show row"
                    />
                    <span style={{ fontSize: '0.8em', marginLeft: 4 }}>Unhide</span>
                  </td>
                </tr>
              ) : null
            )}
          </tbody>
        </table>
      </div>
      {/* Edit companies modal */}
      <EditCompaniesModal
        editing={editing}
        editCompanies={editCompanies}
        setEditCompanies={setEditCompanies}
        pinnedCompanies={pinnedCompanies}
        setPinnedCompanies={setPinnedCompanies}
        hiddenRows={hiddenRows}
        toggleRow={toggleRow}
        addCompany={addCompany}
        removeCompany={removeCompany}
        saveCompanies={saveCompanies}
        setEditing={setEditing}
      />
    </div>
  );
}
