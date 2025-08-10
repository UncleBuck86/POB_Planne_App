// EditCompaniesModal.jsx
// Renders the modal for editing company names, pinning, hiding, and removing companies
import React from 'react';

export default function EditCompaniesModal({ editing, editCompanies, setEditCompanies, pinnedCompanies, setPinnedCompanies, hiddenRows, toggleRow, addCompany, removeCompany, saveCompanies, setEditing }) {
  if (!editing) return null; // Only show modal if editing
  return (
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
            <button
              onClick={() => {
                const company = editCompanies[idx];
                toggleRow(company, !hiddenRows.includes(company));
              }}
              style={{ fontSize: '0.8em', padding: '2px 8px', marginLeft: 4, background: hiddenRows.includes(name) ? '#ffcdd2' : '#eee', border: '1px solid #bbb', borderRadius: 4 }}
            >
              {hiddenRows.includes(name) ? 'Unhide' : 'Hide'}
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
  );
}
