// EditCompaniesModal.jsx
// Renders the modal for editing company names, pinning, hiding, and removing companies
import React, { useMemo, useRef } from 'react';

export default function EditCompaniesModal({ editing, editCompanies, setEditCompanies, pinnedCompanies, setPinnedCompanies, hiddenRows, toggleRow, addCompany, removeCompany, saveCompanies, setEditing }) {
  if (!editing) return null;
  // Derive validation + duplicate info
  const { hasDuplicates, duplicateNames, hasBlank, fuzzySet, fuzzyGroups } = useMemo(() => {
    const trimmed = editCompanies.map(c => c.company.trim()).filter(Boolean);
    const counts = trimmed.reduce((acc, n) => {
      acc[n.toLowerCase()] = (acc[n.toLowerCase()] || 0) + 1;
      return acc;
    }, {});
    const dups = Object.keys(counts).filter(k => counts[k] > 1);
    const allNames = Array.from(new Set(trimmed.map(n => n))); // preserve case
    // Levenshtein distance (iterative DP) small optimization for short strings
    const lev = (a,b) => {
      if(a===b) return 0; if(!a) return b.length; if(!b) return a.length;
      const m=a.length, n=b.length; const prev = new Array(n+1); const cur = new Array(n+1);
      for(let j=0;j<=n;j++) prev[j]=j;
      for(let i=1;i<=m;i++) { cur[0]=i; const ca=a.charCodeAt(i-1);
        for(let j=1;j<=n;j++) { const cb=b.charCodeAt(j-1); const cost = ca===cb?0:1; cur[j]=Math.min(prev[j]+1, cur[j-1]+1, prev[j-1]+cost); }
        for(let j=0;j<=n;j++) prev[j]=cur[j];
      }
      return prev[n];
    };
    const norm = (s)=> s.toLowerCase().replace(/[^a-z0-9]/g,'');
    const fuzzyPairs = [];
    const fuzzySetLocal = new Set();
    for(let i=0;i<allNames.length;i++){
      for(let j=i+1;j<allNames.length;j++){
        const a=allNames[i], b=allNames[j];
        const an=norm(a), bn=norm(b);
        if(!an || !bn) continue;
        // Skip if already exact duplicate flagged
        if(a.toLowerCase()===b.toLowerCase()) continue;
        const maxLen=Math.max(an.length,bn.length);
        if(maxLen<4) continue; // ignore very short
        const distance = lev(an,bn);
        const similarity = 1 - distance / maxLen;
        if(similarity >= 0.85) { // threshold
          fuzzyPairs.push([a,b]);
          fuzzySetLocal.add(a.toLowerCase());
          fuzzySetLocal.add(b.toLowerCase());
        }
      }
    }
    // Merge fuzzy pairs into groups
    const groups=[]; const used=new Set();
    fuzzyPairs.forEach(([a,b])=>{
      if(used.has(a) || used.has(b)) return; // naive grouping
      const group=[a,b]; used.add(a); used.add(b);
      // collect other connected names
      for(const [x,y] of fuzzyPairs){
        if(group.includes(x)||group.includes(y)){
          if(!group.includes(x)) group.push(x), used.add(x);
          if(!group.includes(y)) group.push(y), used.add(y);
        }
      }
      groups.push(group);
    });
    const hasBlankLocal = editCompanies.some(c => !c.company.trim());
    return { hasDuplicates: dups.length > 0, duplicateNames: dups, hasBlank: hasBlankLocal, fuzzySet: fuzzySetLocal, fuzzyGroups: groups };
  }, [editCompanies]);

  // Helper to reorder editCompanies to match pinned order followed by alpha of remaining
  const reorderEditCompanies = (companies, pinnedOrder) => {
    const byId = new Map(companies.map(c => [c.id, c]));
    const pinned = pinnedOrder.map(id => byId.get(id)).filter(Boolean);
    const rest = companies.filter(c => !pinnedOrder.includes(c.id)).sort((a, b) => {
      const aName = (a.company || '').toLowerCase();
      const bName = (b.company || '').toLowerCase();
      if (!aName && !bName) return 0;
      if (!aName) return 1;
      if (!bName) return -1;
      return aName.localeCompare(bName);
    });
    return [...pinned, ...rest];
  };

  const listRef = useRef(null);
  const preserveScroll = (fn) => {
    const el = listRef.current; const top = el ? el.scrollTop : 0; fn(); if(el) { el.scrollTop = top; }
  };
  const reorderPinned = (id, dir) => {
    preserveScroll(()=>{
      setPinnedCompanies(prev => {
        const arr = [...prev];
        const idx = arr.indexOf(id);
        if (idx === -1) return prev;
        if (dir === 'up' && idx > 0) {
          [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
        } else if (dir === 'down' && idx < arr.length - 1) {
          [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
        }
        setEditCompanies(prevCompanies => reorderEditCompanies(prevCompanies, arr));
        return arr;
      });
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
        {!hasDuplicates && fuzzyGroups.length>0 && (
          <div style={{ color:'#d84315', fontSize:11, marginBottom:8 }}>
            Possible duplicates (similar): {fuzzyGroups.map((g,i)=> g.join(' / ')).join('; ')}
          </div>
        )}
        {!hasDuplicates && hasBlank && (
          <div style={{ color: '#f57c00', fontSize: 12, marginBottom: 8 }}>
            Blank names will be ignored until filled in.
          </div>
        )}
  <div ref={listRef} style={{ maxHeight: '50vh', overflowY: 'auto', paddingRight: 4, margin: '8px 0 4px', border: '1px solid #ddd', borderRadius: 6 }}>
          {editCompanies.map((c, idx) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 4px', borderBottom: '1px solid #eee' }}>
              <input
                type="text"
                value={c.company}
                onChange={e => {
                  const val = e.target.value;
                  setEditCompanies(prev => prev.map((row, i) => i === idx ? { ...row, company: val } : row));
                }}
                style={{ flex: 1, marginRight: 4, border:'1px solid '+(
                  duplicateNames.includes((c.company||'').toLowerCase()) || fuzzySet.has((c.company||'').toLowerCase()) ? '#d32f2f' : '#bbb'
                ), background: duplicateNames.includes((c.company||'').toLowerCase()) ? '#ffebee' : (fuzzySet.has((c.company||'').toLowerCase()) ? '#fff3e0':'#fff') }}
                title={duplicateNames.includes((c.company||'').toLowerCase()) ? 'Exact duplicate' : (fuzzySet.has((c.company||'').toLowerCase()) ? 'Possible duplicate (similar name)' : '')}
              />
              <button onClick={() => removeCompany(c.id)} style={{ fontSize: '0.65em', padding: '2px 6px', background: '#eee', border: '1px solid #bbb', borderRadius: 4 }}>Remove</button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button
                  onClick={() => {
                    preserveScroll(()=>{
                      setPinnedCompanies(prev => {
                        let next;
                        if (prev.includes(c.id)) {
                          next = prev.filter(id => id !== c.id);
                        } else {
                          next = [...prev, c.id];
                        }
                        setEditCompanies(prevCompanies => reorderEditCompanies(prevCompanies, next));
                        return next;
                      });
                    });
                  }}
                  title={pinnedCompanies.includes(c.id) ? 'Unpin company' : 'Pin company'}
                  style={{ fontSize: '0.6em', padding: '2px 6px', background: pinnedCompanies.includes(c.id) ? '#90caf9' : '#eee', border: '1px solid #bbb', borderRadius: 4 }}
                >
                  {pinnedCompanies.includes(c.id) ? 'Unpin' : 'Pin'}
                </button>
                {pinnedCompanies.includes(c.id) && (
                  <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                    <button
                      onClick={() => reorderPinned(c.id, 'up')}
                      title="Move up"
                      disabled={pinnedCompanies.indexOf(c.id) === 0}
                      style={{ fontSize: '0.55em', padding: '2px 4px', background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 4, opacity: pinnedCompanies.indexOf(c.id) === 0 ? 0.4 : 1 }}
                    >↑</button>
                    <button
                      onClick={() => reorderPinned(c.id, 'down')}
                      title="Move down"
                      disabled={pinnedCompanies.indexOf(c.id) === pinnedCompanies.length - 1}
                      style={{ fontSize: '0.55em', padding: '2px 4px', background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 4, opacity: pinnedCompanies.indexOf(c.id) === pinnedCompanies.length - 1 ? 0.4 : 1 }}
                    >↓</button>
                  </div>
                )}
              </div>
              <button
                onClick={() => toggleRow(c.id, !hiddenRows.includes(c.id))}
                style={{ fontSize: '0.6em', padding: '2px 6px', background: hiddenRows.includes(c.id) ? '#ffcdd2' : '#eee', border: '1px solid #bbb', borderRadius: 4 }}
              >
                {hiddenRows.includes(c.id) ? 'Unhide' : 'Hide'}
              </button>
            </div>
          ))}
          {editCompanies.length === 0 && <div style={{ padding: 8, fontSize: 12, fontStyle: 'italic', opacity: 0.6 }}>No companies yet.</div>}
        </div>
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
