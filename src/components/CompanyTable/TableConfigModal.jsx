// TableConfigModal.jsx
// Simple modal to control table defaults
import React from 'react';

export default function TableConfigModal({ open, onClose, includeHiddenInTotals, setIncludeHiddenInTotals }) {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:1000 }} onClick={(e)=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:'#fff', color:'#222', width:'min(520px, 92vw)', margin:'80px auto', padding:'16px 16px 18px', borderRadius:10, boxShadow:'0 10px 28px rgba(0,0,0,.35)', border:'1px solid #ccc' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <h3 style={{ margin:0 }}>Table Configuration</h3>
          <button onClick={onClose} style={{ padding:'4px 8px', border:'1px solid #888', borderRadius:6, background:'#eee' }}>Close</button>
        </div>
        <div style={{ display:'grid', gap:12 }}>
          <label style={{ display:'flex', alignItems:'center', gap:8 }}>
            <input
              type="checkbox"
              checked={includeHiddenInTotals}
              onChange={e=> setIncludeHiddenInTotals(e.target.checked)}
            />
            Include hidden rows in totals
          </label>
          {/* Future defaults can be added here */}
        </div>
      </div>
    </div>
  );
}
