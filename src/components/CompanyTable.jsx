// CompanyTable.jsx
// Main table component: manages state, layout, and connects all subcomponents
import React, { useState, useRef, useEffect, useMemo } from 'react';
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

export default function CompanyTable({ rowData, setRowData, dates, comments, setComments, todayColumnRef, todayKey, viewStart, viewEnd, themeOverride = {}, editing, setEditing }) {
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
    if (!autoFit) return;
    const el = unifiedScrollRef?.current;
    if (!el) return;
    const raw = el.scrollHeight;
    const estimated = Math.min(1000, Math.max(200, Math.round(raw * zoom) + 8));
    setFrameHeight(prev => (prev === estimated ? prev : estimated));
  }, [autoFit, zoom, rowData.length]);
  // Persist zoom setting
  useEffect(() => {
    localStorage.setItem('pobZoom', String(zoom));
  }, [zoom]);
  // ...existing code...
  const [autoHide, setAutoHide] = useState(true);
  // Disable autoHide if user adjusts the date range in parent (viewStart/viewEnd changes after mount)
  const initialRangeRef = useRef({ viewStart, viewEnd });
  useEffect(() => {
    if (!initialRangeRef.current) return;
    const { viewStart: initStart, viewEnd: initEnd } = initialRangeRef.current;
    if ((viewStart && viewStart !== initStart) || (viewEnd && viewEnd !== initEnd)) {
      setAutoHide(false);
      // update stored to prevent repeated triggers if user toggles again manually
      initialRangeRef.current.viewStart = viewStart;
      initialRangeRef.current.viewEnd = viewEnd;
    }
  }, [viewStart, viewEnd]);
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
  const unifiedScrollRef = useRef(null); // Unified scroll container
  // Resize drag handling refs
  const resizeMetaRef = useRef({ startY: 0, startHeight: 0, dragging: false });

  // Derived sorted list (no mutation; prevents bouncing)
  const sortedRows = useMemo(() => {
    const pinnedOrder = pinnedCompanies;
    const pinnedSet = new Set(pinnedOrder);
    return [...rowData].sort((a, b) => {
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
      const cmp = aName.localeCompare(bName);
      if (cmp !== 0) return cmp;
      // Tie-breaker for stable sorting
      return (a.id || '').localeCompare(b.id || '');
    });
  }, [rowData, pinnedCompanies]);

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
    if (unifiedScrollRef.current) {
      const raw = unifiedScrollRef.current.scrollHeight;
      const estimated = Math.min(1000, Math.max(200, Math.round(raw * zoom) + 8));
      setFrameHeight(estimated);
    }
  };
  const toggleAutoFit = () => {
    if (!autoFit) {
      // Turn on auto-fit and compute once immediately
      if (unifiedScrollRef.current) {
        const raw = unifiedScrollRef.current.scrollHeight;
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
  // (Removed separate horizontal sync; unified scroll container will handle alignment)

  // Derive effective dates list based on autoHide (hide dates prior to today)
  // Moved above effects that reference it to avoid temporal dead zone errors
  const effectiveDates = useMemo(() => {
    if (!autoHide || !todayKey) return dates;
    const todayIndex = dates.findIndex(d => d.date === todayKey);
    if (todayIndex === -1) return dates;
    return dates.slice(todayIndex); // from today forward
  }, [dates, autoHide, todayKey]);
  // (Removed dynamic column width measurement; using fixed colgroup widths)

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
    const el = unifiedScrollRef.current;
    if (!el) return;
    if (action === 'start') el.scrollLeft = 0;
    else if (action === 'end') el.scrollLeft = el.scrollWidth;
    else if (action === 'left') el.scrollLeft -= 100;
    else if (action === 'right') el.scrollLeft += 100;
  };

  // One-time horizontal scroll so today's date is leftmost visible
  const didInitialScroll = useRef(false);
  useEffect(() => {
  if (didInitialScroll.current) return;
  if (!todayKey || !todayColumnRef?.current || !unifiedScrollRef.current) return;
    const companyColWidth = 160;
    const targetOffset = todayColumnRef.current.offsetLeft - companyColWidth;
    if (targetOffset > 0) {
  unifiedScrollRef.current.scrollLeft = targetOffset;
      didInitialScroll.current = true;
    }
  }, [todayKey, dates]);

  // When autoHide is turned on, scroll to far left (home position)
  useEffect(() => {
    if (autoHide && unifiedScrollRef.current) {
      unifiedScrollRef.current.scrollLeft = 0;
      // After scrolling left, ensure we don't skip potential initial alignment if needed later
      didInitialScroll.current = true; // effectiveDates already start at today so leftmost is correct
    }
  }, [autoHide]);

  // (effectiveDates definition moved above)

  // -------- Bulk Import --------
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkPreview, setBulkPreview] = useState([]); // parsed rows
  const openBulk = () => { setBulkOpen(true); setBulkText(''); setBulkPreview([]); };
  const closeBulk = () => { setBulkOpen(false); };
  // Parse pasted text (tab or comma separated). Columns: Company, Date1, Date2, ... (M/D/YYYY or MM/DD/YYYY) values (numbers) or blank
  const parseBulk = (txt) => {
    const lines = txt.split(/\r?\n/).map(l=>l.trim()).filter(l=>l);
    if(!lines.length) return [];
    // Split by tab first, fallback to comma
    const splitLine = (l) => l.includes('\t') ? l.split('\t') : l.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/);
    const header = splitLine(lines[0]).map(h=>h.trim());
    // Expect first column is Company
    const dateCols = header.slice(1);
    const normDate = (dstr) => {
      // Accept M/D/YYYY
      if(!dstr) return null;
      const m = dstr.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
      if(!m) return null; return parseInt(m[1])+'/'+parseInt(m[2])+'/'+m[3];
    };
    const mappedDates = dateCols.map(normDate);
    const out = [];
    for(let i=1;i<lines.length;i++){
      const cols = splitLine(lines[i]);
      if(!cols.length) continue; const company = (cols[0]||'').trim(); if(!company) continue;
      const rowVals = {};
      mappedDates.forEach((dk, idx)=>{
        if(!dk) return; const raw = (cols[idx+1]||'').trim(); if(!raw) return; const num = parseInt(raw,10); if(!isNaN(num)) rowVals[dk]=num; });
      out.push({ company, values: rowVals });
    }
    return out;
  };
  useEffect(()=>{ setBulkPreview(parseBulk(bulkText)); }, [bulkText]);
  const applyBulk = () => {
    if(!bulkPreview.length) { closeBulk(); return; }
    pushUndo();
    setRowData(prev => {
      const map = new Map(prev.map(r=> [ (r.company||'').toLowerCase(), r ]));
      const next = [...prev];
      bulkPreview.forEach(br => {
        const key = br.company.toLowerCase();
        let row = map.get(key);
        if(!row){
          row = { id: generateId(), company: br.company };
          map.set(key, row);
          next.push(row);
        }
        Object.entries(br.values).forEach(([k,v])=>{ row[k]=v; });
      });
      return next;
    });
    closeBulk();
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
  onBulkImport={openBulk}
      />
      {saveMsg && <span style={{ color: '#388e3c', fontWeight: 'bold' }}>{saveMsg}</span>}

      {/* Unified scrollable table with sticky header & first column */}
      <div style={{ position: 'relative', width: '100%', maxWidth: '100vw', margin: '0 auto' }}>
        <div
          ref={unifiedScrollRef}
          style={{
            position: 'relative',
            border: '2px solid ' + appliedTheme.primary,
            borderRadius: 8,
            background: appliedTheme.background,
            width: '100%',
            boxSizing: 'border-box',
            height: frameHeight,
            minHeight: 200,
            maxHeight: 1000,
            overflow: 'auto',
            transition: 'height 0.15s ease',
            scrollbarGutter: 'stable both-edges'
          }}
        >
          <table
            border="0"
            cellPadding="6"
            style={{
              minWidth: '900px',
              width: 'max-content',
              borderCollapse: 'separate',
              borderSpacing: 0,
              tableLayout: 'fixed',
              background: appliedTheme.background,
              color: appliedTheme.text,
              margin: 0
            }}
          >
            <colgroup>
              <col style={{ width: 160 }} />
              {effectiveDates.map(d => (
                <col key={d.date} style={{ width: 80 }} />
              ))}
            </colgroup>
            <CompanyTableHeader dates={effectiveDates} todayKey={todayKey} todayColumnRef={todayColumnRef} />
            <tbody style={{ transform: `scaleY(${zoom})`, transformOrigin: 'top left', transition: 'transform 0.2s ease' }}>
              {sortedRows.map((row, idx) => (
                <CompanyRow
                  key={row.id}
                  row={row}
                  idx={idx}
                  dates={effectiveDates}
                  hiddenRows={hiddenRows}
                  lastSavedById={Object.fromEntries(lastSavedData.map(r=>[r.id,r]))}
                  manualHighlights={manualHighlights}
                  setManualHighlights={setManualHighlights}
                  inputRefs={inputRefs}
                  pushUndo={pushUndo}
                  setRowData={setRowData}
                  focusCell={focusCell}
                />
              ))}
              <TotalsRow rowData={rowData} dates={effectiveDates} />
              <FlightsRow type="Flights Out" dates={effectiveDates} flights={flightsOut} />
              <FlightsRow type="Flights In" dates={effectiveDates} flights={flightsIn} />
              <CommentsRow
                dates={effectiveDates}
                comments={comments}
                lastSavedComments={lastSavedComments}
                manualHighlights={manualHighlights}
                setComments={setComments}
                pushUndo={pushUndo}
              />
            </tbody>
          </table>
          {/* Corner resize handle anchored within scroll frame */}
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
      {bulkOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1200, display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px' }} onClick={e=> { if(e.target===e.currentTarget) closeBulk(); }}>
          <div style={{ background:'#fff', color:'#222', width:'min(780px,100%)', maxHeight:'90vh', overflowY:'auto', borderRadius:14, padding:24, boxShadow:'0 8px 24px rgba(0,0,0,0.4)', position:'relative' }}>
            <h3 style={{ marginTop:0 }}>Bulk Import Companies</h3>
            <p style={{ fontSize:12, lineHeight:1.4 }}>
              Paste rows from a spreadsheet (first row header). First column must be Company. Subsequent headers should be dates (M/D/YYYY). Cells with numbers will be imported. Blank cells ignored.
              <br/>Example (Tab separated):
              <br/>Company	8/10/2025	8/11/2025
              <br/>ACME	3	4
            </p>
            <textarea value={bulkText} onChange={e=> setBulkText(e.target.value)} placeholder={'Company\t8/10/2025\t8/11/2025\nACME\t3\t4'} style={{ width:'100%', minHeight:160, fontFamily:'monospace', fontSize:12, padding:10, border:'1px solid #888', borderRadius:8, resize:'vertical' }} />
            <div style={{ marginTop:14, fontSize:12 }}>
              <strong>Preview ({bulkPreview.length} rows)</strong>
              {bulkPreview.length>0 ? (
                <div style={{ marginTop:8, maxHeight:200, overflowY:'auto', border:'1px solid #ccc', borderRadius:8 }}>
                  <table style={{ borderCollapse:'collapse', width:'100%', fontSize:11 }}>
                    <thead><tr><th style={bpTh}>Company</th><th style={bpTh}>Dates & Values</th></tr></thead>
                    <tbody>
                      {bulkPreview.map((r,i)=> (
                        <tr key={i}>
                          <td style={bpTd}>{r.company}</td>
                          <td style={bpTd}>{Object.entries(r.values).map(([k,v])=> k+':'+v).join(', ')||'(no values)'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div style={{ marginTop:4, fontStyle:'italic', opacity:.6 }}>No parsable rows yet.</div>}
            </div>
            <div style={{ marginTop:16, display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button onClick={closeBulk} style={{ padding:'6px 14px', background:'#bbb', border:'1px solid #999', borderRadius:8, cursor:'pointer' }}>Cancel</button>
              <button disabled={!bulkPreview.length} onClick={applyBulk} style={{ padding:'6px 14px', background: bulkPreview.length? '#388e3c':'#888', color:'#fff', border:'1px solid '+(bulkPreview.length? '#2e7030':'#666'), borderRadius:8, cursor: bulkPreview.length? 'pointer':'not-allowed', fontWeight:'bold' }}>Apply Import</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Bulk preview cell styles
const bpTh = { padding:'4px 6px', border:'1px solid #999', background:'#f0f3f6', position:'sticky', top:0 };
const bpTd = { padding:'4px 6px', border:'1px solid #ccc', verticalAlign:'top' };
