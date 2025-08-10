import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../ThemeContext.jsx';

/* Personnel record shape (persisted in localStorage under 'personnelRecords')
{
  id: string (uuid-ish),
  firstName: string,
  lastName: string,
  company: string,
  position: string,
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

  useEffect(() => { saveRecords(records); }, [records]);

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
    setDraft({ ...rec });
  }
  function cancelEdit() {
    setEditingId(null);
    setDraft(blank());
  }
  function saveDraft() {
    if (!draft.firstName.trim() || !draft.lastName.trim()) return alert('Name required');
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

  return (
    <div style={{ padding: 24, color: theme.text }}>
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
      {editingId && (
        <div style={{ marginBottom: 20, padding: 12, border: `1px solid ${borderColor}`, borderRadius: 8, background: theme.surface }}>
          <h3 style={{ margin: '0 0 8px' }}>{editingId === 'new' ? 'Add Personnel' : 'Edit Personnel'}</h3>
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
            <Field label="Arrival Date">
              <input type="date" value={draft.arrivalDate} onChange={e => setDraft({ ...draft, arrivalDate: e.target.value })} style={input(theme)} />
            </Field>
            <Field label="Departure Date">
              <input type="date" value={draft.departureDate} onChange={e => setDraft({ ...draft, departureDate: e.target.value })} style={input(theme)} />
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
          </div>
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 900 }}>
          <thead>
            <tr>
              {['First','Last','Company','Position','Arrival','Departure','Status','Notes','Actions'].map(h => (
                <th key={h} style={{ border: `1px solid ${borderColor}`, background: theme.primary, color: theme.text, padding: '6px 8px', fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} style={{ background: theme.surface }}>
                <td style={cell(theme)}>{r.firstName}</td>
                <td style={cell(theme)}>{r.lastName}</td>
                <td style={cell(theme)}>{r.company}</td>
                <td style={cell(theme)}>{r.position}</td>
                <td style={cell(theme)}>{r.arrivalDate}</td>
                <td style={cell(theme)}>{r.departureDate}</td>
                <td style={cell(theme)}>{r.status}</td>
                <td style={{ ...cell(theme), maxWidth: 160, whiteSpace: 'pre-wrap' }}>{r.notes}</td>
                <td style={cell(theme)}>
                  <button onClick={() => startEdit(r.id)} style={miniBtn(theme)}>Edit</button>
                  <button onClick={() => remove(r.id)} style={miniBtn(theme)}>Del</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} style={{ ...cell(theme), textAlign: 'center', fontStyle: 'italic' }}>No records</td>
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
