// CompanyTable.jsx
// Main table component: manages state, layout, and connects all subcomponents
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { storage } from '../utils/storageAdapter';
import TableControlsBar from './CompanyTable/TableControlsBar';
import { useTheme } from '../ThemeContext.jsx';
import { generateFlightComments } from '../helpers/commentHelpers';
import { useToast } from '../alerts/ToastProvider.jsx';
// Import subcomponents for modular table rendering
import CompanyTableHeader from './CompanyTable/CompanyTableHeader';
import CompanyRow from './CompanyTable/CompanyRow';
import CommentsRow from './CompanyTable/CommentsRow';
import FlightsRow from './CompanyTable/FlightsRow';
import TotalsRow from './CompanyTable/TotalsRow';
import EditCompaniesModal from './CompanyTable/EditCompaniesModal';
import TableConfigModal from './CompanyTable/TableConfigModal.jsx';

export default function CompanyTable({ rowData, setRowData, dates, comments, setComments, todayColumnRef, todayKey, viewStart, viewEnd, themeOverride = {}, editing, setEditing }) {
  // Vertical zoom (scale rows visually). 1 = normal height
  const [zoom, setZoom] = useState(() => {
    const stored = parseFloat(storage.get('pobZoom') || '1');
    return isNaN(stored) ? 1 : stored;
  });
  const minZoom = 0.6;   // allow shrinking
  const maxZoom = 1.6;   // allow enlargement
  // Add missing resetZoom function
  const resetZoom = () => setZoom(1);
  // Remove bulk import from planner table
  const onBulkImport = () => {};
  // Removed frame height & auto-fit (direct table layout)
  // autoFit removed
  // Auto-hide past dates (can be toggled off if user sets custom range)
  const [autoHide, setAutoHide] = useState(true);
  const initialRangeRef = useRef({ viewStart, viewEnd });
  useEffect(() => {
    if (!initialRangeRef.current) return;
    const { viewStart: initStart, viewEnd: initEnd } = initialRangeRef.current;
    if ((viewStart && viewStart !== initStart) || (viewEnd && viewEnd !== initEnd)) {
      setAutoHide(false);
      initialRangeRef.current.viewStart = viewStart;
      initialRangeRef.current.viewEnd = viewEnd;
    }
  }, [viewStart, viewEnd]);
  // Derive effective dates list based on autoHide (hide dates prior to today)
  const effectiveDates = useMemo(() => {
    if (!autoHide || !todayKey) return dates;
    const todayIndex = dates.findIndex(d => d.date === todayKey);
    if (todayIndex === -1) return dates;
    return dates.slice(todayIndex);
  }, [dates, autoHide, todayKey]);
  // frameHeight persistence removed
  // Persist zoom setting
  useEffect(() => { storage.set('pobZoom', String(zoom)); }, [zoom]);
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
  const [manualHighlights, setManualHighlights] = useState(() => storage.getJSON('pobManualHighlights', {})); // For cell highlights
  useEffect(() => { storage.setJSON('pobManualHighlights', manualHighlights); }, [manualHighlights]);
  const [saveMsg, setSaveMsg] = useState(''); // For save status message
  const [localComments, setLocalComments] = useState(comments); // For comments row
  // Keep localComments in sync if parent prop changes externally
  useEffect(() => { setLocalComments(comments); }, [comments]);
  const [autosave, setAutosave] = useState(true); // Autosave toggle
  // Track unsaved changes (compares to lastSavedData/Comments)
  const [unsaved, setUnsaved] = useState(false);
  const { addToast } = useToast();
  const lastAutoToastRef = useRef(0);
  // Ensure each company row has a stable id
  const generateId = () => 'cmp_' + Math.random().toString(36).slice(2, 10);
  useEffect(() => {
    setRowData(prev => prev.map(r => (r.id ? r : { ...r, id: generateId() })));
  }, []); // run once
  const [editCompanies, setEditCompanies] = useState([]); // Array of {id, company}
  const [pinnedCompanies, setPinnedCompanies] = useState([]); // Array of pinned IDs
  const [hiddenRows, setHiddenRows] = useState([]); // Array of hidden IDs
  const [configOpen, setConfigOpen] = useState(false);
  const [includeHiddenInTotals, setIncludeHiddenInTotals] = useState(() => storage.getBool('pobIncludeHiddenInTotals', false));
  useEffect(()=>{ storage.setBool('pobIncludeHiddenInTotals', includeHiddenInTotals); }, [includeHiddenInTotals]);
  // Toggle for number input arrows (spinners); default off
  const [showArrows, setShowArrows] = useState(() => storage.getBool('pobShowNumberArrows', false));
  useEffect(()=>{ storage.setBool('pobShowNumberArrows', showArrows); }, [showArrows]);

  // auto-fit logic removed

  // After ids exist, load persisted pinned/hidden (filter to existing ids)
  useEffect(() => {
    if (!rowData.every(r => r.id)) return; // wait until all have ids
  const storedPinned = storage.getJSON('pobPinnedIds', []);
  const storedHidden = storage.getJSON('pobHiddenIds', []);
    const ids = new Set(rowData.map(r => r.id));
    setPinnedCompanies(storedPinned.filter(id => ids.has(id)));
    setHiddenRows(storedHidden.filter(id => ids.has(id)));
  }, [rowData]);

  // Persist pinned & hidden changes
  useEffect(() => { storage.setJSON('pobPinnedIds', pinnedCompanies); }, [pinnedCompanies]);
  useEffect(() => { storage.setJSON('pobHiddenIds', hiddenRows); }, [hiddenRows]);

  // Prune pinned/hidden if rows removed
  useEffect(() => {
    const existing = new Set(rowData.map(r => r.id));
    setPinnedCompanies(prev => prev.filter(id => existing.has(id)));
    setHiddenRows(prev => prev.filter(id => existing.has(id)));
  }, [rowData]);
  const [lastSavedData, setLastSavedData] = useState(rowData); // Last saved table data
  const lastSavedById = useMemo(() => {
    const map = {};
    lastSavedData.forEach(r => { if (r?.id) map[r.id] = r; });
    return map;
  }, [lastSavedData]);
  const [lastSavedComments, setLastSavedComments] = useState(localComments); // Last saved comments
  const [flightsOut, setFlightsOut] = useState({}); // Flights out per date
  const [flightsIn, setFlightsIn] = useState({}); // Flights in per date
  const inputRefs = useRef([]); // Refs for table cell inputs
  const unifiedScrollRef = useRef(null); // Horizontal scroll container
  const tbodyRef = useRef(null);
  // Hover/active cell tracking for row/column highlights
  const [hoverCell, setHoverCell] = useState({ r: null, c: null });
  const [activeCell, setActiveCell] = useState({ r: null, c: null });

  // Apply auto-hide logic: if autoHide is selected, hide companies with no numbers in the dates shown; if not, show all companies
  const datesToShow = effectiveDates;
  const filteredRows = useMemo(() => {
    if (!autoHide) return rowData;
    return rowData.filter(row =>
      datesToShow.some(d => parseInt(row[d.date], 10) > 0)
    );
  }, [rowData, autoHide, datesToShow]);

  // Derived sorted list (no mutation; prevents bouncing)
  const sortedRows = useMemo(() => {
    const pinnedOrder = pinnedCompanies;
    const pinnedSet = new Set(pinnedOrder);
    return [...filteredRows].sort((a, b) => {
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
  }, [filteredRows, pinnedCompanies]);

  // Visible rows exclude manually hidden rows
  const visibleRows = useMemo(() => sortedRows.filter(r => !hiddenRows.includes(r.id)), [sortedRows, hiddenRows]);
  const rowsForTotals = includeHiddenInTotals ? sortedRows : visibleRows;

  // toggleAutoFit removed
  // (Removed separate horizontal sync; unified scroll container will handle alignment)

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

  // Effect: autosave table and comments to local storage (via adapter)
  useEffect(() => {
    if (autosave) {
      storage.setJSON('pobPlannerData', rowData);
      storage.setJSON('pobPlannerComments', localComments);
      setLastSavedData(rowData);
      setLastSavedComments(localComments);
      setUnsaved(false);
      // Throttled autosave toast (no spam)
      const now = Date.now();
      if (now - (lastAutoToastRef.current || 0) > 15000) {
        lastAutoToastRef.current = now;
        try { addToast({ type:'info', title:'Saved', message:'Autosaved changes', timeout:2000, dedupeKey: undefined }); } catch {/* ignore */}
      }
    }
  }, [rowData, localComments, autosave]);

  // Effect: recompute unsaved when data or lastSaved snapshots change
  useEffect(() => {
    // Simple shallow compare by JSON stringify for this dataset size
    const dataChanged = JSON.stringify(rowData) !== JSON.stringify(lastSavedData);
    const commentsChanged = JSON.stringify(localComments) !== JSON.stringify(lastSavedComments);
    setUnsaved(dataChanged || commentsChanged);
  }, [rowData, localComments, lastSavedData, lastSavedComments]);

  // Helper: push current state to undo stack
  const pushUndo = () => {
    setUndoStack(prev => {
      const snapshot = { rowData: JSON.parse(JSON.stringify(rowData)), localComments: { ...localComments } };
      const next = [...prev, snapshot];
      // Cap to prevent unbounded memory growth
      if (next.length > 50) next.shift();
      return next;
    });
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
  const removeCompany = (idOrIdx) => {
    // Accept legacy index but prefer id string
    if (typeof idOrIdx === 'string') {
      const rid = idOrIdx;
      setEditCompanies(prev => prev.filter(c => c.id !== rid));
      setRowData(prev => prev.filter(r => r.id !== rid));
    } else {
      const idx = idOrIdx;
      setEditCompanies(prev => prev.filter((_, i) => i !== idx));
      setRowData(prev => prev.filter((_, i) => i !== idx));
    }
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
  storage.setJSON('pobPlannerData', rowData);
  storage.setJSON('pobPlannerComments', localComments);
    setLastSavedData(rowData);
    setLastSavedComments(localComments);
    setSaveMsg('Saved!');
    setTimeout(() => setSaveMsg(''), 2000);
    setUnsaved(false);
  try { addToast({ type:'info', title:'Saved', message:'Your changes have been saved', timeout:2000 }); } catch {/* ignore */}
  };

  // Keyboard shortcut: Ctrl/Cmd+S to save when autosave is off
  useEffect(() => {
    const onKeyDown = (e) => {
      const isSave = (e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey);
      if (isSave) {
        e.preventDefault();
        if (!autosave) handleSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [autosave, handleSave, rowData, localComments]);

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

  // State to control AI banner visibility
  const [showAIBanner, setShowAIBanner] = useState(true);

  // Main render
  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      {showAIBanner && (
        <div role="alert" aria-live="polite" style={{ background: '#ffeeba', color: '#222', padding: '8px 16px', marginBottom: 8, borderRadius: 4, border: '1px solid #f5c06f', fontWeight: 500 }}>
          AI features are currently disabled. <button aria-label="Dismiss AI notice" style={{ marginLeft: 16, background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontWeight: 600 }} onClick={() => setShowAIBanner(false)}>Dismiss</button>
        </div>
      )}
      {/* Controls bar: scroll, save, autosave, auto-hide, undo/redo */}
      <TableControlsBar
        theme={themeOverride}
        autosave={autosave}
        setAutosave={setAutosave}
        autoHide={autoHide}
        setAutoHide={setAutoHide}
        handleSave={handleSave}
        saveMsg={saveMsg}
  unsaved={unsaved}
        undoStack={undoStack}
        redoStack={redoStack}
        pushUndo={pushUndo}
        setUndoStack={setUndoStack}
        setRedoStack={setRedoStack}
        rowData={rowData}
        localComments={localComments}
        setRowData={setRowData}
        setLocalComments={setLocalComments}
        scrollTable={scrollTable}
        onBulkImport={onBulkImport}
      />
      {/* Config button */}
      <div style={{ margin:'0 0 8px' }}>
        <button onClick={()=> setConfigOpen(true)} style={{ padding:'4px 10px', background: appliedTheme.primary, color: appliedTheme.text, border:'1px solid #000', borderRadius:6, fontSize:12, fontWeight:700 }}>Table Config</button>
      </div>
      {saveMsg && <span style={{ color: '#388e3c', fontWeight: 'bold' }}>{saveMsg}</span>}

      {/* Unified scrollable table with sticky header & first column */}
      <div style={{ position: 'relative', width: '100%', maxWidth: '100vw', margin: '0 auto' }}>
  <div ref={unifiedScrollRef} style={{ position:'relative', border:'2px solid '+appliedTheme.primary, borderRadius:8, background:appliedTheme.background, width:'100%', boxSizing:'border-box', height:'70vh', maxHeight:'70vh', overflow:'auto', paddingBottom:8 }}>
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
            {/* Hide number input spinners when showArrows is false (default) */}
            {!showArrows && (
              <style>{`
                /* Chrome, Safari, Edge, Opera */
                input[type=number]::-webkit-outer-spin-button,
                input[type=number]::-webkit-inner-spin-button {
                  -webkit-appearance: none;
                  margin: 0;
                }
                /* Firefox */
                input[type=number] { -moz-appearance: textfield; }
              `}</style>
            )}
            <colgroup>
              <col style={{ width: 160 }} />
              {effectiveDates.map(d => (
                <col key={d.date} style={{ width: 80 }} />
              ))}
            </colgroup>
            <CompanyTableHeader
              dates={effectiveDates}
              todayKey={todayKey}
              todayColumnRef={todayColumnRef}
              hoverCell={hoverCell}
              activeCell={activeCell}
              setHoverCell={setHoverCell}
            />
            <tbody
              ref={tbodyRef}
              onMouseLeave={() => setHoverCell({ r: null, c: null })}
            >
              {sortedRows.map((row, idx) => (
                <CompanyRow
                  key={row.id}
                  row={row}
                  idx={idx}
                  dates={effectiveDates}
                  hiddenRows={hiddenRows}
      lastSavedById={lastSavedById}
                  manualHighlights={manualHighlights}
                  setManualHighlights={setManualHighlights}
                  inputRefs={inputRefs}
                  pushUndo={pushUndo}
                  setRowData={setRowData}
                  focusCell={focusCell}
                  hoverCell={hoverCell}
                  activeCell={activeCell}
                  setHoverCell={setHoverCell}
                  setActiveCell={setActiveCell}
                />
              ))}
              <TotalsRow rowData={rowsForTotals} dates={effectiveDates} />
              <FlightsRow type="Flights Out" dates={effectiveDates} flights={flightsOut} />
              <FlightsRow type="Flights In" dates={effectiveDates} flights={flightsIn} />
              <CommentsRow
                dates={effectiveDates}
                comments={localComments}
                lastSavedComments={lastSavedComments}
                manualHighlights={manualHighlights}
                setComments={setLocalComments}
                pushUndo={pushUndo}
              />
              {/* Spacer row so user can scroll until totals line reaches sticky header */}
              <tr>
                <td colSpan={1 + effectiveDates.length} style={{ padding:0, border:'none', height: 300 }} />
              </tr>
            </tbody>
          </table>
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
      <TableConfigModal
        open={configOpen}
        onClose={()=> setConfigOpen(false)}
        includeHiddenInTotals={includeHiddenInTotals}
        setIncludeHiddenInTotals={setIncludeHiddenInTotals}
        showArrows={showArrows}
        setShowArrows={setShowArrows}
      />
    </div>
  );
}

// Bulk preview cell styles
const bpTh = { padding:'4px 6px', border:'1px solid #999', background:'#f0f3f6', position:'sticky', top:0 };
const bpTd = { padding:'4px 6px', border:'1px solid #ccc', verticalAlign:'top' };
