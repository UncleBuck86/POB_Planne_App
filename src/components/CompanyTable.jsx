// CompanyTable.jsx
// Main table component: manages state, layout, and connects all subcomponents
import React, { useState, useRef, useEffect } from 'react';
import TableControlsBar from './CompanyTable/TableControlsBar';
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
  // Vertical zoom (scale rows visually). 1 = normal height
  const [zoom, setZoom] = useState(() => {
    const stored = parseFloat(localStorage.getItem('pobZoom') || '1');
    return isNaN(stored) ? 1 : stored;
  });
  const minZoom = 0.6;   // allow shrinking
  const maxZoom = 1.6;   // allow enlargement
  // Scroll frame (chart frame) height adjustable by user
  const [frameHeight, setFrameHeight] = useState(() => {
    const stored = parseInt(localStorage.getItem('pobFrameHeight') || '400', 10);
    return isNaN(stored) ? 400 : stored;
  });
  const [autoFit, setAutoFit] = useState(false);
  useEffect(() => {
    localStorage.setItem('pobFrameHeight', String(frameHeight));
  }, [frameHeight]);
  // Recompute frame height when autoFit is on and zoom or data changes
  useEffect(() => {
    if (autoFit && tableScrollRef.current) {
      const raw = tableScrollRef.current.scrollHeight; // unscaled
      const estimated = Math.min(1000, Math.max(200, Math.round(raw * zoom) + 8));
      if (estimated !== frameHeight) setFrameHeight(estimated);
    }
  }, [autoFit, zoom, rowData.length, frameHeight]);
  // Persist zoom setting
  useEffect(() => {
    localStorage.setItem('pobZoom', String(zoom));
  }, [zoom]);
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
  // Ensure each company row has a stable id
  const generateId = () => 'cmp_' + Math.random().toString(36).slice(2, 10);
  useEffect(() => {
    setRowData(prev => prev.map(r => (r.id ? r : { ...r, id: generateId() })));
  }, []); // run once
  const [editCompanies, setEditCompanies] = useState([]); // Array of {id, company}
  const [pinnedCompanies, setPinnedCompanies] = useState([]); // Array of pinned IDs
  const [hiddenRows, setHiddenRows] = useState([]); // Array of hidden IDs

  // After ids exist, load persisted pinned/hidden (filter to existing ids)
  useEffect(() => {
    if (!rowData.every(r => r.id)) return; // wait until all have ids
    const storedPinned = JSON.parse(localStorage.getItem('pobPinnedIds') || '[]');
    const storedHidden = JSON.parse(localStorage.getItem('pobHiddenIds') || '[]');
    const ids = new Set(rowData.map(r => r.id));
    setPinnedCompanies(storedPinned.filter(id => ids.has(id)));
    setHiddenRows(storedHidden.filter(id => ids.has(id)));
  }, [rowData]);

  // Persist pinned & hidden changes
  useEffect(() => {
    localStorage.setItem('pobPinnedIds', JSON.stringify(pinnedCompanies));
  }, [pinnedCompanies]);
  useEffect(() => {
    localStorage.setItem('pobHiddenIds', JSON.stringify(hiddenRows));
  }, [hiddenRows]);

  // Prune pinned/hidden if rows removed
  useEffect(() => {
    const existing = new Set(rowData.map(r => r.id));
    setPinnedCompanies(prev => prev.filter(id => existing.has(id)));
    setHiddenRows(prev => prev.filter(id => existing.has(id)));
  }, [rowData.length]);
  const [lastSavedData, setLastSavedData] = useState(rowData); // Last saved table data
  const [lastSavedComments, setLastSavedComments] = useState(localComments); // Last saved comments
  const [flightsOut, setFlightsOut] = useState({}); // Flights out per date
  const [flightsIn, setFlightsIn] = useState({}); // Flights in per date
  const inputRefs = useRef([]); // Refs for table cell inputs
  const tableScrollRef = useRef(null); // Ref for scrollable table div
  // Resize drag handling refs
  const resizeMetaRef = useRef({ startY: 0, startHeight: 0, dragging: false });

  // --- Auto alphabetize (with pinned companies on top) ---
  const companyNamesKey = rowData.map(r => r.company + ':' + r.id).join('|');
  useEffect(() => {
    setRowData(prev => {
      if (!prev || !Array.isArray(prev)) return prev;
      const pinnedOrder = pinnedCompanies; // ids
      const pinnedSet = new Set(pinnedOrder);
      const sorted = [...prev].sort((a, b) => {
        const aPinned = pinnedSet.has(a.id);
        const bPinned = pinnedSet.has(b.id);
        if (aPinned && bPinned) {
          return pinnedOrder.indexOf(a.id) - pinnedOrder.indexOf(b.id);
        }
        if (aPinned) return -1;
        if (bPinned) return 1;
        const aName = (a.company || '').toLowerCase();
        const bName = (b.company || '').toLowerCase();
        if (!aName && !bName) return 0;
        if (!aName) return 1;
        if (!bName) return -1;
        return aName.localeCompare(bName);
      });
      // Only update if order changed (reference comparison by position)
      for (let i = 0; i < prev.length; i++) {
        if (prev[i] !== sorted[i]) {
          return sorted; // changed
        }
      }
      return prev; // unchanged
    });
  }, [companyNamesKey, pinnedCompanies, setRowData]);

  const onResizeMouseDown = (e) => {
    resizeMetaRef.current = { startY: e.clientY, startHeight: frameHeight, dragging: true };
    window.addEventListener('mousemove', onResizeMouseMove);
    window.addEventListener('mouseup', onResizeMouseUp);
    e.preventDefault();
  };
  const onResizeDoubleClick = () => {
    // Toggle between default and fit-to-content (considering zoom as visual only)
    const defaultH = 400;
    if (frameHeight !== defaultH) {
      setFrameHeight(defaultH);
      return;
    }
    if (tableScrollRef.current) {
      // Estimate content height: actual scrollHeight doesn't include transform scaleY effect
      const raw = tableScrollRef.current.scrollHeight;
      const estimated = Math.min(1000, Math.max(200, Math.round(raw * zoom) + 8));
      setFrameHeight(estimated);
    }
  };
  const toggleAutoFit = () => {
    if (!autoFit) {
      // Turn on auto-fit and compute once immediately
      if (tableScrollRef.current) {
        const raw = tableScrollRef.current.scrollHeight;
        const estimated = Math.min(1000, Math.max(200, Math.round(raw * zoom) + 8));
        setFrameHeight(estimated);
      }
      setAutoFit(true);
    } else {
      // Switch to max height (1000) and disable auto-fit
      setAutoFit(false);
      setFrameHeight(1000);
    }
  };
  const onResizeMouseMove = (e) => {
    if (!resizeMetaRef.current.dragging) return;
    const delta = e.clientY - resizeMetaRef.current.startY;
    const newHeight = Math.min(1000, Math.max(200, resizeMetaRef.current.startHeight + delta));
    setFrameHeight(newHeight);
  };
  const onResizeMouseUp = () => {
    resizeMetaRef.current.dragging = false;
    window.removeEventListener('mousemove', onResizeMouseMove);
    window.removeEventListener('mouseup', onResizeMouseUp);
  };
  useEffect(() => () => {
    // cleanup on unmount
    window.removeEventListener('mousemove', onResizeMouseMove);
    window.removeEventListener('mouseup', onResizeMouseUp);
  }, []);

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

  // When external editing flag turns on, seed editCompanies if empty
  useEffect(() => {
    if (editing && editCompanies.length === 0 && rowData.length) {
      setEditCompanies(rowData.map(r => ({ id: r.id, company: r.company })));
    }
  }, [editing, rowData, editCompanies.length]);
  // Modal logic: add, remove, save companies
  const addCompany = () => {
    const id = generateId();
    setEditCompanies(prev => [...prev, { id, company: '' }]);
    setRowData(prev => [...prev, { id, company: '' }]);
  };
  const removeCompany = idx => {
    setEditCompanies(prev => prev.filter((_, i) => i !== idx));
    // Do not remove from rowData until save? We'll mirror immediate removal:
    setRowData(prev => prev.filter((_, i) => i !== idx));
  };
  const saveCompanies = () => {
    setRowData(prev => editCompanies.map(ec => {
      const found = prev.find(r => r.id === ec.id);
      return found ? { ...found, company: ec.company } : { id: ec.id, company: ec.company };
    }));
    setEditing(false);
    setSaveMsg('Companies updated');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  // Hide/unhide company row (manual override)
  const toggleRow = (id, hide) => {
    setHiddenRows(prev => hide ? [...new Set([...prev, id])] : prev.filter(c => c !== id));
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
      {/* Controls bar: scroll, save, autosave, auto-hide, undo/redo, zoom slider */}
      <TableControlsBar
        theme={theme}
        autosave={autosave}
        setAutosave={setAutosave}
        autoHide={autoHide}
        setAutoHide={setAutoHide}
        handleSave={handleSave}
        saveMsg={saveMsg}
        undoStack={undoStack}
        redoStack={redoStack}
        pushUndo={pushUndo}
        setUndoStack={setUndoStack}
        setRedoStack={setRedoStack}
  rowData={rowData}
        localComments={localComments}
        setRowData={setRowData}
        setLocalComments={setLocalComments}
        zoom={zoom}
        setZoom={setZoom}
        minZoom={minZoom}
        maxZoom={maxZoom}
  scrollTable={scrollTable}
  autoFit={autoFit}
  toggleAutoFit={toggleAutoFit}
      />
      {saveMsg && <span style={{ color: '#388e3c', fontWeight: 'bold' }}>{saveMsg}</span>}

      {/* Table/chart inside adjustable frame */}
      <div style={{ position: 'relative', width: '100%', maxWidth: '100vw', margin: '0 auto' }}>
        <div
          ref={tableScrollRef}
          style={{
            overflowX: 'auto',
            overflowY: 'auto',
            height: frameHeight,
            minHeight: 200,
            maxHeight: 1000,
            background: appliedTheme.background,
            width: '100%',
            boxSizing: 'border-box',
            border: '2px solid ' + appliedTheme.primary,
            borderRadius: 8,
            position: 'relative',
            transition: 'height 0.15s ease'
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
              transform: `scaleY(${zoom})`,
              transformOrigin: 'top left',
              transition: 'transform 0.2s ease'
            }}
          >
          <CompanyTableHeader dates={dates} />
          <tbody>
            {/* Render each company row */}
            {rowData.map((row, idx) => (
              <CompanyRow
                key={row.id}
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
          </tbody>
          </table>
        </div>
        {/* Corner resize handle anchored to outer wrapper so always visible */}
        <div
          onMouseDown={onResizeMouseDown}
          onDoubleClick={onResizeDoubleClick}
          title="Drag to adjust frame height (double-click to toggle fit/reset)"
          style={{
            position: 'absolute',
            right: 6,
            bottom: 6,
            width: 20,
            height: 20,
            cursor: 'ns-resize',
            background: `repeating-linear-gradient(135deg, ${theme.primary} 0px, ${theme.primary} 4px, ${theme.primary}55 4px, ${theme.primary}55 8px)`,
            border: '1px solid ' + theme.primary,
            borderRadius: 6,
            boxShadow: '0 2px 6px rgba(0,0,0,0.45)',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s, box-shadow 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.6)'; e.currentTarget.style.opacity = '0.95'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.45)'; e.currentTarget.style.opacity = '1'; }}
        >
          <span style={{ fontSize: 9, color: theme.buttonText || '#fff', fontWeight: 'bold', userSelect: 'none', letterSpacing: 1 }}>≡</span>
        </div>
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
