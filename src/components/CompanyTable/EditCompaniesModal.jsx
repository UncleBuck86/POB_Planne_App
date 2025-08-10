// EditCompaniesModal.jsx
// Renders the modal for editing company names, pinning, hiding, and removing companies
import React, { useMemo } from 'react';

export default function EditCompaniesModal({ editing, editCompanies, setEditCompanies, pinnedCompanies, setPinnedCompanies, hiddenRows, toggleRow, addCompany, removeCompany, saveCompanies, setEditing }) {
  if (!editing) return null;
  // Derive validation + duplicate info
  const { hasDuplicates, duplicateNames, hasBlank } = useMemo(() => {
    const trimmed = editCompanies.map(c => c.company.trim());
    const counts = trimmed.reduce((acc, n) => {
      if (!n) return acc;
      acc[n.toLowerCase()] = (acc[n.toLowerCase()] || 0) + 1;
      return acc;
    }, {});
    const dups = Object.keys(counts).filter(k => counts[k] > 1);
    const hasBlankLocal = trimmed.some(n => !n);
    return { hasDuplicates: dups.length > 0, duplicateNames: dups, hasBlank: hasBlankLocal };
  }, [editCompanies]);

  const reorderPinned = (id, dir) => {
    setPinnedCompanies(prev => {
      const arr = [...prev];
      const idx = arr.indexOf(id);
      if (idx === -1) return prev;
      if (dir === 'up' && idx > 0) {
        [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      } else if (dir === 'down' && idx < arr.length - 1) {
        [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
      }
      return arr;
    });
  };
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', zIndex: 1000 }}>
      <div style={{ background: '#fff', padding: 24, borderRadius: 8, maxWidth: 420, margin: '60px auto', boxShadow: '0 2px 12px #333', position: 'relative' }}>
        <h3>Edit Companies</h3>
        {hasDuplicates && (
          <div style={{ color: '#d32f2f', fontSize: 12, marginBottom: 8 }}>
            Duplicate names: {duplicateNames.join(', ')}
          </div>
        )}
        {!hasDuplicates && hasBlank && (
          <div style={{ color: '#f57c00', fontSize: 12, marginBottom: 8 }}>
            Blank names will be ignored until filled in.
          </div>
        )}
        {editCompanies.map((c, idx) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 8, gap: 4 }}>
            <input
              type="text"
              value={c.company}
              onChange={e => {
                const val = e.target.value;
                setEditCompanies(prev => prev.map((row, i) => i === idx ? { ...row, company: val } : row));
              }}
              style={{ flex: 1, marginRight: 4 }}
            />
            <button onClick={() => removeCompany(idx)} style={{ fontSize: '0.7em', padding: '2px 8px', background: '#eee', border: '1px solid #bbb', borderRadius: 4 }}>Remove</button>
            <div style={{ display: 'flex', gap: 2 }}>
              <button
                onClick={() => {
                  setPinnedCompanies(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]);
                }}
                title={pinnedCompanies.includes(c.id) ? 'Unpin company' : 'Pin company'}
                style={{ fontSize: '0.7em', padding: '2px 8px', background: pinnedCompanies.includes(c.id) ? '#90caf9' : '#eee', border: '1px solid #bbb', borderRadius: 4 }}
              >
                {pinnedCompanies.includes(c.id) ? 'Unpin' : 'Pin'}
              </button>
              {pinnedCompanies.includes(c.id) && (
                <>
                  <button
                    onClick={() => reorderPinned(c.id, 'up')}
                    title="Move up"
                    disabled={pinnedCompanies.indexOf(c.id) === 0}
                    style={{ fontSize: '0.7em', padding: '2px 6px', background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 4, opacity: pinnedCompanies.indexOf(c.id) === 0 ? 0.4 : 1 }}
                  >↑</button>
                  <button
                    onClick={() => reorderPinned(c.id, 'down')}
                    title="Move down"
                    disabled={pinnedCompanies.indexOf(c.id) === pinnedCompanies.length - 1}
                    style={{ fontSize: '0.7em', padding: '2px 6px', background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 4, opacity: pinnedCompanies.indexOf(c.id) === pinnedCompanies.length - 1 ? 0.4 : 1 }}
                  >↓</button>
                </>
              )}
            </div>
            <button
              onClick={() => toggleRow(c.id, !hiddenRows.includes(c.id))}
              style={{ fontSize: '0.7em', padding: '2px 8px', background: hiddenRows.includes(c.id) ? '#ffcdd2' : '#eee', border: '1px solid #bbb', borderRadius: 4 }}
            >
              {hiddenRows.includes(c.id) ? 'Unhide' : 'Hide'}
            </button>
          </div>
        ))}
        <button onClick={addCompany} style={{ marginTop: 8, fontSize: '0.8em', padding: '4px 12px', background: '#e0e0e0', border: '1px solid #bbb', borderRadius: 4 }}>Add Company</button>
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <button
            onClick={saveCompanies}
            disabled={hasDuplicates}
            style={{ marginRight: 8, fontWeight: 'bold', padding: '4px 12px', background: hasDuplicates ? '#9e9e9e' : '#4caf50', color: '#fff', border: 'none', borderRadius: 4, cursor: hasDuplicates ? 'not-allowed' : 'pointer', position: 'relative' }}
          >
            Save
            {hasDuplicates && (
              <span style={{ position: 'absolute', bottom: -14, left: 0, fontSize: 10, color: '#d32f2f', fontWeight: 'normal' }}>Resolve duplicates</span>
            )}
          </button>
          <button onClick={() => setEditing(false)} style={{ padding: '4px 12px', background: '#bbb', border: 'none', borderRadius: 4 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
