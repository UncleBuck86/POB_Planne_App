// CompanyTable.jsx
// Main table component: manages state, layout, and connects all subcomponents
import React, { useState, useRef, useEffect } from 'react';
import { generateFlightComments } from '../utils/generateFlightComment';
// Import subcomponents for modular table rendering
import CompanyTableHeader from './CompanyTable/CompanyTableHeader';
import CompanyRow from './CompanyTable/CompanyRow';
import CommentsRow from './CompanyTable/CommentsRow';
import FlightsRow from './CompanyTable/FlightsRow';
import TotalsRow from './CompanyTable/TotalsRow';
import EditCompaniesModal from './CompanyTable/EditCompaniesModal';

export default function CompanyTable({ rowData, setRowData, dates, comments, setComments, todayColumnRef }) {
  // State hooks for undo/redo, highlights, autosave, modal, etc.
  const [undoStack, setUndoStack] = useState([]); // For undo history
  const [redoStack, setRedoStack] = useState([]); // For redo history
  const [manualHighlights, setManualHighlights] = useState({}); // For cell highlights
  const [saveMsg, setSaveMsg] = useState(''); // For save status message
  const [localComments, setLocalComments] = useState(comments); // For comments row
  const [autosave, setAutosave] = useState(true); // Autosave toggle
  const [editing, setEditing] = useState(false); // Edit companies modal toggle
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

  // Hide/unhide company row
  const toggleRow = (company, hide) => {
    setHiddenRows(prev => hide ? [...prev, company] : prev.filter(c => c !== company));
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
  const scrollTable = (days) => {
    if (tableScrollRef.current) {
      // Single arrow: 100px, double arrow: 700px
      const px = Math.abs(days) === 1 ? 100 : 700;
      tableScrollRef.current.scrollLeft = Math.max(0, tableScrollRef.current.scrollLeft + Math.sign(days) * px);
    }
  };

  // Main render
  return (
    <div>
      {/* Controls: scroll, save, autosave, edit companies, undo/redo */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          title="Scroll to previous week"
          onClick={() => scrollTable(-7)}
          style={{ padding: '4px 10px', background: '#e3f2fd', border: '1px solid #bbb', borderRadius: 4 }}
        >{'<<'}</button>
        <button
          title="Scroll to previous day"
          onClick={() => scrollTable(-1)}
          style={{ padding: '4px 10px', background: '#e3f2fd', border: '1px solid #bbb', borderRadius: 4 }}
        >{'<'}</button>
        <button
          title="Scroll to next day"
          onClick={() => scrollTable(1)}
          style={{ padding: '4px 10px', background: '#e3f2fd', border: '1px solid #bbb', borderRadius: 4 }}
        >{'>'}</button>
        <button
          title="Scroll to next week"
          onClick={() => scrollTable(7)}
          style={{ padding: '4px 10px', background: '#e3f2fd', border: '1px solid #bbb', borderRadius: 4 }}
        >{'>>'}</button>
      </div>
        <button
          onClick={handleSave}
          disabled={autosave}
          style={{ fontSize: '1em', padding: '6px 18px', background: autosave ? '#bbb' : '#4caf50', color: '#fff', border: 'none', borderRadius: 4 }}
        >
          Save
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={autosave} onChange={e => setAutosave(e.target.checked)} /> Autosave
        </label>
        <button
          onClick={openEditor}
          style={{ fontSize: '0.95em', padding: '4px 12px', background: '#eee', border: '1px solid #bbb', borderRadius: 4 }}
        >
          Edit Companies
        </button>
        <button
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
          disabled={undoStack.length === 0}
          style={{
            padding: '4px 12px',
            background: undoStack.length ? '#e3f2fd' : '#eee',
            border: '1px solid #bbb',
            borderRadius: 4
          }}
        >
          Undo
        </button>
        <button
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
          disabled={redoStack.length === 0}
          style={{
            padding: '4px 12px',
            background: redoStack.length ? '#e3f2fd' : '#eee',
            border: '1px solid #bbb',
            borderRadius: 4
          }}
        >
          Redo
        </button>
        {saveMsg && <span style={{ color: '#388e3c', fontWeight: 'bold' }}>{saveMsg}</span>}

      {/* Table header (not scrollable) */}
      <table border="1" cellPadding="6" style={{ width: 'auto', borderCollapse: 'collapse', tableLayout: 'auto', marginBottom: 0 }}>
        <CompanyTableHeader dates={dates} />
      </table>
      {/* Table body (scrollable) */}
      <div ref={tableScrollRef} style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '60vh' }}>
        <table border="1" cellPadding="6" style={{ width: 'auto', borderCollapse: 'collapse', tableLayout: 'auto', marginTop: 0 }}>
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
