import React, { useState, useEffect, useMemo } from 'react';
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
  const { theme, team } = useTheme();
  const [records, setRecords] = useState(loadRecords);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(blank());
  // Admin-managed option lists
  const loadList = (key) => {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
  };
  const [crewOptions, setCrewOptions] = useState(() => loadList('personnelCrewOptions'));
  const [rotationOptions, setRotationOptions] = useState(() => loadList('personnelRotationOptions'));
  const [showAdmin, setShowAdmin] = useState(false);
  // Raw textarea values so user can insert blank new lines while typing
  const [crewOptionsText, setCrewOptionsText] = useState(() => (crewOptions.join('\n')));
  const [rotationOptionsText, setRotationOptionsText] = useState(() => (rotationOptions.join('\n')));

  useEffect(() => { saveRecords(records); }, [records]);
  useEffect(() => { localStorage.setItem('personnelCrewOptions', JSON.stringify(crewOptions)); }, [crewOptions]);
  useEffect(() => { localStorage.setItem('personnelRotationOptions', JSON.stringify(rotationOptions)); }, [rotationOptions]);
  // Keep textareas in sync if lists change externally
  useEffect(() => { setCrewOptionsText(crewOptions.join('\n')); }, [crewOptions]);
  useEffect(() => { setRotationOptionsText(rotationOptions.join('\n')); }, [rotationOptions]);

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

  return (
    <div style={{ padding: 24, color: theme.text }}>
      <h2 style={{ marginTop: 0, color: team === 'dark' ? theme.text : theme.primary }}>Personnel Database</h2>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <button onClick={startAdd} style={btn(theme)}>Add Person</button>
        <button onClick={() => setShowAdmin(s => !s)} style={btn(theme)}>{showAdmin ? 'Close Admin Lists' : 'Manage Lists'}</button>
        <select value={filter} onChange={e => setFilter(e.target.value)} style={select(theme)}>
          <option value="all">All Statuses</option>
          <option value="Onboard">Onboard</option>
            <option value="Pending">Pending</option>
          <option value="Departed">Departed</option>
        </select>
        <input placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} style={input(theme)} />
      </div>
      {showAdmin && (
        <div style={{ marginBottom: 20, padding: 12, border: `1px solid ${borderColor}`, borderRadius: 8, background: theme.surface, display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))' }}>
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
              <input value={draft.company} onChange={e => setDraft({ ...draft, company: e.target.value })} style={input(theme)} />
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
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 900 }}>
          <thead>
            <tr>
              {['Actions','First','Last','Company','Position','Crew','Rotation','Core','Arrival','Departure','Status','DOB','Days Onboard','Days Since Departed','Notes'].map(h => (
                <th
                  key={h}
                  style={{ border: `1px solid ${borderColor}`, background: theme.primary, color: theme.text, padding: '6px 8px', fontSize: 12 }}
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
                <td style={cell(theme)}>{r.crew}</td>
                <td style={cell(theme)}>{r.rotation}</td>
                <td style={cell(theme)}>{r.coreCrew ? 'Yes' : ''}</td>
                <td style={cell(theme)}>{r.arrivalDate}</td>
                <td style={cell(theme)}>{r.departureDate}</td>
                <td style={cell(theme)}>{r.status}</td>
                <td style={cell(theme)}>{r.dob}</td>
                <td style={cell(theme)}>{daysOnboardDisplay}</td>
                <td style={cell(theme)}>{daysSinceDepartedDisplay}</td>
                <td style={{ ...cell(theme), maxWidth: 160, whiteSpace: 'pre-wrap' }}>{r.notes}</td>
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
const select = (theme) => ({ background: theme.background, color: theme.text, border: '1px solid ' + theme.primary, padding: '4px 8px', borderRadius: 4 });
const input = (theme) => ({ background: theme.background, color: theme.text, border: '1px solid ' + theme.primary, padding: '4px 8px', borderRadius: 4 });
const cell = (theme) => ({ border: '1px solid ' + (theme.name === 'Dark' ? '#bfc4ca40' : '#444'), padding: '4px 6px', fontSize: 12, verticalAlign: 'top' });
const miniBtn = (theme) => ({ background: theme.secondary, color: theme.text, border: 'none', padding: '2px 6px', borderRadius: 4, cursor: 'pointer', fontSize: 11, marginRight: 4 });
