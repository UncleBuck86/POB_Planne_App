import React, { useState, useRef, useEffect } from 'react';
import { generateFlightComments } from '../utils/generateFlightComment'; // adjust if your filename differs

export default function CompanyTable({ rowData, setRowData, dates, comments, setComments, todayColumnRef }) {
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [manualHighlights, setManualHighlights] = useState({});
  const [saveMsg, setSaveMsg] = useState('');
  const [localComments, setLocalComments] = useState(comments);
  const [autosave, setAutosave] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editCompanies, setEditCompanies] = useState(rowData.map(r => r.company));
  const [pinnedCompanies, setPinnedCompanies] = useState([]);
  const [hiddenRows, setHiddenRows] = useState([]);
  const [lastSavedData, setLastSavedData] = useState(rowData);
  const [lastSavedComments, setLastSavedComments] = useState(localComments);
  const [flightsOut, setFlightsOut] = useState({});
  const [flightsIn, setFlightsIn] = useState({});
  const inputRefs = useRef([]);

  // Merge inbound/outbound flights into a comments string per date
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

  // Regenerate flights/comments whenever rowData or dates change
  useEffect(() => {
    const { flightsOut: out, flightsIn: inn } = generateFlightComments(rowData, dates);
    setFlightsOut(out);
    setFlightsIn(inn);
    const merged = generateMergedComments(out, inn);
    setLocalComments(prev => ({ ...prev, ...merged }));
    setComments(prev => ({ ...prev, ...merged }));
  }, [rowData, dates, setComments]);

  // Autosave to localStorage
  useEffect(() => {
    if (autosave) {
      localStorage.setItem('pobPlannerData', JSON.stringify(rowData));
      localStorage.setItem('pobPlannerComments', JSON.stringify(localComments));
      setLastSavedData(rowData);
      setLastSavedComments(localComments);
    }
  }, [rowData, localComments, autosave]);

  // Push current state onto the undo stack
  const pushUndo = () => {
    setUndoStack(prev => [
      ...prev,
      { rowData: JSON.parse(JSON.stringify(rowData)), localComments: { ...localComments } }
    ]);
    setRedoStack([]);
  };

  // Cell focus helper
  const focusCell = (rowIdx, colIdx) => {
    if (inputRefs.current[rowIdx] && inputRefs.current[rowIdx][colIdx]) {
      inputRefs.current[rowIdx][colIdx].focus();
    }
  };

  // Edit companies modal logic
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

  // Hide/unhide row
  const toggleRow = (company, hide) => {
    setHiddenRows(prev => hide ? [...prev, company] : prev.filter(c => c !== company));
  };

  // Manual save
  const handleSave = () => {
    localStorage.setItem('pobPlannerData', JSON.stringify(rowData));
    localStorage.setItem('pobPlannerComments', JSON.stringify(localComments));
    setLastSavedData(rowData);
    setLastSavedComments(localComments);
    setSaveMsg('Saved!');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  return (
    <div>
      {/* Controls */}
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
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
        <button onClick={pushUndo} style={{ padding: '4px 12px', background: '#e3f2fd', border: '1px solid #bbb', borderRadius: 4 }}>
          Undo
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
      </div>

      {/* Edit Companies Modal */}
      {editing && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, maxWidth: 400, margin: '60px auto', boxShadow: '0 2px 12px #333', position: 'relative' }}>
            <h3>Edit Companies</h3>
            {editCompanies.map((name, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <input
                  type="text"
                  value={name}
                  onChange={e => {
                    const val = e.target.value;
                    setEditCompanies(prev => prev.map((n, i) => (i === idx ? val : n)));
                  }}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <button onClick={() => removeCompany(idx)} style={{ fontSize: '0.8em', padding: '2px 8px', background: '#eee', border: '1px solid #bbb', borderRadius: 4 }}>Remove</button>
                <button
                  onClick={() => {
                    const company = editCompanies[idx];
                    setPinnedCompanies(prev => (prev.includes(company) ? prev.filter(c => c !== company) : [...prev, company]));
                  }}
                  style={{ fontSize: '0.8em', padding: '2px 8px', marginLeft: 4, background: pinnedCompanies.includes(name) ? '#90caf9' : '#eee', border: '1px solid #bbb', borderRadius: 4 }}
                >
                  {pinnedCompanies.includes(name) ? 'Unpin' : 'Pin'}
                </button>
              </div>
            ))}
            <button onClick={addCompany} style={{ marginTop: 8, fontSize: '0.9em', padding: '4px 12px', background: '#e0e0e0', border: '1px solid #bbb', borderRadius: 4 }}>Add Company</button>
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <button onClick={saveCompanies} style={{ marginRight: 8, fontWeight: 'bold', padding: '4px 12px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: 4 }}>Save</button>
              <button onClick={() => setEditing(false)} style={{ padding: '4px 12px', background: '#bbb', border: 'none', borderRadius: 4 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div style={{ overflowX: 'auto' }}>
        <table border="1" cellPadding="6" style={{ width: 'auto', borderCollapse: 'collapse', tableLayout: 'auto' }}>
          <thead>
            <tr>
              <th style={{ minWidth: 160, textAlign: 'left' }}>
                Company
                <span style={{ fontWeight: 'normal', fontSize: '0.7em', marginLeft: 8 }}>Hide</span>
              </th>
              {dates.map(d => (
                <th key={d.date}>
                  {d.date}<br /><span style={{ fontSize: 'smaller' }}>{d.day}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowData.map((row, idx) => (
              <tr key={row.company || idx} style={{ display: hiddenRows.includes(row.company) ? 'none' : '' }}>
                <td style={{ minWidth: 160, textAlign: 'left' }}>
                  <span>{row.company}</span>
                  <input
                    type="checkbox"
                    checked={hiddenRows.includes(row.company)}
                    onChange={e => toggleRow(row.company, e.target.checked)}
                    style={{ marginLeft: 8, transform: 'scale(0.7)', verticalAlign: 'middle' }}
                    title="Hide row"
                  />
                </td>
                {dates.map((d, colIdx) => {
                  const lastSavedVal = lastSavedData[idx]?.[d.date] ?? '';
                  const currVal = row[d.date] ?? '';
                  const changed = String(currVal) !== String(lastSavedVal);
                  const cellKey = `${idx}-${d.date}`; // ensure template string with backticks
                  const manuallyHighlighted = manualHighlights[cellKey];
                  let bgColor = '';
                  if (manuallyHighlighted) {
                    bgColor = '#b3e5fc';
                  } else if (changed) {
                    bgColor = '#ffeeba';
                  }
                  return (
                    <td
                      key={d.date}
                      style={bgColor ? { background: bgColor } : {}}
                      onDoubleClick={() => {
                        setManualHighlights(prev => ({
                          ...prev,
                          [cellKey]: !prev[cellKey]
                        }));
                      }}
                    >
                      <input
                        type="number"
                        value={currVal}
                        min={0}
                        style={{ width: '60px', textAlign: 'center', background: bgColor || undefined }}
                        ref={el => {
                          if (!inputRefs.current[idx]) inputRefs.current[idx] = [];
                          inputRefs.current[idx][colIdx] = el;
                        }}
                        onChange={e => {
                          pushUndo();
                          const newValue = e.target.value === '' ? '' : Number(e.target.value);
                          setRowData(prev => prev.map((r, i) => (i === idx ? { ...r, [d.date]: newValue } : r)));
                        }}
                        onKeyDown={e => {
                          if (e.key === 'ArrowRight') {
                            e.preventDefault();
                            focusCell(idx, colIdx + 1);
                          } else if (e.key === 'ArrowLeft') {
                            e.preventDefault();
                            focusCell(idx, colIdx - 1);
                          } else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            focusCell(idx + 1, colIdx);
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            focusCell(idx - 1, colIdx);
                          }
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* Totals row */}
            <tr style={{ background: '#e0e0e0', fontWeight: 'bold' }}>
              <td>Total Daily POB</td>
              {dates.map(d => {
                const total = rowData.reduce((sum, row) => sum + (Number(row[d.date]) || 0), 0);
                return <td key={d.date}>{total}</td>;
              })}
            </tr>
            {/* Flights Out row */}
            <tr style={{ background: '#f5f5f5', fontWeight: 'bold', height: 'auto' }}>
              <td style={{ verticalAlign: 'top' }}>Flights Out</td>
              {dates.map(d => (
                <td key={d.date} style={{ verticalAlign: 'top', whiteSpace: 'pre-wrap' }}>
                  {flightsOut[d.date]?.join(', ') || ''}
                </td>
              ))}
            </tr>
            {/* Flights In row */}
            <tr style={{ background: '#f5f5f5', fontWeight: 'bold', height: 'auto' }}>
              <td style={{ verticalAlign: 'top' }}>Flights In</td>
              {dates.map(d => (
                <td key={d.date} style={{ verticalAlign: 'top', whiteSpace: 'pre-wrap' }}>
                  {flightsIn[d.date]?.join(', ') || ''}
                </td>
              ))}
            </tr>
            {/* Comments row */}
            <tr style={{ background: '#f0f0f0', fontStyle: 'italic', height: 'auto' }}>
              <td style={{ verticalAlign: 'top' }}>Comments</td>
              {dates.map(d => (
                <td key={d.date} style={{ verticalAlign: 'top', whiteSpace: 'pre-wrap' }}>
                  <textarea
                    value={localComments[d.date] || ''}
                    style={{
                      width: '100%',
                      minHeight: '48px',
                      fontStyle: 'italic',
                      background:
                        manualHighlights[`comment-${d.date}`]
                          ? '#b3e5fc'
                          : localComments[d.date] !== (lastSavedComments[d.date] || '')
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
                      setLocalComments(prev => ({ ...prev, [d.date]: val }));
                      setComments(prev => ({ ...prev, [d.date]: val }));
                      const ta = e.target;
                      ta.style.height = 'auto';
                      ta.style.height = `${ta.scrollHeight}px`;
                    }}
                    onDoubleClick={() => {
                      const key = `comment-${d.date}`;
                      setManualHighlights(prev => ({
                        ...prev,
                        [key]: !prev[key]
                      }));
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
    </div>
  );
}
