import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from '../ThemeContext.jsx';

/* Personnel record shape (persisted in localStorage under 'personnelRecords')
{
  id: string (uuid-ish),
  firstName: string,
  lastName: string,
  company: string,
  position: string,
  crew: string, // crew identifier / crew name / crew number
  coreCrew: boolean, // indicates core crew -> enables contact/address fields
  primaryPhone?: string,
  secondaryPhone?: string,
  address?: string,
  dob?: string, // Date of Birth YYYY-MM-DD
  arrivalDate: YYYY-MM-DD,
  departureDate?: YYYY-MM-DD | '',
  status: 'Onboard' | 'Departed' | 'Pending',
  notes?: string
}
*/

const STORAGE_KEY = 'personnelRecords';

function loadRecords() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}
function saveRecords(recs) { localStorage.setItem(STORAGE_KEY, JSON.stringify(recs)); }

const blank = () => ({
  id: 'p_' + Math.random().toString(36).slice(2,9),
  firstName: '',
  lastName: '',
  company: '',
  position: '',
  location: '',
  crew: '',
  rotation: '',
  coreCrew: false,
  primaryPhone: '',
  secondaryPhone: '',
  address: '',
  dob: '',
  arrivalDate: new Date().toISOString().split('T')[0],
  departureDate: '',
  status: 'Onboard',
  notes: ''
});

export default function Personnel() {
  const { theme, team, changeTheme } = useTheme();
  const [records, setRecords] = useState(loadRecords);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(blank());
  // Company options sourced automatically from POB planner companies
  const [companyOptions, setCompanyOptions] = useState(() => {
    try {
      const data = JSON.parse(localStorage.getItem('pobPlannerData')) || [];
      return [...new Set(data.map(r => (r.company || '').trim()).filter(Boolean))].sort();
    } catch { return []; }
  });
  // Admin-managed option lists
  const loadList = (key) => {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
  };
  const [crewOptions, setCrewOptions] = useState(() => loadList('personnelCrewOptions'));
  const [locationOptions, setLocationOptions] = useState(() => loadList('personnelLocationOptions'));
  const [rotationOptions, setRotationOptions] = useState(() => loadList('personnelRotationOptions'));
  const [showAdmin, setShowAdmin] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Raw textarea values so user can insert blank new lines while typing
  const [crewOptionsText, setCrewOptionsText] = useState(() => (crewOptions.join('\n')));
  const [locationOptionsText, setLocationOptionsText] = useState(() => (locationOptions.join('\n')));
  const [rotationOptionsText, setRotationOptionsText] = useState(() => (rotationOptions.join('\n')));

  useEffect(() => { saveRecords(records); }, [records]);
  useEffect(() => { localStorage.setItem('personnelCrewOptions', JSON.stringify(crewOptions)); }, [crewOptions]);
  useEffect(() => { localStorage.setItem('personnelLocationOptions', JSON.stringify(locationOptions)); }, [locationOptions]);
  useEffect(() => { localStorage.setItem('personnelRotationOptions', JSON.stringify(rotationOptions)); }, [rotationOptions]);
  // Keep textareas in sync if lists change externally
  useEffect(() => { setCrewOptionsText(crewOptions.join('\n')); }, [crewOptions]);
  useEffect(() => { setLocationOptionsText(locationOptions.join('\n')); }, [locationOptions]);
  useEffect(() => { setRotationOptionsText(rotationOptions.join('\n')); }, [rotationOptions]);
  // Refresh company options when storage changes (other tab) or periodically while on page
  useEffect(() => {
    const load = () => {
      try {
        const data = JSON.parse(localStorage.getItem('pobPlannerData')) || [];
        const opts = [...new Set(data.map(r => (r.company || '').trim()).filter(Boolean))].sort();
        setCompanyOptions(opts);
      } catch { /* ignore */ }
    };
    const onStorage = (e) => { if (e.key === 'pobPlannerData') load(); };
    window.addEventListener('storage', onStorage);
    // Also poll lightly in-case same-tab edits happen without route change
    const interval = setInterval(load, 5000);
    return () => { window.removeEventListener('storage', onStorage); clearInterval(interval); };
  }, []);

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!(r.firstName + ' ' + r.lastName + ' ' + r.company + ' ' + r.position).toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [records, filter, search]);

  function startAdd() {
    setEditingId('new');
    setDraft(blank());
  }
  function startEdit(id) {
    const rec = records.find(r => r.id === id);
    if (!rec) return;
    setEditingId(id);
    setDraft({
      crew: '',
  rotation: '',
  location: '',
      coreCrew: false,
      primaryPhone: '',
      secondaryPhone: '',
      address: '',
      dob: '',
      ...rec
    }); // ensure new keys exist
  }
  function cancelEdit() {
    setEditingId(null);
    setDraft(blank());
  }
  function saveDraft() {
    if (!draft.firstName.trim() || !draft.lastName.trim()) return alert('Name required');
    // Duplicate check before saving
    const dups = potentialDuplicates();
    if (dups.length) {
      const names = dups.slice(0,5).map(d => `${d.firstName} ${d.lastName}`).join(', ');
      const proceed = window.confirm(`Possible duplicate${dups.length>1?'s':''} found: ${names}. Save anyway?`);
      if (!proceed) return;
    }
    if (editingId === 'new') {
      setRecords(rs => [...rs, { ...draft, id: 'p_' + Math.random().toString(36).slice(2,9) }]);
    } else {
      setRecords(rs => rs.map(r => r.id === editingId ? { ...draft } : r));
    }
    cancelEdit();
  }
  function remove(id) {
    if (!window.confirm('Delete this record?')) return;
    setRecords(rs => rs.filter(r => r.id !== id));
  }

  const borderColor = theme.name === 'Dark' ? '#bfc4ca' : '#444';

  // Date formatter for display: convert 'YYYY-MM-DD' -> 'MM/DD/YYYY'
  const fmtDate = (val) => {
    if (!val) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y,m,d] = val.split('-');
      return `${m}/${d}/${y}`;
    }
    // Attempt to parse other date-like values
    const dt = new Date(val);
    if (!isNaN(dt)) {
      const mm = String(dt.getMonth()+1).padStart(2,'0');
      const dd = String(dt.getDate()).padStart(2,'0');
      const yy = dt.getFullYear();
      return `${mm}/${dd}/${yy}`;
    }
    return val;
  };

  // --- Fuzzy duplicate detection helpers ---
  function norm(str='') { return str.toLowerCase().replace(/[^a-z0-9]/g,''); }
  function levenshtein(a,b){
    a=norm(a); b=norm(b); if(a===b) return 0; if(!a) return b.length; if(!b) return a.length;
    const v0=new Array(b.length+1), v1=new Array(b.length+1); for(let i=0;i<v0.length;i++) v0[i]=i;
    for(let i=0;i<a.length;i++){ v1[0]=i+1; for(let j=0;j<b.length;j++){ const cost=a[i]===b[j]?0:1; v1[j+1]=Math.min(v1[j]+1,v0[j+1]+1,v0[j]+cost);} for(let j=0;j<v0.length;j++) v0[j]=v1[j]; }
    return v1[b.length];
  }
  function similarName(a,b){ return levenshtein(a,b) <= 2 || (norm(a).startsWith(norm(b)) || norm(b).startsWith(norm(a))); }
  const potentialDuplicates = () => {
    if (!draft.firstName && !draft.lastName && !draft.company) return [];
    const comp = norm(draft.company);
    if (!comp) return [];
    return records.filter(r => (
      (!editingId || r.id !== editingId) && norm(r.company) === comp &&
      r.firstName && r.lastName &&
      similarName(r.firstName,draft.firstName) && similarName(r.lastName,draft.lastName)
    ));
  };
  const duplicateList = potentialDuplicates();

  // --- Auto-fit column widths (excluding Notes which can wrap) ---
  const tableRef = useRef(null);
  const [colWidths, setColWidths] = useState([]); // px widths
  useEffect(() => {
    // Defer until after DOM paint
    const handle = requestAnimationFrame(() => {
      if (!tableRef.current) return;
      const table = tableRef.current;
      const headerCells = Array.from(table.querySelectorAll('thead th'));
      if (!headerCells.length) return;
      const bodyRows = Array.from(table.querySelectorAll('tbody tr'));
      const newWidths = headerCells.map((th, colIdx) => {
        if (th.innerText === 'Notes') return null; // allow flexible wrapping later
        let max = th.getBoundingClientRect().width;
        // Check up to first 200 rows or fewer for performance
        for (let i = 0; i < Math.min(bodyRows.length, 200); i++) {
          const cell = bodyRows[i].children[colIdx];
            if (!cell) continue;
            const w = cell.getBoundingClientRect().width;
            if (w > max) max = w;
        }
        // Clamp width bounds
        max = Math.min(300, Math.max(50, Math.ceil(max)));
        return max;
      });
      setColWidths(newWidths);
    });
    return () => cancelAnimationFrame(handle);
  }, [filtered, theme.name]);
  // Recompute on window resize (debounced)
  useEffect(() => {
    let t; const onResize = () => { clearTimeout(t); t = setTimeout(() => setColWidths([]), 120); };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); clearTimeout(t); };
  }, []);

  return (
  <div style={{ padding: 24, color: theme.text, background: theme.background, minHeight: '100vh' }}>
      {/* Settings Gear */}
      <button
        onClick={() => setSettingsOpen(o => !o)}
        title="Settings"
        style={{ position:'fixed', top:14, right:20, zIndex:300, background:'transparent', border:'none', fontSize:24, cursor:'pointer', color: theme.primary }}
      >⚙️</button>
      {settingsOpen && (
        <div style={{ position:'fixed', top:50, right:16, zIndex:310, background: theme.surface, color: theme.text, border:`1px solid ${theme.primary}`, borderRadius:10, padding:'14px 16px', minWidth:220, boxShadow:'0 4px 14px rgba(0,0,0,0.35)' }}>
          <div style={{ fontWeight:'bold', marginBottom:8 }}>Settings</div>
          <label style={{ fontSize:12, display:'block', marginBottom:4 }}>Theme:</label>
          <select value={team} onChange={e => { changeTheme(e.target.value); setSettingsOpen(false); }} style={{ ...select(theme), width:'100%', marginBottom:12 }}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          <button onClick={() => { setShowAdmin(s => !s); setSettingsOpen(false); }} style={{ ...btn(theme), width:'100%', fontSize:12, background: showAdmin ? theme.secondary : theme.primary }}>
            {showAdmin ? 'Hide Manage Lists' : 'Manage Lists'}
          </button>
          <div style={{ marginTop:10 }}>
            <button onClick={() => setSettingsOpen(false)} style={{ ...btn(theme), width:'100%', fontSize:12 }}>Close</button>
          </div>
        </div>
      )}
  <h2 style={{ marginTop: 0, color: team === 'dark' ? theme.text : theme.primary }}>Personnel Database</h2>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <button onClick={startAdd} style={btn(theme)}>Add Person</button>
        <select value={filter} onChange={e => setFilter(e.target.value)} style={select(theme)}>
          <option value="all">All Statuses</option>
          <option value="Onboard">Onboard</option>
            <option value="Pending">Pending</option>
          <option value="Departed">Departed</option>
        </select>
        <input placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} style={input(theme)} />
      </div>
      {showAdmin && (
        <div style={{ marginBottom: 20, padding: 12, border: `1px solid ${borderColor}`, borderRadius: 8, background: theme.surface, display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', position:'relative' }}>
          <button
            onClick={() => setShowAdmin(false)}
            title="Close"
            style={{ position:'absolute', top:6, right:6, background:'transparent', border:'none', fontSize:18, cursor:'pointer', color: theme.text, lineHeight:1 }}
          >✖</button>
          <div>
            <h4 style={{ margin: '0 0 6px' }}>Crew Options</h4>
            <textarea
              rows={6}
              value={crewOptionsText}
              onChange={e => setCrewOptionsText(e.target.value)}
              onBlur={() => setCrewOptions(crewOptionsText.split(/\n/).map(v => v.trim()).filter(Boolean))}
              style={{ width: '100%', ...input(theme), resize: 'vertical', whiteSpace: 'pre', fontFamily: 'monospace' }}
              placeholder="One crew per line"
            />
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>Appears in Crew dropdown.</div>
          </div>
          <div>
            <h4 style={{ margin: '0 0 6px' }}>Location Options</h4>
            <textarea
              rows={6}
              value={locationOptionsText}
              onChange={e => setLocationOptionsText(e.target.value)}
              onBlur={() => setLocationOptions(locationOptionsText.split(/\n/).map(v => v.trim()).filter(Boolean))}
              style={{ width: '100%', ...input(theme), resize: 'vertical', whiteSpace: 'pre', fontFamily: 'monospace' }}
              placeholder="e.g. Platform A\nPlatform B\nRig 12"
            />
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>Appears in Location dropdown.</div>
          </div>
          <div>
            <h4 style={{ margin: '0 0 6px' }}>Rotation Options</h4>
            <textarea
              rows={6}
              value={rotationOptionsText}
              onChange={e => setRotationOptionsText(e.target.value)}
              onBlur={() => setRotationOptions(rotationOptionsText.split(/\n/).map(v => v.trim()).filter(Boolean))}
              style={{ width: '100%', ...input(theme), resize: 'vertical', whiteSpace: 'pre', fontFamily: 'monospace' }}
              placeholder="e.g. 14/14\n7/7\n28/28"
            />
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>Appears in Rotation dropdown.</div>
          </div>
        </div>
      )}
      {editingId && (
        <div style={{ marginBottom: 20, padding: 12, border: `1px solid ${borderColor}`, borderRadius: 8, background: theme.surface }}>
          <h3 style={{ margin: '0 0 8px' }}>{editingId === 'new' ? 'Add Personnel' : 'Edit Personnel'}</h3>
          {duplicateList.length > 0 && (
            <div style={{
              marginBottom: 12,
              padding: '8px 10px',
              background: theme.name==='Dark'? '#553' : '#fff3cd',
              border: '1px solid ' + (theme.name==='Dark'? '#aa8' : '#ffe08a'),
              borderRadius: 6,
              fontSize: 12
            }}>
              <strong>Possible duplicate{duplicateList.length>1?'s':''}:</strong> {duplicateList.slice(0,4).map(d => (
                <span key={d.id} style={{ marginRight: 8 }}>
                  <button
                    type="button"
                    onClick={() => startEdit(d.id)}
                    style={{ cursor:'pointer', background:'transparent', border:'none', color: theme.primary, textDecoration:'underline', padding:0 }}
                    title="Open this record"
                  >{d.firstName} {d.lastName}</button>
                </span>
              ))}
              {duplicateList.length>4 && '…'}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
            <Field label="First Name">
              <input value={draft.firstName} onChange={e => setDraft({ ...draft, firstName: e.target.value })} style={input(theme)} />
            </Field>
            <Field label="Last Name">
              <input value={draft.lastName} onChange={e => setDraft({ ...draft, lastName: e.target.value })} style={input(theme)} />
            </Field>
            <Field label="Company">
              <input list="companyOptionsList" value={draft.company} onChange={e => setDraft({ ...draft, company: e.target.value })} style={input(theme)} placeholder={companyOptions.length ? 'Start typing to select' : ''} />
              {companyOptions.length > 0 && (
                <datalist id="companyOptionsList">
                  {companyOptions.map(c => <option key={c} value={c} />)}
                </datalist>
              )}
            </Field>
            <Field label="Location">
              {locationOptions.length ? (
                <select value={draft.location} onChange={e => setDraft({ ...draft, location: e.target.value })} style={select(theme)}>
                  <option value="">-- Select Location --</option>
                  {locationOptions.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              ) : (
                <input value={draft.location} onChange={e => setDraft({ ...draft, location: e.target.value })} style={input(theme)} placeholder="Define locations in Manage Lists" />
              )}
            </Field>
            <Field label="Position">
              <input value={draft.position} onChange={e => setDraft({ ...draft, position: e.target.value })} style={input(theme)} />
            </Field>
            <Field label="Crew">
              {crewOptions.length ? (
                <select value={draft.crew} onChange={e => setDraft({ ...draft, crew: e.target.value })} style={select(theme)}>
                  <option value="">-- Select Crew --</option>
                  {crewOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : (
                <input value={draft.crew} onChange={e => setDraft({ ...draft, crew: e.target.value })} style={input(theme)} placeholder="Define crews in Manage Lists" />
              )}
            </Field>
            <Field label="Rotation">
              {rotationOptions.length ? (
                <select value={draft.rotation} onChange={e => setDraft({ ...draft, rotation: e.target.value })} style={select(theme)}>
                  <option value="">-- Select Rotation --</option>
                  {rotationOptions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              ) : (
                <input value={draft.rotation} onChange={e => setDraft({ ...draft, rotation: e.target.value })} style={input(theme)} placeholder="Define rotations in Manage Lists" />
              )}
            </Field>
            <Field label="Arrival Date">
              <input type="date" value={draft.arrivalDate} onChange={e => setDraft({ ...draft, arrivalDate: e.target.value })} style={input(theme)} />
            </Field>
            <Field label="Departure Date">
              <input type="date" value={draft.departureDate} onChange={e => setDraft({ ...draft, departureDate: e.target.value })} style={input(theme)} />
            </Field>
            <Field label="DOB">
              <input type="date" value={draft.dob} disabled={!draft.coreCrew} onChange={e => setDraft({ ...draft, dob: e.target.value })} style={{ ...input(theme), opacity: draft.coreCrew ? 1 : 0.5 }} />
            </Field>
            <Field label="Core Crew">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={!!draft.coreCrew}
                  onChange={e => {
                    const checked = e.target.checked;
                    setDraft(d => ({
                      ...d,
                      coreCrew: checked,
                      primaryPhone: checked ? d.primaryPhone : '',
                      secondaryPhone: checked ? d.secondaryPhone : '',
                      address: checked ? d.address : '',
                      dob: checked ? d.dob : ''
                    }));
                  }}
                  style={{ transform: 'scale(1.2)' }}
                />
                <span style={{ fontSize: 12 }}>Enable contact details</span>
              </div>
            </Field>
            <Field label="Primary Phone">
              <input
                value={draft.primaryPhone}
                disabled={!draft.coreCrew}
                onChange={e => setDraft({ ...draft, primaryPhone: e.target.value })}
                style={{ ...input(theme), opacity: draft.coreCrew ? 1 : 0.5 }}
                placeholder="(###) ###-####"
              />
            </Field>
            <Field label="Secondary Phone">
              <input
                value={draft.secondaryPhone}
                disabled={!draft.coreCrew}
                onChange={e => setDraft({ ...draft, secondaryPhone: e.target.value })}
                style={{ ...input(theme), opacity: draft.coreCrew ? 1 : 0.5 }}
                placeholder="optional"
              />
            </Field>
            <Field label="Address" full>
              <textarea
                value={draft.address}
                disabled={!draft.coreCrew}
                onChange={e => setDraft({ ...draft, address: e.target.value })}
                rows={2}
                style={{ ...input(theme), resize: 'vertical', opacity: draft.coreCrew ? 1 : 0.5 }}
                placeholder="Street, City, State"
              />
            </Field>
            <Field label="Status">
              <select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value })} style={select(theme)}>
                <option>Onboard</option>
                <option>Pending</option>
                <option>Departed</option>
              </select>
            </Field>
            <Field label="Notes" full>
              <textarea value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} rows={3} style={{ ...input(theme), resize: 'vertical' }} />
            </Field>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button onClick={saveDraft} style={btn(theme)}>Save</button>
            <button onClick={cancelEdit} style={btn(theme)}>Cancel</button>
            {editingId && editingId !== 'new' && (
              <button
                onClick={() => { if (window.confirm('Delete this record?')) { remove(editingId); } }}
                style={{ ...btn(theme), background: '#922', borderColor: '#b55' }}
              >Delete</button>
            )}
          </div>
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table ref={tableRef} style={{ borderCollapse: 'collapse', width: 'auto', minWidth: 720, tableLayout: 'auto' }}>
          {colWidths.length > 0 && (
            <colgroup>
              {colWidths.map((w, i) => w ? <col key={i} style={{ width: w + 'px' }} /> : <col key={i} />)}
            </colgroup>
          )}
          <thead>
            <tr>
              {['Actions','First','Last','Company','Position','Location','Crew','Rotation','Core','Arrival','Departure','Status','DOB','Days Onboard','Days Since Departed','Notes'].map(h => (
                <th
                  key={h}
                  style={{ border: `1px solid ${borderColor}`, background: theme.primary, color: theme.text, padding: '4px 6px', fontSize: 12, whiteSpace: 'nowrap' }}
                >{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const incomplete = r.coreCrew && (!r.primaryPhone || !r.address || !r.dob);
              const missing = [];
              if (r.coreCrew) {
                if (!r.primaryPhone) missing.push('Primary Phone');
                if (!r.address) missing.push('Address');
                if (!r.dob) missing.push('DOB');
              }
              // Day calculations
              const today = new Date();
              const parseDate = (v) => { const d = v ? new Date(v + 'T00:00:00') : null; return isNaN(d) ? null : d; };
              const arr = parseDate(r.arrivalDate);
              const dep = parseDate(r.departureDate);
              const dayDiff = (a,b) => a && b ? Math.floor((b - a) / 86400000) : null;
              let daysOnboardDisplay = '';
              let daysSinceDepartedDisplay = '';
              if (r.status === 'Onboard' && arr) {
                const d = dayDiff(arr, today);
                if (d != null) daysOnboardDisplay = (d + 1) + 'd';
              } else if (r.status === 'Departed' && arr && dep) {
                const tenure = dayDiff(arr, dep);
                if (tenure != null) daysOnboardDisplay = (tenure + 1) + 'd';
                const since = dayDiff(dep, today);
                if (since != null) daysSinceDepartedDisplay = since + 'd';
              }
              return (
              <tr key={r.id} style={{ background: incomplete ? (theme.name === 'Dark' ? '#402323' : '#ffe7e7') : theme.surface }}>
                <td style={cell(theme)}>
                  <button onClick={() => startEdit(r.id)} style={miniBtn(theme)}>Edit</button>
                </td>
                <td style={cell(theme)}>
                  {incomplete && <span title={missing.length ? 'Missing: ' + missing.join(', ') : ''} style={{ color: theme.name === 'Dark' ? '#ffb3b3' : '#b30000', marginRight: 4 }}>⚠</span>}
                  {r.firstName}
                </td>
                <td style={cell(theme)}>{r.lastName}</td>
                <td style={cell(theme)}>{r.company}</td>
                <td style={cell(theme)}>{r.position}</td>
                <td style={cell(theme)}>{r.location}</td>
                <td style={cell(theme)}>{r.crew}</td>
                <td style={cell(theme)}>{r.rotation}</td>
                <td style={cell(theme)}>{r.coreCrew ? 'Yes' : ''}</td>
                <td style={cell(theme)}>{fmtDate(r.arrivalDate)}</td>
                <td style={cell(theme)}>{fmtDate(r.departureDate)}</td>
                <td style={cell(theme)}>{r.status}</td>
                <td style={cell(theme)}>{fmtDate(r.dob)}</td>
                <td style={cell(theme)}>{daysOnboardDisplay}</td>
                <td style={cell(theme)}>{daysSinceDepartedDisplay}</td>
                <td style={{ ...cell(theme), whiteSpace: 'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth: 500 }} title={r.notes}>{r.notes}</td>
              </tr>
            );})}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={16} style={{ ...cell(theme), textAlign: 'center', fontStyle: 'italic' }}>No records</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 12, fontSize: 11, opacity: 0.6 }}>Stored locally. Future integration: link planner company rosters, flight manifests.</div>
    </div>
  );
}

function Field({ label, children, full }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, gridColumn: full ? '1 / -1' : undefined }}>
      <span style={{ fontWeight: 'bold' }}>{label}</span>
      {children}
    </label>
  );
}

const btn = (theme) => ({ background: theme.primary, color: theme.text, border: '1px solid ' + theme.secondary, padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' });
// Use lighter neutral border in dark mode for better contrast (replaces blue outline in form)
const select = (theme) => {
  const borderCol = theme.name === 'Dark' ? '#bfc4ca' : theme.primary;
  return { background: theme.background, color: theme.text, border: '1px solid ' + borderCol, padding: '4px 8px', borderRadius: 4 };
};
const input = (theme) => {
  const borderCol = theme.name === 'Dark' ? '#bfc4ca' : theme.primary;
  return { background: theme.background, color: theme.text, border: '1px solid ' + borderCol, padding: '4px 8px', borderRadius: 4 };
};
const cell = (theme) => ({ border: '1px solid ' + (theme.name === 'Dark' ? '#bfc4ca40' : '#444'), padding: '4px 6px', fontSize: 12, verticalAlign: 'top', whiteSpace: 'nowrap' });
const miniBtn = (theme) => ({ background: theme.secondary, color: theme.text, border: 'none', padding: '2px 6px', borderRadius: 4, cursor: 'pointer', fontSize: 11, marginRight: 4 });
