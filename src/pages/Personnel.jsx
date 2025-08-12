import React, { useState, useEffect, useMemo, useRef } from 'react';
import Field from '../components/forms/Field.jsx';
import { TextInput, PhoneInput, SelectInput, DateInput } from '../components/forms/inputs.jsx';
import { emitDomain } from '../ai/eventBus.js';
import { useTheme } from '../ThemeContext.jsx';
import { storage } from '../utils/storageAdapter';

/* Personnel record shape (persisted locally under 'personnelRecords')
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
const CONTACTS_KEY = 'personnelContactOnlyRecords';

function loadRecords() {
  try { return storage.getJSON(STORAGE_KEY, []) || []; } catch { return []; }
}
function saveRecords(recs) { storage.setJSON(STORAGE_KEY, recs); }
function loadContactOnly() {
  try { return storage.getJSON(CONTACTS_KEY, []) || []; } catch { return []; }
}
function saveContactOnly(recs) { storage.setJSON(CONTACTS_KEY, recs); }

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
  bodyWeight: '',
  bagWeight: '',
  bagCount: '',
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
  const [contactOnlyRecords, setContactOnlyRecords] = useState(loadContactOnly);
  const [activeView, setActiveView] = useState('database'); // 'database' | 'contacts' | 'crews'
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  // Persistent location filter
  const initialLocFilter = (() => {
    try { return storage.get('personnelLocationFilter') || 'all'; } catch { return 'all'; }
  })();
  const [locationFilter, setLocationFilter] = useState(initialLocFilter);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(blank());
  // Optional Evac Phase panel visibility
  // Company options sourced automatically from POB planner companies
  const [companyOptions, setCompanyOptions] = useState(() => {
    try {
      const data = storage.getJSON('pobPlannerData', []) || [];
      return [...new Set(data.map(r => (r.company || '').trim()).filter(Boolean))].sort();
    } catch { return []; }
  });
  // Admin-managed option lists
  const loadList = (key) => {
    try { return storage.getJSON(key, []) || []; } catch { return []; }
  };
  const [crewOptions, setCrewOptions] = useState(() => loadList('personnelCrewOptions'));
  const [locationOptions, setLocationOptions] = useState(() => loadList('personnelLocationOptions'));
  const [rotationOptions, setRotationOptions] = useState(() => loadList('personnelRotationOptions'));
  const [showAdmin, setShowAdmin] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef(null);
  const gearRef = useRef(null);
  // Raw textarea values so user can insert blank new lines while typing
  const [crewOptionsText, setCrewOptionsText] = useState(() => (crewOptions.join('\n')));
  const [locationOptionsText, setLocationOptionsText] = useState(() => (locationOptions.join('\n')));
  const [rotationOptionsText, setRotationOptionsText] = useState(() => (rotationOptions.join('\n')));

  useEffect(() => { saveRecords(records); }, [records]);
  useEffect(() => { saveContactOnly(contactOnlyRecords); }, [contactOnlyRecords]);
  useEffect(() => { storage.setJSON('personnelCrewOptions', crewOptions); }, [crewOptions]);
  useEffect(() => { storage.setJSON('personnelLocationOptions', locationOptions); }, [locationOptions]);
  useEffect(() => { storage.setJSON('personnelRotationOptions', rotationOptions); }, [rotationOptions]);
  // Keep textareas in sync if lists change externally
  useEffect(() => { setCrewOptionsText(crewOptions.join('\n')); }, [crewOptions]);
  useEffect(() => { setLocationOptionsText(locationOptions.join('\n')); }, [locationOptions]);
  useEffect(() => { setRotationOptionsText(rotationOptions.join('\n')); }, [rotationOptions]);
  useEffect(() => { storage.set('personnelLocationFilter', locationFilter); }, [locationFilter]);
  // Refresh company options when storage changes (other tab) or periodically while on page
  useEffect(() => {
    const load = () => {
      try {
        const data = storage.getJSON('pobPlannerData', []) || [];
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
    if (locationFilter !== 'all' && r.location !== locationFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!(r.firstName + ' ' + r.lastName + ' ' + r.company + ' ' + r.position).toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [records, filter, search, locationFilter]);

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
  bodyWeight: '',
  bagWeight: '',
  bagCount: '',
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
      const rec = { ...draft, id: 'p_' + Math.random().toString(36).slice(2,9) };
      setRecords(rs => [...rs, rec]);
      emitDomain('PERSON_ADDED', { id: rec.id, company: rec.company, crew: rec.crew, location: rec.location, rotation: rec.rotation }, `Added person ${rec.firstName||''} ${rec.lastName||''}`);
    } else {
      setRecords(rs => rs.map(r => r.id === editingId ? { ...draft } : r));
      emitDomain('PERSON_UPDATED', { id: editingId, company: draft.company, crew: draft.crew, location: draft.location, rotation: draft.rotation }, `Updated person ${draft.firstName||''} ${draft.lastName||''}`);
    }
    cancelEdit();
  }
  function remove(id) {
    if (!window.confirm('Delete this record?')) return;
    const rec = records.find(r=> r.id===id);
    setRecords(rs => rs.filter(r => r.id !== id));
    if(rec) emitDomain('PERSON_REMOVED', { id: rec.id, company: rec.company, crew: rec.crew, location: rec.location, rotation: rec.rotation }, `Removed person ${rec.firstName||''} ${rec.lastName||''}`);
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
  // Outside click / escape close settings
  useEffect(() => {
    if (!settingsOpen) return;
    const handleClick = (e) => {
      const menu = settingsRef.current; const gear = gearRef.current;
      if (!menu) return; if (menu.contains(e.target) || gear?.contains(e.target)) return;
      setSettingsOpen(false);
    };
    const handleKey = (e) => { if (e.key === 'Escape') setSettingsOpen(false); };
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('touchstart', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => { window.removeEventListener('mousedown', handleClick); window.removeEventListener('touchstart', handleClick); window.removeEventListener('keydown', handleKey); };
  }, [settingsOpen]);

  // Derived datasets for auxiliary views
  const onboardCount = records.filter(r=> r.status==='Onboard').length;
  // Expose lightweight context provider hook for passive AI if page active
  useEffect(()=>{
    if(window.location.hash.replace('#','').startsWith('personnel')){
      window.__buckPersonnelCtx = () => ({ total: records.length, onboard: onboardCount, crews: crewOptions.length, rotations: rotationOptions.length });
    }
    return () => { if(window.__buckPersonnelCtx) delete window.__buckPersonnelCtx; };
  }, [records, onboardCount, crewOptions, rotationOptions]);
  const contactRecords = useMemo(()=> {
    const base = records.filter(r=> r.coreCrew || r.primaryPhone || r.secondaryPhone);
    const all = [...base, ...contactOnlyRecords];
    return all.sort((a,b)=> (a.lastName+a.firstName).localeCompare(b.lastName+b.firstName));
  }, [records, contactOnlyRecords]);
  const crewGroups = useMemo(()=> {
    const map={};
    // Initialize from crewOptions so they appear even if empty
    crewOptions.forEach(c=> { if(c) map[c]=map[c]||[]; });
    // Add any crews present in records (even if not in options)
    records.filter(r=> r.crew).forEach(r=> { map[r.crew]=map[r.crew]||[]; map[r.crew].push(r); });
    // Sort member lists
    Object.values(map).forEach(list=> list.sort((a,b)=> (a.lastName+a.firstName).localeCompare(b.lastName+b.firstName)));
    // Build entries and ensure stable sort; empty string crews last
    return Object.entries(map)
      .sort((a,b)=> {
        if(!a[0]) return 1; if(!b[0]) return -1; return a[0].localeCompare(b[0]);
      });
  }, [records, crewOptions]);
  const [crewViewMode, setCrewViewMode] = useState('cards'); // 'cards' | 'table'
  const [contactViewMode, setContactViewMode] = useState(() => { // 'cards' | 'table'
    try { return storage.get('personnelContactViewMode') || 'cards'; } catch { return 'cards'; }
  });
  useEffect(()=> { try { storage.set('personnelContactViewMode', contactViewMode); } catch {} }, [contactViewMode]);
  // --- Crew Drag & Drop State ---
  const [dragCrewPersonId, setDragCrewPersonId] = useState(null);
  const [dragOverCrew, setDragOverCrew] = useState(null);
  function handleCrewDragStart(e,id){
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', id); } catch {}
    setDragCrewPersonId(id);
  }
  function handleCrewDragEnd(){
    setDragCrewPersonId(null);
    setDragOverCrew(null);
  }
  function assignPersonToCrew(personId, newCrew){
    if(!newCrew) return; // basic guard
    setRecords(rs => rs.map(r => r.id===personId? { ...r, crew: newCrew }: r));
    // Also update contact-only records if ever needed
    setContactOnlyRecords(rs => rs.map(r => r.id===personId? { ...r, crew: newCrew }: r));
  }
  function handleCrewDrop(e, crew){
    e.preventDefault();
    const id = (()=>{ try { return e.dataTransfer.getData('text/plain'); } catch { return dragCrewPersonId; } })();
    if(id) assignPersonToCrew(id, crew);
    setDragOverCrew(null);
  }
  // Contact-only quick add/edit state
  const blankContact = () => ({ id: 'c_'+Math.random().toString(36).slice(2,9), firstName:'', lastName:'', company:'', position:'', primaryPhone:'', secondaryPhone:'', crew:'', rotation:'', status:'Onboard', location:'', notes:'' });
  const [contactDraft, setContactDraft] = useState(blankContact());
  const [contactEditingId, setContactEditingId] = useState(null); // null | id
  function startAddContact(){ setContactEditingId('new'); setContactDraft(blankContact()); }
  function startEditContact(id){ const rec = contactOnlyRecords.find(c=> c.id===id); if(!rec) return; setContactEditingId(id); setContactDraft({...rec}); }
  function cancelContactEdit(){ setContactEditingId(null); setContactDraft(blankContact()); }
  function saveContact(){
    if(!contactDraft.firstName.trim() || !contactDraft.lastName.trim()) { alert('Name required'); return; }
    if(contactEditingId==='new') setContactOnlyRecords(rs=> [...rs, {...contactDraft, id: 'c_'+Math.random().toString(36).slice(2,9)}]);
    else setContactOnlyRecords(rs=> rs.map(r=> r.id===contactEditingId? {...contactDraft}: r));
    cancelContactEdit();
  }
  function removeContact(id){ if(!window.confirm('Delete this contact?')) return; setContactOnlyRecords(rs=> rs.filter(r=> r.id!==id)); if(contactEditingId===id) cancelContactEdit(); }

  return (
  <div style={{ padding: 24, color: theme.text, background: theme.background, minHeight: '100vh' }}>
  <h2 style={{ marginTop: 0, color: team === 'dark' ? theme.text : theme.primary }}>Personnel</h2>
  <div style={{ display:'flex', flexWrap:'wrap', gap:16, margin:'4px 0 26px' }}>
    {[
      { key:'database', title:'Personnel Database', desc:'Full record management', stat: records.length+' rec • '+onboardCount+' onboard' },
      { key:'contacts', title:'Contact List', desc:'Phones & core crew', stat: contactRecords.length+' contacts' },
      { key:'crews', title:'Crew List', desc:'Grouped by crew', stat: crewGroups.length+' crews' }
    ].map(card => {
      const active = activeView===card.key; const baseBg = theme.surface; const activeBg = theme.name==='Dark'? '#2f353a':'#eef3f7';
      return (
        <button key={card.key} onClick={()=> setActiveView(card.key)} style={{
          textAlign:'left', flex:'1 1 220px', minWidth:220, cursor:'pointer', padding:'14px 16px 16px', border:'2px solid '+(active? (theme.primary||'#267') : (theme.name==='Dark'? '#555':'#bbb')),
          borderRadius:14, background: active? activeBg : baseBg, color: theme.text, boxShadow: active? '0 4px 12px rgba(0,0,0,0.35)' : '0 2px 6px rgba(0,0,0,0.25)',
          transition:'box-shadow .2s, transform .15s, background .2s'
        }}>
          <div style={{ fontSize:15, fontWeight:800, marginBottom:4 }}>{card.title}</div>
          <div style={{ fontSize:11, opacity:.75, lineHeight:1.3, marginBottom:8 }}>{card.desc}</div>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:.5, opacity:.85 }}>{card.stat}</div>
        </button>
      );
    })}
  </div>
  {/* Removed duplicate control bar */}
  {activeView==='contacts' && (
    <div style={{ marginBottom:24 }}>
      <h3 style={{ margin:'0 0 12px', fontSize:18 }}>Contact List</h3>
      <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:12 }}>
        <div style={{ fontSize:11, opacity:.7 }}>Core crew, phone-bearing personnel, plus contact-only entries. Click to copy name + primary phone.</div>
        <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
          <button onClick={startAddContact} style={{ ...toggleBtn(theme, contactEditingId==='new') }}>Add Contact</button>
          <button onClick={()=> setContactViewMode('cards')} style={{ ...toggleBtn(theme, contactViewMode==='cards') }}>Cards</button>
          <button onClick={()=> setContactViewMode('table')} style={{ ...toggleBtn(theme, contactViewMode==='table') }}>Table</button>
        </div>
      </div>
      {contactEditingId && (() => {
        const refs = {
          first: React.createRef(), last: React.createRef(), company: React.createRef(), position: React.createRef(),
          phone1: React.createRef(), phone2: React.createRef(), notes: React.createRef()
        };
        return (
          <div style={{ marginBottom:18, padding:12, border:'1px solid '+(theme.name==='Dark'? '#555':'#bbb'), borderRadius:10, background: theme.surface, display:'grid', gap:10, gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))' }}>
            <div style={{ gridColumn:'1 / -1', fontSize:13, fontWeight:700 }}>{contactEditingId==='new'? 'Add Contact (contact-only, not in Personnel Database)': 'Edit Contact'}</div>
            <Field label="First Name" required error={!contactDraft.firstName?.trim()? 'Required':''}><TextInput inputRef={refs.first} nextRef={refs.last} value={contactDraft.firstName} onChange={e=> setContactDraft(d=> ({...d, firstName:e.target.value}))} /></Field>
            <Field label="Last Name" required error={!contactDraft.lastName?.trim()? 'Required':''}><TextInput inputRef={refs.last} prevRef={refs.first} nextRef={refs.company} value={contactDraft.lastName} onChange={e=> setContactDraft(d=> ({...d, lastName:e.target.value}))} /></Field>
            <Field label="Company"><TextInput inputRef={refs.company} prevRef={refs.last} nextRef={refs.position} value={contactDraft.company} onChange={e=> setContactDraft(d=> ({...d, company:e.target.value}))} /></Field>
            <Field label="Position"><TextInput inputRef={refs.position} prevRef={refs.company} nextRef={refs.phone1} value={contactDraft.position} onChange={e=> setContactDraft(d=> ({...d, position:e.target.value}))} /></Field>
            <Field label="Primary Phone"><PhoneInput inputRef={refs.phone1} prevRef={refs.position} nextRef={refs.phone2} value={contactDraft.primaryPhone} onChange={e=> setContactDraft(d=> ({...d, primaryPhone:e.target.value}))} /></Field>
            <Field label="Secondary Phone"><PhoneInput inputRef={refs.phone2} prevRef={refs.phone1} nextRef={refs.notes} value={contactDraft.secondaryPhone} onChange={e=> setContactDraft(d=> ({...d, secondaryPhone:e.target.value}))} /></Field>
            <Field label="Notes" full>
              <textarea ref={refs.notes} rows={2} value={contactDraft.notes} onChange={e=> setContactDraft(d=> ({...d, notes:e.target.value}))} style={{ background: theme.background, color: theme.text, border:'1px solid '+(theme.name==='Dark'? '#bfc4ca':'#267'), padding:'6px 8px', borderRadius:6, resize:'vertical' }} />
            </Field>
            <div style={{ gridColumn:'1 / -1', display:'flex', gap:8, marginTop:4 }}>
              <button onClick={saveContact} style={btn(theme)}>Save</button>
              <button onClick={cancelContactEdit} style={btn(theme)}>Cancel</button>
              {contactEditingId!=='new' && <button onClick={()=> removeContact(contactEditingId)} style={{ ...btn(theme), background:'#922', borderColor:'#b55' }}>Delete</button>}
            </div>
          </div>
        );
      })()}
      {contactViewMode==='cards' && (
        <div style={{ display:'grid', gap:10, gridTemplateColumns:'repeat(auto-fill,minmax(200px,240px))', justifyContent:'start' }}>
          {contactRecords.map(p=> (
            <div key={p.id}
              role="button"
              tabIndex={0}
              onClick={()=> { const txt=p.firstName+' '+p.lastName+' '+(p.primaryPhone||''); try { navigator.clipboard.writeText(txt); } catch{} }}
              onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' ') { e.preventDefault(); const txt=p.firstName+' '+p.lastName+' '+(p.primaryPhone||''); try { navigator.clipboard.writeText(txt); } catch{} } }}
              style={{ background: theme.surface, border:'1px solid '+(theme.name==='Dark'? '#555':'#bbb'), borderRadius:10, padding:'10px 12px', fontSize:12, cursor:'copy', display:'flex', flexDirection:'column', gap:4, boxShadow:'0 2px 6px rgba(0,0,0,0.25)' }} title="Click to copy name & primary phone">
              <div style={{ fontWeight:700, display:'flex', alignItems:'center', flexWrap:'wrap', gap:6 }}>
                <span>{p.firstName} {p.lastName}</span>
                {p.coreCrew && <span style={{ fontSize:10, background: theme.primary, color: theme.text, padding:'2px 6px', borderRadius:12 }}>CORE</span>}
                {p.id.startsWith('c_') && <span style={{ fontSize:10, background: theme.name==='Dark'? '#444':'#ccc', color: theme.text, padding:'2px 6px', borderRadius:12 }}>CONTACT</span>}
                {p.id.startsWith('c_') && <button onClick={(e)=> { e.stopPropagation(); startEditContact(p.id); }} style={{ ...miniBtn(theme), fontSize:10 }}>Edit</button>}
              </div>
              <div style={{ opacity:.8 }}>{p.company || <span style={{ opacity:.4 }}>No Company</span>}</div>
              {(p.position) && <div style={{ fontSize:11, opacity:.75 }}>{p.position}</div>}
              {(p.primaryPhone || p.secondaryPhone) && <div style={{ fontSize:11, display:'flex', flexDirection:'column', gap:2 }}>
                {p.primaryPhone && <span>📞 {p.primaryPhone}</span>}
                {p.secondaryPhone && <span style={{ opacity:.8 }}>📞 {p.secondaryPhone}</span>}
              </div>}
              {p.address && p.coreCrew && <div style={{ fontSize:10, opacity:.6 }}>{p.address}</div>}
            </div>
          ))}
          {contactRecords.length===0 && <div style={{ fontSize:12, opacity:.6 }}>No contacts found.</div>}
        </div>
      )}
      {contactViewMode==='table' && (
        <div style={{ overflowX:'auto', border:'1px solid '+(theme.name==='Dark'? '#555':'#aaa'), borderRadius:10 }}>
          <table style={{ borderCollapse:'collapse', width:'100%', minWidth:820, fontSize:12 }}>
            <thead>
              <tr style={{ background: theme.primary, color: theme.text }}>
                {['First','Last','Company','Position','Primary Phone','Secondary Phone','Crew','Rotation','Status','Location','Notes','Type','Actions'].map(h=> (
                  <th key={h} style={{ padding:'6px 8px', borderBottom:'1px solid '+(theme.name==='Dark'? '#666':'#333'), textAlign:'left', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contactRecords.map((p,i)=> (
                <tr key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={()=> { const txt=p.firstName+' '+p.lastName+' '+(p.primaryPhone||''); try { navigator.clipboard.writeText(txt); } catch{} }}
                  onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' ') { e.preventDefault(); const txt=p.firstName+' '+p.lastName+' '+(p.primaryPhone||''); try { navigator.clipboard.writeText(txt); } catch{} } }}
                  style={{ background: i%2? (theme.name==='Dark'? '#2a3035':'#f5f8fa'):'transparent', cursor:'copy' }} title="Click to copy name & primary phone">
                  <td style={crewTd(theme)}>{p.firstName}</td>
                  <td style={crewTd(theme)}>{p.lastName}</td>
                  <td style={crewTd(theme)}>{p.company}</td>
                  <td style={crewTd(theme)}>{p.position}</td>
                  <td style={crewTd(theme)}>{p.primaryPhone}</td>
                  <td style={crewTd(theme)}>{p.secondaryPhone}</td>
                  <td style={crewTd(theme)}>{p.crew}</td>
                  <td style={crewTd(theme)}>{p.rotation}</td>
                  <td style={crewTd(theme)}>{p.status}</td>
                  <td style={crewTd(theme)}>{p.location}</td>
                  <td style={{ ...crewTd(theme), maxWidth:200, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }} title={p.notes}>{p.notes}</td>
                  <td style={crewTd(theme)}>{p.id.startsWith('c_')? 'Contact-Only': (p.coreCrew? 'Core':'Personnel')}</td>
                  <td style={crewTd(theme)} onClick={(e)=> e.stopPropagation()}>
                    {p.id.startsWith('c_') && <>
                      <button onClick={()=> startEditContact(p.id)} style={{ ...miniBtn(theme), marginRight:4 }}>Edit</button>
                      <button onClick={()=> removeContact(p.id)} style={{ ...miniBtn(theme), background:'#922' }}>Del</button>
                    </>}
                  </td>
                </tr>
              ))}
              {contactRecords.length===0 && (
                <tr><td colSpan={13} style={{ padding:'10px 8px', textAlign:'center', fontStyle:'italic', opacity:.6 }}>No contacts found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )}
  {activeView==='crews' && (
    <div style={{ marginBottom:24 }}>
      <h3 style={{ margin:'0 0 12px', fontSize:18 }}>Crew List</h3>
      <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:12 }}>
        <div style={{ fontSize:11, opacity:.7 }}>Grouped by crew identifier. Counts include all statuses.</div>
        <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
          <button onClick={()=> setCrewViewMode('cards')} style={{ ...toggleBtn(theme, crewViewMode==='cards') }}>Cards</button>
          <button onClick={()=> setCrewViewMode('table')} style={{ ...toggleBtn(theme, crewViewMode==='table') }}>Table</button>
        </div>
      </div>
      {crewViewMode==='cards' && (
        <div style={{ display:'grid', gap:8, width:'100%', gridTemplateColumns:'repeat(4,minmax(220px,1fr))', alignItems:'stretch', overflow:'hidden' }}>
          {crewGroups.map(([crew, members])=> {
            const onboardMembers = members.filter(m=> m.status==='Onboard');
            const isOver = dragOverCrew===crew;
            return (
              <div
                key={crew}
                onDragOver={(e)=> { e.preventDefault(); if(dragCrewPersonId) setDragOverCrew(crew); }}
                onDragLeave={(e)=> { if(e.currentTarget===e.target) setDragOverCrew(null); }}
                onDrop={(e)=> handleCrewDrop(e, crew)}
                style={{ width:'100%', background: theme.surface, border:'2px dashed '+(isOver? (theme.primary): (theme.name==='Dark'? '#555':'#bbb')), borderRadius:12, padding:'10px 12px 8px', boxShadow:'0 2px 6px rgba(0,0,0,0.25)', display:'flex', flexDirection:'column', gap:8, transition:'border-color .15s, background .15s', minHeight:200, maxHeight:300, overflow:'hidden', boxSizing:'border-box' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontWeight:800, fontSize:14 }}>Crew {crew}</div>
                  <div style={{ fontSize:11, fontWeight:600 }}>{members.length} total • {onboardMembers.length} onboard</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:4, overflowY:'auto', scrollbarWidth:'thin', paddingRight:2, overscrollBehavior:'contain' }}>
                  {members.length===0 && <div style={{ fontSize:11, opacity:.55, fontStyle:'italic' }}>Drop here to assign</div>}
                  {members.map(m=> {
                    const dragging = dragCrewPersonId===m.id;
                    return (
                      <div key={m.id} draggable onDragStart={(e)=> handleCrewDragStart(e,m.id)} onDragEnd={handleCrewDragEnd}
                        title={'Drag to move: '+m.firstName+' '+m.lastName + (m.position? ' • '+m.position:'')}
                        style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:6, fontSize:11, background: dragging? (theme.secondary): (m.status==='Onboard'? (theme.primary): (theme.name==='Dark'? '#444':'#ddd')), color: theme.text, padding:'3px 6px', borderRadius:6, cursor:'grab', opacity: dragging? .45:1, lineHeight:1.2, wordBreak:'break-word' }}>
                        <span style={{ fontWeight:600, minWidth:0 }}>{m.firstName} {m.lastName}</span>
                        {m.position && <span style={{ fontSize:10, opacity:.75, whiteSpace:'nowrap' }}>{m.position}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {crewGroups.length===0 && <div style={{ fontSize:12, opacity:.6 }}>No crew assignments recorded.</div>}
        </div>
      )}
      {crewViewMode==='table' && (
        <div style={{ overflowX:'auto', border:'1px solid '+(theme.name==='Dark'? '#555':'#aaa'), borderRadius:10 }}>
          <table style={{ borderCollapse:'collapse', width:'100%', minWidth:760, fontSize:12 }}>
            <thead>
              <tr style={{ background: theme.primary, color: theme.text }}>
                {['Crew','First','Last','Company','Position','Status','Primary Phone','Secondary Phone','Location','Rotation'].map(h=> (
                  <th key={h} style={{ padding:'6px 8px', borderBottom:'1px solid '+(theme.name==='Dark'? '#666':'#333'), textAlign:'left', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {crewGroups.map(([crew, members])=> {
                const isOver = dragOverCrew===crew;
                return (
                  <React.Fragment key={crew}>
                    {members.length===0 && (
                      <tr
                        onDragOver={(e)=> { e.preventDefault(); if(dragCrewPersonId) setDragOverCrew(crew); }}
                        onDrop={(e)=> handleCrewDrop(e, crew)}
                        onDragLeave={(e)=> { if(e.currentTarget===e.target) setDragOverCrew(null); }}
                        style={{ background: isOver? (theme.name==='Dark'? '#243842':'#d8eef7') : 'transparent' }}>
                        <td style={crewCell(theme, 0)}><div style={{ fontWeight:700 }}>{crew||'(Unassigned)'}</div></td>
                        <td colSpan={9} style={{ ...crewTd(theme), fontStyle:'italic', opacity:.6 }}>No members • drag a name here to assign</td>
                      </tr>
                    )}
                    {members.map((m,i)=> (
                      <tr key={m.id}
                        onDragOver={(e)=> { e.preventDefault(); if(dragCrewPersonId) setDragOverCrew(crew); }}
                        onDrop={(e)=> handleCrewDrop(e, crew)}
                        onDragLeave={(e)=> { /* only clear when leaving group altogether */ if(e.currentTarget===e.target) setDragOverCrew(null); }}
                        style={{ background: isOver? (theme.name==='Dark'? '#243842':'#d8eef7') : (i%2? (theme.name==='Dark'? '#2a3035':'#f5f8fa'):'transparent') }}>
                        <td style={crewCell(theme, i===0 ? members.length : 0)}>{i===0 && <div style={{ fontWeight:700 }}>{crew}</div>}{i===0 && members.length>1 && <div style={{ fontSize:10, opacity:.6 }}>{members.length} members</div>}</td>
                        <td style={crewTd(theme)} draggable onDragStart={(e)=> handleCrewDragStart(e,m.id)} onDragEnd={handleCrewDragEnd} title="Drag to move" >{m.firstName}</td>
                        <td style={crewTd(theme)}>{m.lastName}</td>
                        <td style={crewTd(theme)}>{m.company}</td>
                        <td style={crewTd(theme)}>{m.position}</td>
                        <td style={{ ...crewTd(theme), color: m.status==='Onboard'? '#2d7d46': (m.status==='Pending'? '#b58a1d':'#999'), fontWeight: m.status==='Onboard'? 600:500 }}>{m.status}</td>
                        <td style={crewTd(theme)}>{m.primaryPhone}</td>
                        <td style={crewTd(theme)}>{m.secondaryPhone}</td>
                        <td style={crewTd(theme)}>{m.location}</td>
                        <td style={crewTd(theme)}>{m.rotation}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
              {crewGroups.length===0 && (
                <tr><td colSpan={10} style={{ padding:'10px 8px', textAlign:'center', fontStyle:'italic', opacity:.6 }}>No crew assignments recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )}
  {/* Database editing & table only when database view active */}
  {activeView==='database' && (
    <>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <button onClick={startAdd} style={btn(theme)}>Add Person</button>
        <input placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} style={input(theme)} />
        <select value={filter} onChange={e => setFilter(e.target.value)} style={select(theme)}>
          <option value="all">All Statuses</option>
          <option value="Onboard">Onboard</option>
          <option value="Pending">Pending</option>
          <option value="Departed">Departed</option>
        </select>
        <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} style={select(theme)} title="Filter by Location">
          <option value="all">All Locations</option>
          {Array.from(new Set([...(locationOptions||[]), ...records.map(r => r.location).filter(Boolean)])).sort().map(l => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
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
            {(() => {
              const r = {
                first: React.createRef(), last: React.createRef(), company: React.createRef(), body: React.createRef(), bag: React.createRef(), bags: React.createRef(),
                loc: React.createRef(), pos: React.createRef(), crew: React.createRef(), rot: React.createRef(), arr: React.createRef(), dep: React.createRef(), dob: React.createRef(),
                core: React.createRef(), p1: React.createRef(), p2: React.createRef(), addr: React.createRef(), status: React.createRef(), notes: React.createRef()
              };
              return (
                <>
                  <Field label="First Name"><TextInput inputRef={r.first} nextRef={r.last} value={draft.firstName} onChange={e => setDraft({ ...draft, firstName: e.target.value })} /></Field>
                  <Field label="Last Name"><TextInput inputRef={r.last} prevRef={r.first} nextRef={r.company} value={draft.lastName} onChange={e => setDraft({ ...draft, lastName: e.target.value })} /></Field>
                  <Field label="Company">
                    <TextInput inputRef={r.company} prevRef={r.last} nextRef={r.body} list="companyOptionsList" value={draft.company} onChange={e => setDraft({ ...draft, company: e.target.value })} placeholder={companyOptions.length ? 'Start typing to select' : ''} />
                    {companyOptions.length > 0 && (
                      <datalist id="companyOptionsList">
                        {companyOptions.map(c => <option key={c} value={c} />)}
                      </datalist>
                    )}
                  </Field>
                  <Field label="Body Weight (lb)"><TextInput inputRef={r.body} prevRef={r.company} nextRef={r.bag} value={draft.bodyWeight} onChange={e => setDraft({ ...draft, bodyWeight: e.target.value.replace(/[^0-9.]/g,'') })} placeholder="e.g. 185" /></Field>
                  <Field label="Bag Weight (lb)"><TextInput inputRef={r.bag} prevRef={r.body} nextRef={r.bags} value={draft.bagWeight} onChange={e => setDraft({ ...draft, bagWeight: e.target.value.replace(/[^0-9.]/g,'') })} placeholder="e.g. 35" /></Field>
                  <Field label="# Bags"><TextInput inputRef={r.bags} prevRef={r.bag} nextRef={r.loc} value={draft.bagCount} onChange={e => setDraft({ ...draft, bagCount: e.target.value.replace(/[^0-9]/g,'') })} placeholder="e.g. 2" /></Field>
                  <Field label="Location">
                    {locationOptions.length ? (
                      <SelectInput inputRef={r.loc} prevRef={r.bags} nextRef={r.pos} value={draft.location} onChange={e => setDraft({ ...draft, location: e.target.value })} options={locationOptions} placeholder="-- Select Location --" />
                    ) : (
                      <TextInput inputRef={r.loc} prevRef={r.bags} nextRef={r.pos} value={draft.location} onChange={e => setDraft({ ...draft, location: e.target.value })} placeholder="Define locations in Manage Lists" />
                    )}
                  </Field>
                  <Field label="Position"><TextInput inputRef={r.pos} prevRef={r.loc} nextRef={r.crew} value={draft.position} onChange={e => setDraft({ ...draft, position: e.target.value })} /></Field>
                  <Field label="Crew">
                    {crewOptions.length ? (
                      <SelectInput inputRef={r.crew} prevRef={r.pos} nextRef={r.rot} value={draft.crew} onChange={e => setDraft({ ...draft, crew: e.target.value })} options={crewOptions} placeholder="-- Select Crew --" />
                    ) : (
                      <TextInput inputRef={r.crew} prevRef={r.pos} nextRef={r.rot} value={draft.crew} onChange={e => setDraft({ ...draft, crew: e.target.value })} placeholder="Define crews in Manage Lists" />
                    )}
                  </Field>
                  <Field label="Rotation">
                    {rotationOptions.length ? (
                      <SelectInput inputRef={r.rot} prevRef={r.crew} nextRef={r.arr} value={draft.rotation} onChange={e => setDraft({ ...draft, rotation: e.target.value })} options={rotationOptions} placeholder="-- Select Rotation --" />
                    ) : (
                      <TextInput inputRef={r.rot} prevRef={r.crew} nextRef={r.arr} value={draft.rotation} onChange={e => setDraft({ ...draft, rotation: e.target.value })} placeholder="Define rotations in Manage Lists" />
                    )}
                  </Field>
                  <Field label="Arrival Date"><DateInput inputRef={r.arr} prevRef={r.rot} nextRef={r.dep} value={draft.arrivalDate} onChange={e => setDraft({ ...draft, arrivalDate: e.target.value })} /></Field>
                  <Field label="Departure Date"><DateInput inputRef={r.dep} prevRef={r.arr} nextRef={r.dob} value={draft.departureDate} onChange={e => setDraft({ ...draft, departureDate: e.target.value })} /></Field>
                  <Field label="DOB"><DateInput inputRef={r.dob} prevRef={r.dep} nextRef={r.core} disabled={!draft.coreCrew} value={draft.dob} onChange={e => setDraft({ ...draft, dob: e.target.value })} style={{ opacity: draft.coreCrew ? 1 : 0.5 }} /></Field>
                  <Field label="Core Crew">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input ref={r.core} type="checkbox" checked={!!draft.coreCrew} onChange={e => {
                        const checked = e.target.checked;
                        setDraft(d => ({
                          ...d,
                          coreCrew: checked,
                          primaryPhone: checked ? d.primaryPhone : '',
                          secondaryPhone: checked ? d.secondaryPhone : '',
                          address: checked ? d.address : '',
                          dob: checked ? d.dob : ''
                        }));
                      }} style={{ transform: 'scale(1.2)' }} />
                      <span style={{ fontSize: 12 }}>Enable contact details</span>
                    </div>
                  </Field>
                  <Field label="Primary Phone"><PhoneInput inputRef={r.p1} prevRef={r.core} nextRef={r.p2} value={draft.primaryPhone} disabled={!draft.coreCrew} onChange={e => setDraft({ ...draft, primaryPhone: e.target.value })} placeholder="(###) ###-####" style={{ opacity: draft.coreCrew ? 1 : 0.5 }} /></Field>
                  <Field label="Secondary Phone"><PhoneInput inputRef={r.p2} prevRef={r.p1} nextRef={r.addr} value={draft.secondaryPhone} disabled={!draft.coreCrew} onChange={e => setDraft({ ...draft, secondaryPhone: e.target.value })} placeholder="optional" style={{ opacity: draft.coreCrew ? 1 : 0.5 }} /></Field>
                  <Field label="Address" full>
                    <textarea ref={r.addr} value={draft.address} disabled={!draft.coreCrew} onChange={e => setDraft({ ...draft, address: e.target.value })} rows={2} style={{ ...input(theme), resize: 'vertical', opacity: draft.coreCrew ? 1 : 0.5 }} placeholder="Street, City, State" />
                  </Field>
                  <Field label="Status"><SelectInput inputRef={r.status} prevRef={r.addr} nextRef={r.notes} value={draft.status} onChange={e => { const v = e.target.value; setDraft(d => ({ ...d, status: v, location: v === 'Departed' ? '' : d.location })); }} options={[ 'Onboard','Pending','Departed' ]} placeholder="Select status" /></Field>
                  <Field label="Notes" full>
                    <textarea ref={r.notes} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} rows={3} style={{ ...input(theme), resize: 'vertical' }} />
                  </Field>
                </>
              );
            })()}
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
              <select value={draft.status} onChange={e => {
                const v = e.target.value;
                setDraft(d => ({ ...d, status: v, location: v === 'Departed' ? '' : d.location }));
              }} style={select(theme)}>
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
              {['Actions','First','Last','Company','Body Wt','Bag Wt','# Bags','Position','Location','Crew','Rotation','Core','Arrival','Departure','Status','DOB','Days Onboard','Days Since Departed','Notes'].map(h => (
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
                <td style={cell(theme)}>{r.bodyWeight}</td>
                <td style={cell(theme)}>{r.bagWeight}</td>
                <td style={cell(theme)}>{r.bagCount}</td>
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
                <td colSpan={19} style={{ ...cell(theme), textAlign: 'center', fontStyle: 'italic' }}>No records</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 12, fontSize: 11, opacity: 0.6 }}>Stored locally. Future integration: link planner company rosters, flight manifests.</div>
    </>
  )}
    </div>
  );
}

// Field component replaced by shared components/forms/Field.jsx

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
const toggleBtn = (theme, active) => ({ background: active? (theme.primary): (theme.name==='Dark'? '#2d3237':'#e6ebef'), color: theme.text, border:'1px solid '+(active? (theme.secondary||'#222') : (theme.name==='Dark'? '#555':'#aaa')), padding:'6px 12px', borderRadius:8, cursor:'pointer', fontSize:11, fontWeight:700 });
const crewTd = (theme) => ({ padding:'4px 6px', borderBottom:'1px solid '+(theme.name==='Dark'? '#444':'#ddd'), whiteSpace:'nowrap' });
const crewCell = (theme, span) => ({ ...crewTd(theme), verticalAlign:'top', position:'relative' });
