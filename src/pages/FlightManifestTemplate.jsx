import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from '../ThemeContext.jsx';

const STORAGE_KEY = 'flightManifestTemplateV1';
const CATALOG_KEY = 'flightManifestCatalogV1';
const FIELD_VIS_KEY = 'flightManifestVisibleFields';
const LOCATIONS_KEY = 'flightManifestLocations';
const AIRCRAFT_TYPES_KEY = 'flightManifestAircraftTypes'; // stores array of objects: { type, maxPax, maxOutboundWeight, maxInboundWeight }
const defaultData = {
  meta: {
    flightNumber: '',
    date: new Date().toISOString().slice(0,10),
    departure: '',
    arrival: '',
    departureTime: '',
    arrivalTime: '',
    aircraftType: '',
    tailNumber: '',
    captain: '',
    coPilot: '',
    dispatcher: '',
  notes: ''
  },
  outbound: [], // passengers departing (Flights Out)
  inbound: []   // passengers arriving (Flights In)
};

export default function FlightManifestTemplate() {
  const { theme } = useTheme();
  const [data, setData] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
      const initial = raw ? { ...defaultData, ...raw } : { ...defaultData };
      // Migration: old format used `passengers` single list
      if (!initial.outbound && Array.isArray(initial.passengers)) initial.outbound = initial.passengers;
      if (!Array.isArray(initial.outbound)) initial.outbound = [];
      if (!Array.isArray(initial.inbound)) initial.inbound = [];
      delete initial.passengers;
      return initial;
    } catch {
      return { ...defaultData };
    }
  });
  const isAdmin = () => { try { return localStorage.getItem('pobIsAdmin') === 'true'; } catch { return false; } };
  // Catalog of saved manifests
  const [catalog, setCatalog] = useState(()=>{ try { return JSON.parse(localStorage.getItem(CATALOG_KEY))||[]; } catch { return []; } });
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [currentCatalogId, setCurrentCatalogId] = useState(null); // which catalog entry is loaded (if any)
  useEffect(()=>{ try { localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog)); } catch {/*ignore*/} }, [catalog]);
  const saveToCatalog = (asNew=false) => {
    const snapshot = JSON.parse(JSON.stringify({
      meta: data.meta,
      outbound: data.outbound,
      inbound: data.inbound
    }));
    if(!asNew && currentCatalogId) {
      setCatalog(list=> list.map(e=> e.id===currentCatalogId ? { ...e, ...snapshot, date: snapshot.meta.date, flightNumber: snapshot.meta.flightNumber, updatedAt: new Date().toISOString() } : e));
    } else {
      const id = crypto.randomUUID();
      const entry = { id, date: snapshot.meta.date, flightNumber: snapshot.meta.flightNumber, savedAt: new Date().toISOString(), ...snapshot };
      setCatalog(list=> [entry, ...list]);
      setCurrentCatalogId(id);
    }
  };
  const loadFromCatalog = (id) => {
    const entry = catalog.find(e=>e.id===id); if(!entry) return;
    // deep clone to detach references
    setData(JSON.parse(JSON.stringify({ meta: entry.meta, outbound: entry.outbound, inbound: entry.inbound })));
    setCurrentCatalogId(id);
    setCatalogOpen(false);
  };
  const deleteFromCatalog = (id) => {
    if(!confirm('Delete saved manifest?')) return;
    setCatalog(list=> list.filter(e=> e.id!==id));
    if(currentCatalogId===id) { setCurrentCatalogId(null); }
  };
  const isDirtyRelativeToCatalog = useMemo(()=>{
    if(!currentCatalogId) return true;
    const entry = catalog.find(e=>e.id===currentCatalogId); if(!entry) return true;
    try {
      return JSON.stringify({meta:entry.meta,outbound:entry.outbound,inbound:entry.inbound}) !== JSON.stringify({meta:data.meta,outbound:data.outbound,inbound:data.inbound});
    } catch { return true; }
  }, [currentCatalogId, catalog, data]);
  const allFieldKeys = ['flightNumber','date','departure','departureTime','arrival','arrivalTime','aircraftType','tailNumber','captain','coPilot','dispatcher','notes'];
  const [visibleFields, setVisibleFields] = useState(()=>{
    try { const stored = JSON.parse(localStorage.getItem(FIELD_VIS_KEY)); if (stored && typeof stored === 'object') return { ...allFieldKeys.reduce((a,k)=> (a[k]=true,a),{}), ...stored }; } catch{/*ignore*/}
    return allFieldKeys.reduce((a,k)=> (a[k]=true,a),{});
  });
  const [configOpen, setConfigOpen] = useState(false);
  // Location options (admin managed)
  const [locationOptions, setLocationOptions] = useState(()=>{
    try { return JSON.parse(localStorage.getItem(LOCATIONS_KEY)) || []; } catch { return []; }
  });
  const [locationOptionsText, setLocationOptionsText] = useState(()=> locationOptions.join('\n'));
  useEffect(()=>{ try { localStorage.setItem(LOCATIONS_KEY, JSON.stringify(locationOptions)); } catch {/*ignore*/} }, [locationOptions]);
  useEffect(()=>{ setLocationOptionsText(locationOptions.join('\n')); }, [locationOptions]);
  // Aircraft types (admin managed)
  const [aircraftTypes, setAircraftTypes] = useState(()=>{
    try {
      const raw = JSON.parse(localStorage.getItem(AIRCRAFT_TYPES_KEY)) || [];
  if (raw.length && typeof raw[0] === 'string') {
	// Legacy string list -> expand to objects
	return raw.map(r => ({ type:r, maxPax:'', maxOutboundWeight:'', maxInboundWeight:'' }));
  }
  // Migration: discard legacy maxPassengerWt / maxCargoWt fields if present
  return raw.map(r => ({
    type: r.type || '',
    maxPax: r.maxPax ?? '',
    maxOutboundWeight: r.maxOutboundWeight ?? '',
    maxInboundWeight: r.maxInboundWeight ?? ''
  }));
    } catch { return []; }
  });
  useEffect(()=>{ try { localStorage.setItem(AIRCRAFT_TYPES_KEY, JSON.stringify(aircraftTypes)); } catch {/*ignore*/} }, [aircraftTypes]);
  const addAircraftType = () => setAircraftTypes(a => [...a, { type:'', maxPax:'', maxOutboundWeight:'', maxInboundWeight:'' }]);
  const updateAircraftType = (idx, field, value) => setAircraftTypes(a => a.map((t,i)=> i===idx ? { ...t, [field]: value } : t));
  const removeAircraftType = (idx) => setAircraftTypes(a => a.filter((_,i)=> i!==idx));
  useEffect(()=>{ try { localStorage.setItem(FIELD_VIS_KEY, JSON.stringify(visibleFields)); } catch {/* ignore */} }, [visibleFields]);
  const toggleField = (k) => setVisibleFields(v => ({ ...v, [k]: !v[k] }));
  const [autoSaveState, setAutoSaveState] = useState('');
  const saveTimer = useRef();
  // Personnel database cache for outbound lookup
  const [personnelRecords, setPersonnelRecords] = useState(()=>{ try { return JSON.parse(localStorage.getItem('personnelRecords'))||[]; } catch { return []; } });
  useEffect(()=>{
    const onStorage = (e)=>{ if(e.key==='personnelRecords'){ try { setPersonnelRecords(JSON.parse(localStorage.getItem('personnelRecords'))||[]);}catch{} } };
    window.addEventListener('storage', onStorage); return ()=> window.removeEventListener('storage', onStorage);
  }, []);
  // Add person modal state
  const [addPersonOpen, setAddPersonOpen] = useState(false);
  const [addPersonDraft, setAddPersonDraft] = useState({ firstName:'', lastName:'', company:'', bodyWeight:'', bagWeight:'', bagCount:'' });
  const [pendingPassengerId, setPendingPassengerId] = useState(null); // passenger id to populate after add
  const [pendingDir, setPendingDir] = useState(null); // 'outbound' | 'inbound'
  const openAddPerson = (passengerId, prefillName, dir) => {
    const parts = (prefillName||'').trim().split(/\s+/);
    setAddPersonDraft(d=>({ ...d, firstName: parts[0]||'', lastName: parts.slice(1).join(' ')||'' }));
    setPendingPassengerId(passengerId);
    setPendingDir(dir||'outbound');
    setAddPersonOpen(true);
  };
  const saveNewPerson = () => {
    const rec = { id: 'p_'+Math.random().toString(36).slice(2,9), firstName:addPersonDraft.firstName.trim(), lastName:addPersonDraft.lastName.trim(), company:addPersonDraft.company.trim(), position:'', location:'', crew:'', rotation:'', coreCrew:false, bodyWeight:addPersonDraft.bodyWeight, bagWeight:addPersonDraft.bagWeight, bagCount:addPersonDraft.bagCount, primaryPhone:'', secondaryPhone:'', address:'', dob:'', arrivalDate:new Date().toISOString().slice(0,10), departureDate:'', status:'Onboard', notes:'' };
    setPersonnelRecords(list=>{ const next=[...list, rec]; try{ localStorage.setItem('personnelRecords', JSON.stringify(next)); }catch{} return next; });
    if(pendingPassengerId){
      setData(d=> ({ ...d, [pendingDir]: d[pendingDir].map(p => p.id===pendingPassengerId ? { ...p, name: rec.firstName + (rec.lastName? ' '+rec.lastName:''), company: rec.company, bodyWeight: rec.bodyWeight, bagWeight: rec.bagWeight, bagCount: rec.bagCount } : p) }));
    }
    setAddPersonOpen(false); setPendingPassengerId(null); setPendingDir(null);
  };

  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); setAutoSaveState('Saved ' + new Date().toLocaleTimeString()); } catch { setAutoSaveState('Save failed'); }
    }, 400);
    return () => clearTimeout(saveTimer.current);
  }, [data]);

  const updateMeta = (field, value) => setData(d => ({ ...d, meta: { ...d.meta, [field]: value } }));
  const newPax = (dir, meta) => ({
    id: crypto.randomUUID(),
    name:'',
    company:'',
    bodyWeight:'',
    bagWeight:'',
    bagCount:'',
    comments:'',
    origin: dir==='outbound'? meta.departure : meta.arrival,
    destination: dir==='outbound'? meta.arrival : meta.departure,
    originAuto:true,
    destinationAuto:true
  });
  const addPassenger = (dir) => setData(d => ({ ...d, [dir]: [...d[dir], newPax(dir, d.meta)] }));
  const updatePassenger = (dir, id, field, value) => setData(d => ({ ...d, [dir]: d[dir].map(p => p.id === id ? { ...p, [field]: value } : p) }));
  // Specialized update for origin/destination to mark manual override & regroup by destination
  const manualRouteUpdate = (dir, id, field, value) => setData(d => {
    const updated = d[dir].map(p => p.id===id ? { ...p, [field]: value, [field+"Auto"]: false } : p);
    // group/sort by destination (case-insensitive), blanks last
    const sorted = [...updated].sort((a,b)=>{
      const da=(a.destination||'').toLowerCase();
      const db=(b.destination||'').toLowerCase();
      if(!da && db) return 1; if(!db && da) return -1; if(da<db) return -1; if(da>db) return 1; return 0;
    });
    return { ...d, [dir]: sorted };
  });
  const removePassenger = (dir, id) => setData(d => ({ ...d, [dir]: d[dir].filter(p => p.id !== id) }));
  const clearAll = () => { if (confirm('Clear all manifest data?')) setData(defaultData); };
  // If navigated from Flights page with selected dates, attempt to pre-fill notes with movement summary once (idempotent)
  useEffect(()=>{
    try {
      const raw = localStorage.getItem('manifestGenerateDates');
      if(!raw) return;
      const dates = JSON.parse(raw)||[]; if(!Array.isArray(dates) || !dates.length) return;
      localStorage.removeItem('manifestGenerateDates');
      // build summary based on flight movement comments util if available in storage
      const planner = JSON.parse(localStorage.getItem('pobPlannerData'))||[];
      // Re-run comment generation for needed window (include one day prior if possible)
      const parseMDY = str => new Date(str);
      const sorted = [...dates].sort((a,b)=> new Date(a)-new Date(b));
      const first = new Date(sorted[0]); const prev = new Date(first); prev.setDate(prev.getDate()-1);
      const dateObjs = [prev, ...sorted.map(d=> new Date(d))].map(d=> ({ date: (d.getMonth()+1)+'/'+d.getDate()+'/'+d.getFullYear() }));
      // inline simple diff (avoid circular import)
      const flightsOutTmp = {}; const flightsInTmp = {};
      for(let i=1;i<dateObjs.length;i++){ const prevKey=dateObjs[i-1].date; const curKey=dateObjs[i].date; const out=[]; const inn=[]; planner.forEach(row=>{ const pv=Number(row[prevKey])||0; const cv=Number(row[curKey])||0; if(cv>pv) out.push(`${cv-pv}-${row.company}`); else if(cv<pv) inn.push(`${pv-cv}-${row.company}`); }); flightsOutTmp[curKey]=out; flightsInTmp[curKey]=inn; }
      flightsOutTmp[dateObjs[0].date]=[]; flightsInTmp[dateObjs[0].date]=[];
      // Create summary lines for selected dates
      const lines = sorted.map(k=> {
        const outs = flightsOutTmp[k]||[]; const ins = flightsInTmp[k]||[];
        const totalOut = outs.reduce((s,v)=> s + (parseInt(String(v).split('-')[0],10)||0),0);
        const totalIn = ins.reduce((s,v)=> s + (parseInt(String(v).split('-')[0],10)||0),0);
        return `${k}: Out +${totalOut||0}${outs.length? ' ['+outs.join(', ')+']':''} | In -${totalIn||0}${ins.length? ' ['+ins.join(', ')+']':''}`;
      });
      // Determine primary manifest date (use last selected date assuming that's target flight).
      const mainDateKey = sorted[sorted.length-1];
      // Convert M/D/YYYY -> YYYY-MM-DD
      const [m,dD,y] = mainDateKey.split('/');
      const isoDate = y+'-'+String(m).padStart(2,'0')+'-'+String(dD).padStart(2,'0');
      // Build passenger placeholder lists for main date diffs if manifest sections empty.
      const outDiffs = flightsOutTmp[mainDateKey]||[];
      const inDiffs = flightsInTmp[mainDateKey]||[];
      const buildPassengers = (arr, direction) => {
        const pax = [];
        arr.forEach(entry => {
          const dash = entry.indexOf('-');
          if(dash===-1) return;
          const num = parseInt(entry.slice(0,dash),10) || 0;
            const company = entry.slice(dash+1);
          for(let i=0;i<num;i++) {
            pax.push({
              id: crypto.randomUUID(),
              name:'',
              company,
              bodyWeight:'', bagWeight:'', bagCount:'',
              comments:`Auto from planner (${direction} ${num > 1 ? '+'+num : '+1'} ${company} ${mainDateKey})`,
              // origin/destination will be applied in a later effect based on meta; mark auto flags
              origin:'', destination:'', originAuto:true, destinationAuto:true
            });
          }
        });
        return pax;
      };
      // We will assign origin/destination after building lists using meta values later
      setData(d=> {
        const newOutbound = d.outbound && d.outbound.length ? d.outbound : buildPassengers(outDiffs, 'OUT');
        const newInbound = d.inbound && d.inbound.length ? d.inbound : buildPassengers(inDiffs, 'IN');
        return {
          ...d,
          meta:{
            ...d.meta,
            date: d.meta.date && d.meta.date !== new Date().toISOString().slice(0,10) ? d.meta.date : isoDate,
            notes: (d.meta.notes? d.meta.notes+'\n':'') + 'Flight movements selected:\n'+lines.join('\n')
          },
          outbound: newOutbound,
          inbound: newInbound
        };
      });
    } catch {/* ignore */}
  }, []);
  // Ingest selected personnel passed from Flights page (one-time)
  useEffect(()=>{
    try {
      const raw = localStorage.getItem('manifestSelectedPersonnel');
      if(!raw) return;
      const list = JSON.parse(raw)||[]; if(!Array.isArray(list) || !list.length) { localStorage.removeItem('manifestSelectedPersonnel'); return; }
      localStorage.removeItem('manifestSelectedPersonnel');
      setData(d=>{
        const outboundAdd=[]; const inboundAdd=[];
        list.forEach(p=>{
          const pax = {
            id: crypto.randomUUID(),
            name: (p.firstName||'') + (p.lastName? ' '+p.lastName:''),
            company: p.company||'',
            bodyWeight: p.bodyWeight||'',
            bagWeight: p.bagWeight||'',
            bagCount: p.bagCount||'',
            comments: 'Imported from movement widget ('+p.source+')',
            origin:'', destination:'', originAuto:true, destinationAuto:true
          };
          if(p.direction==='inbound') inboundAdd.push(pax); else outboundAdd.push(pax);
        });
        return { ...d, outbound:[...d.outbound, ...outboundAdd], inbound:[...d.inbound, ...inboundAdd] };
      });
    } catch {/* ignore */}
  }, []);
  // Ensure auto origins/destinations reflect template departure/arrival unless manually overridden
  useEffect(()=>{
    setData(d=>{
      let changed=false;
      const apply=(list,dir)=> list.map(p=>{
        const desiredOrigin = dir==='outbound'? d.meta.departure : d.meta.arrival;
        const desiredDest = dir==='outbound'? d.meta.arrival : d.meta.departure;
        let mod=p;
        if(p.originAuto!==false && desiredOrigin && p.origin!==desiredOrigin){ mod={...mod, origin:desiredOrigin, originAuto:true}; changed=true; }
        if(p.destinationAuto!==false && desiredDest && p.destination!==desiredDest){ mod=mod===p? {...mod}:mod; mod.destination=desiredDest; mod.destinationAuto=true; changed=true; }
        return mod;
      });
      const newOutbound=apply(d.outbound,'outbound');
      const newInbound=apply(d.inbound,'inbound');
      if(!changed) return d;
      return { ...d, outbound:newOutbound, inbound:newInbound };
    });
  }, [data.meta.departure, data.meta.arrival]);

  const safeOutbound = data.outbound || [];
  const safeInbound = data.inbound || [];
  const totalOutbound = safeOutbound.length;
  const totalInbound = safeInbound.length;
  const totalWeightOutbound = useMemo(()=> safeOutbound.reduce((s,p)=> {
    const bw = parseFloat(p.bodyWeight)||0; const gw = parseFloat(p.bagWeight)||0; return s + bw + gw; },0), [safeOutbound]);
  const totalWeightInbound = useMemo(()=> safeInbound.reduce((s,p)=> { const bw = parseFloat(p.bodyWeight)||0; const gw = parseFloat(p.bagWeight)||0; return s + bw + gw; },0), [safeInbound]);
  const totalBodyOutbound = useMemo(()=> safeOutbound.reduce((s,p)=> s + (parseFloat(p.bodyWeight)||0),0), [safeOutbound]);
  const totalBagOutbound = useMemo(()=> safeOutbound.reduce((s,p)=> s + (parseFloat(p.bagWeight)||0),0), [safeOutbound]);
  const totalBodyInbound = useMemo(()=> safeInbound.reduce((s,p)=> s + (parseFloat(p.bodyWeight)||0),0), [safeInbound]);
  const totalBagInbound = useMemo(()=> safeInbound.reduce((s,p)=> s + (parseFloat(p.bagWeight)||0),0), [safeInbound]);
  const grandTotalPax = totalOutbound + totalInbound;
  const grandTotalWeight = totalWeightOutbound + totalWeightInbound;

  // Capacity evaluation for selected aircraft type
  const selectedAircraft = useMemo(()=> aircraftTypes.find(a=> a.type === data.meta.aircraftType), [aircraftTypes, data.meta.aircraftType]);
  const capacityStatus = useMemo(()=>{
    if (!selectedAircraft) return null;
    const maxPax = parseInt(selectedAircraft.maxPax)||null;
    const maxOutboundWeight = parseFloat(selectedAircraft.maxOutboundWeight)||null;
    const maxInboundWeight = parseFloat(selectedAircraft.maxInboundWeight)||null;
    const totalPax = grandTotalPax;
    const issues = [];
    if (maxPax!=null && totalPax > maxPax) issues.push(`PAX ${totalPax}/${maxPax}`);
    if (maxOutboundWeight!=null && totalWeightOutbound > maxOutboundWeight) issues.push(`OB Wt ${totalWeightOutbound.toFixed(1)}/${maxOutboundWeight}`);
    if (maxInboundWeight!=null && totalWeightInbound > maxInboundWeight) issues.push(`IB Wt ${totalWeightInbound.toFixed(1)}/${maxInboundWeight}`);
    return { maxPax, maxOutboundWeight, maxInboundWeight, totalPax, totalWeightOutbound, totalWeightInbound, issues };
  }, [selectedAircraft, grandTotalPax, totalWeightOutbound, totalWeightInbound]);

  // --- Flight Splitting Logic (allocates multiple flight legs if limits exceeded) ---
  const allocateFlights = (list, maxPax, maxWeight) => {
    if((!maxPax && !maxWeight) || !list.length) return [{ passengers:list, totalPax:list.length, totalWeight: list.reduce((s,p)=> s + ((parseFloat(p.bodyWeight)||0)+(parseFloat(p.bagWeight)||0)),0) }];
    const flights = [];
    let current = { passengers:[], totalPax:0, totalWeight:0 };
    const commit = () => { if(current.passengers.length){ flights.push(current); current = { passengers:[], totalPax:0, totalWeight:0 }; } };
    list.forEach(p=>{
      const weight = (parseFloat(p.bodyWeight)||0)+(parseFloat(p.bagWeight)||0);
      const paxLimitHit = maxPax!=null && current.totalPax + 1 > maxPax;
      const weightLimitHit = maxWeight!=null && current.totalWeight + weight > maxWeight;
      if(current.passengers.length && (paxLimitHit || weightLimitHit)) commit();
      current.passengers.push(p);
      current.totalPax += 1;
      current.totalWeight += weight;
    });
    commit();
    return flights;
  };
  const outboundFlights = useMemo(()=> allocateFlights(safeOutbound, selectedAircraft? (parseInt(selectedAircraft.maxPax)||null):null, selectedAircraft? (parseFloat(selectedAircraft.maxOutboundWeight)||null):null), [safeOutbound, selectedAircraft]);
  const inboundFlights = useMemo(()=> allocateFlights(safeInbound, selectedAircraft? (parseInt(selectedAircraft.maxPax)||null):null, selectedAircraft? (parseFloat(selectedAircraft.maxInboundWeight)||null):null), [safeInbound, selectedAircraft]);

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`flight-manifest-${data.meta.flightNumber||'draft'}.json`; a.click(); URL.revokeObjectURL(url);
  };
  const printView = () => {
    const w = window.open('', '_blank'); if (!w) return;
    const css = `body{font-family:Segoe UI,Arial,sans-serif;padding:16px;} h2{margin-top:0;} table{border-collapse:collapse;width:100%;font-size:12px;} th,td{border:1px solid #444;padding:4px 6px;} th{background:#ddd;} .section{margin-bottom:18px;}`;
    const selectedAircraftPrint = aircraftTypes.find(a=> a.type === data.meta.aircraftType);
    let capacityLine = '';
    if (selectedAircraftPrint) {
      const maxPax = parseInt(selectedAircraftPrint.maxPax)||null;
      const maxOutboundWeight = parseFloat(selectedAircraftPrint.maxOutboundWeight)||null;
      const maxInboundWeight = parseFloat(selectedAircraftPrint.maxInboundWeight)||null;
      capacityLine = `<div class='section'><strong>Capacity:</strong> `+
        [
          maxPax!=null?`Pax ${grandTotalPax}/${maxPax}`:null,
          maxOutboundWeight!=null?`Outbound Wt ${totalWeightOutbound.toFixed(1)}/${maxOutboundWeight}`:null,
          maxInboundWeight!=null?`Inbound Wt ${totalWeightInbound.toFixed(1)}/${maxInboundWeight}`:null
        ].filter(Boolean).join(' | ')+`</div>`;
    }
    const html = `<!DOCTYPE html><html><head><title>Flight Manifest</title><style>${css}</style></head><body>`+
      `<h2>Flight Manifest ${data.meta.flightNumber? ' - '+data.meta.flightNumber:''}</h2>`+
      `<div class='section'><strong>Date:</strong> ${data.meta.date||''} &nbsp; <strong>Route:</strong> ${data.meta.departure||'???'} → ${data.meta.arrival||'???'} &nbsp; <strong>ETD:</strong> ${data.meta.departureTime||''} &nbsp; <strong>ETA:</strong> ${data.meta.arrivalTime||''}</div>`+
      `<div class='section'><strong>Aircraft:</strong> ${data.meta.aircraftType||''} ${data.meta.tailNumber||''} &nbsp; <strong>Captain:</strong> ${data.meta.captain||''} &nbsp; <strong>Co-Pilot:</strong> ${data.meta.coPilot||''} &nbsp; <strong>Dispatcher:</strong> ${data.meta.dispatcher||''}</div>`+
      capacityLine +
      `<div class='section'><strong>Notes:</strong><br/>${(data.meta.notes||'').replace(/</g,'&lt;').replace(/\n/g,'<br/>')}</div>`+
  `<h3>Outbound (${totalOutbound})</h3>`+
  `<table><thead><tr><th>#</th><th>Name</th><th>Company</th><th>Body Wt</th><th>Bag Wt</th><th># Bags</th><th>Total Wt</th><th>Origin</th><th>Destination</th><th>Comments</th></tr></thead><tbody>`+
  data.outbound.map((p,i)=>{ const bw=parseFloat(p.bodyWeight)||0; const gw=parseFloat(p.bagWeight)||0; const tot=bw+gw; return `<tr><td>${i+1}</td><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.company)}</td><td>${p.bodyWeight||''}</td><td>${p.bagWeight||''}</td><td>${p.bagCount||''}</td><td>${tot?tot:''}</td><td>${escapeHtml(data.meta.departure||'')}</td><td>${escapeHtml(data.meta.arrival||'')}</td><td>${escapeHtml(p.comments)}</td></tr>`; }).join('')+
      `</tbody></table>`+
      `<div style='margin:6px 0 18px'><strong>Outbound Weight Total:</strong> ${totalWeightOutbound.toFixed(1)}</div>`+
  `<h3>Inbound (${totalInbound})</h3>`+
  `<table><thead><tr><th>#</th><th>Name</th><th>Company</th><th>Body Wt</th><th>Bag Wt</th><th># Bags</th><th>Total Wt</th><th>Origin</th><th>Destination</th><th>Comments</th></tr></thead><tbody>`+
  data.inbound.map((p,i)=>{ const bw=parseFloat(p.bodyWeight)||0; const gw=parseFloat(p.bagWeight)||0; const tot=bw+gw; return `<tr><td>${i+1}</td><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.company)}</td><td>${p.bodyWeight||''}</td><td>${p.bagWeight||''}</td><td>${p.bagCount||''}</td><td>${tot?tot:''}</td><td>${escapeHtml(data.meta.arrival||'')}</td><td>${escapeHtml(data.meta.departure||'')}</td><td>${escapeHtml(p.comments)}</td></tr>`; }).join('')+
      `</tbody></table>`+
      `<div style='margin-top:6px'><strong>Inbound Weight Total:</strong> ${totalWeightInbound.toFixed(1)}</div>`+
      `<div style='margin-top:14px'><strong>Grand Total Pax:</strong> ${grandTotalPax} &nbsp; <strong>Grand Total Weight:</strong> ${grandTotalWeight.toFixed(1)}</div>`+
      `</body></html>`;
    w.document.write(html); w.document.close(); w.print();
  };

  return (
  <div className="manifest-root" style={{ background: theme.background, color: theme.text, minHeight:'100vh', padding:'24px 26px 80px', position:'relative' }}>
      <style>{`
        .manifest-root input:not([type=checkbox]):not([type=radio]),
        .manifest-root select,
        .manifest-root textarea {
          background: ${theme.name==='Dark' ? '#2e3439' : '#ffffff'};
          color: ${theme.text};
          border: 1px solid ${theme.name==='Dark' ? '#58616a' : '#b8c2cc'};
          padding: 4px 6px;
          border-radius: 6px;
          font-size: 12px;
          font-family: inherit;
          box-shadow: inset 0 0 0 1px ${theme.name==='Dark' ? '#00000040' : '#ffffff00'};
          transition: border-color .15s, background .2s;
        }
        .manifest-root input:not([type=checkbox]):not([type=radio]):focus,
        .manifest-root select:focus,
        .manifest-root textarea:focus {
          outline: none;
          border-color: ${theme.primary || '#2d6cdf'};
          box-shadow: 0 0 0 2px ${theme.primary || '#2d6cdf'}33;
        }
        .manifest-root ::placeholder { color: ${theme.name==='Dark' ? '#9aa4ad' : '#6c7a85'}; opacity: .85; }
      `}</style>
      <h2 style={{ marginTop:0 }}>Flight Manifest Template</h2>
      <div style={{ fontSize:12, opacity:.75, marginBottom:16 }}>Draft and store a manifest template. Auto-saves locally; not yet integrated with planner flights.</div>
      <section style={card(theme)}>
        <div style={{ ...sectionHeader(theme), display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ flex:1 }}>Flight Details</span>
          {isAdmin() && (
            <button onClick={()=>setConfigOpen(o=>!o)} style={smallBtn(theme)}>{configOpen ? 'Done' : 'Customize'}</button>
          )}
        </div>
        {configOpen && isAdmin() && (
          <div style={{ marginBottom:14 }}>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
              <button onClick={()=>setVisibleFields(allFieldKeys.reduce((a,k)=> (a[k]=true,a),{}))} style={smallBtn(theme)}>All</button>
              <button onClick={()=>setVisibleFields(allFieldKeys.reduce((a,k)=> (a[k]=false,a),{}))} style={smallBtn(theme)}>None</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))', gap:8 }}>
              {allFieldKeys.map(k=> (
                <label key={k} style={{ fontSize:11, display:'flex', alignItems:'center', gap:4, background: visibleFields[k]? (theme.name==='Dark'? '#2e3237':'#eef3f7'):'#00000011', padding:'4px 6px', borderRadius:6 }}>
                  <input type="checkbox" checked={!!visibleFields[k]} onChange={()=>toggleField(k)} /> {k.replace(/([A-Z])/g,' $1')}
                </label>
              ))}
            </div>
            <div style={{ marginTop:16 }}>
              <div style={{ fontSize:12, fontWeight:600, marginBottom:4 }}>Locations List</div>
              <textarea
                value={locationOptionsText}
                onChange={e=>setLocationOptionsText(e.target.value)}
                onBlur={()=>{
                  const cleaned = Array.from(new Set(locationOptionsText.split(/\n+/).map(v=>v.trim()).filter(Boolean)));
                  setLocationOptions(cleaned);
                }}
                rows={4}
                style={{ width:'100%', background: theme.background, color: theme.text, border:'1px solid '+(theme.primary||'#267'), borderRadius:8, padding:8, fontSize:12, resize:'vertical', fontFamily:'monospace', lineHeight:1.4 }}
                placeholder={'EXAMPLE:\nHOU\nLAX\nDEN\nPLATFORM A'}
              />
              <div style={{ fontSize:11, opacity:.65, marginTop:4 }}>Admins: one location per line. These populate the Departure / Arrival dropdowns.</div>
            </div>
            <div style={{ marginTop:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontSize:12, fontWeight:600, marginBottom:4 }}>Aircraft Types & Limits</div>
                <button onClick={addAircraftType} style={smallBtn(theme)}>Add</button>
              </div>
              {aircraftTypes.length === 0 && <div style={{ fontSize:11, opacity:.6, marginBottom:4 }}>No aircraft types yet. Add one.</div>}
              <div style={{ display:'grid', gap:6 }}>
                {aircraftTypes.map((a,i)=> (
                  <div key={i} style={{ display:'grid', gap:6, gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))', alignItems:'end', background: theme.name==='Dark'? '#24292f':'#f2f6f9', padding:8, borderRadius:8, position:'relative' }}>
                    <div>
                      <label style={{ fontSize:10, textTransform:'uppercase', letterSpacing:.5, opacity:.75 }}>Type</label>
                      <input value={a.type} onChange={e=>updateAircraftType(i,'type', e.target.value)} placeholder="e.g. S92" />
                    </div>
                    <div>
                      <label style={{ fontSize:10, textTransform:'uppercase', letterSpacing:.5, opacity:.75 }}>Max Pax</label>
                      <input type="number" value={a.maxPax} onChange={e=>updateAircraftType(i,'maxPax', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize:10, textTransform:'uppercase', letterSpacing:.5, opacity:.75 }}>Max Inbound Wt</label>
                      <input type="number" value={a.maxInboundWeight} onChange={e=>updateAircraftType(i,'maxInboundWeight', e.target.value)} placeholder="lbs" />
                    </div>
                    <div>
                      <label style={{ fontSize:10, textTransform:'uppercase', letterSpacing:.5, opacity:.75 }}>Max Outbound Wt</label>
                      <input type="number" value={a.maxOutboundWeight} onChange={e=>updateAircraftType(i,'maxOutboundWeight', e.target.value)} placeholder="lbs" />
                    </div>
                    <button onClick={()=>removeAircraftType(i)} style={{ position:'absolute', top:4, right:4, background:'transparent', border:'none', color: theme.danger||'#c33', cursor:'pointer', fontSize:14 }} title="Remove">×</button>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:11, opacity:.65, marginTop:4 }}>Directional limits use total (body + bag) weight only. Contact flight provider if additional details are required.</div>
            </div>
          </div>
        )}
        <div style={gridForm}>
          {visibleFields.flightNumber && <Labeled label="Flight #"><input value={data.meta.flightNumber} onChange={e=>updateMeta('flightNumber', e.target.value)} /></Labeled>}
          {visibleFields.date && <Labeled label="Date"><input type="date" value={data.meta.date} onChange={e=>updateMeta('date', e.target.value)} /></Labeled>}
          {visibleFields.departure && <Labeled label="Departure">{
            locationOptions.length ? (
              <select value={data.meta.departure} onChange={e=>updateMeta('departure', e.target.value)}>
                <option value="">-- Select --</option>
                {Array.from(new Set([...(locationOptions||[]), data.meta.departure].filter(Boolean))).map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            ) : (
              <input value={data.meta.departure} onChange={e=>updateMeta('departure', e.target.value)} placeholder="Origin" />
            )
          }</Labeled>}
          {visibleFields.departureTime && <Labeled label="Departure Time"><input value={data.meta.departureTime} onChange={e=>updateMeta('departureTime', e.target.value)} placeholder="HHMM" /></Labeled>}
          {visibleFields.arrival && <Labeled label="Arrival">{
            locationOptions.length ? (
              <select value={data.meta.arrival} onChange={e=>updateMeta('arrival', e.target.value)}>
                <option value="">-- Select --</option>
                {Array.from(new Set([...(locationOptions||[]), data.meta.arrival].filter(Boolean))).map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            ) : (
              <input value={data.meta.arrival} onChange={e=>updateMeta('arrival', e.target.value)} placeholder="Destination" />
            )
          }</Labeled>}
            {visibleFields.arrivalTime && <Labeled label="Arrival Time"><input value={data.meta.arrivalTime} onChange={e=>updateMeta('arrivalTime', e.target.value)} placeholder="HHMM" /></Labeled>}
            {visibleFields.aircraftType && <Labeled label="Aircraft Type">{
              aircraftTypes.length ? (
                <select value={data.meta.aircraftType} onChange={e=>updateMeta('aircraftType', e.target.value)}>
                  <option value="">-- Select --</option>
                  {aircraftTypes.map(t => t.type).filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
                  {!aircraftTypes.find(a=>a.type===data.meta.aircraftType) && data.meta.aircraftType && <option value={data.meta.aircraftType}>{data.meta.aircraftType}</option>}
                </select>
              ) : (
                <input value={data.meta.aircraftType} onChange={e=>updateMeta('aircraftType', e.target.value)} placeholder="Type" />
              )
            }
            {(() => {
              const sel = aircraftTypes.find(a=>a.type===data.meta.aircraftType);
              if(!sel) return null;
              const items = [];
              if(sel.maxPax) items.push({ label:'Pax', value: sel.maxPax });
              if(sel.maxOutboundWeight) items.push({ label:'OB Wt', value: sel.maxOutboundWeight });
              if(sel.maxInboundWeight) items.push({ label:'IB Wt', value: sel.maxInboundWeight });
              if(!items.length) return null;
              return (
                <div style={{ marginTop:6, display:'flex', flexWrap:'wrap', gap:6, alignItems:'center' }}>
                  <span style={{ fontSize:12, fontWeight:600, opacity:.85 }}>Limits:</span>
                  {items.map((it,i)=> (
                    <span key={i} style={{
                      fontSize:12,
                      background: theme.name==='Dark'? '#39424a':'#dfe9f3',
                      color: theme.name==='Dark'? '#fff':'#123',
                      padding:'4px 8px',
                      borderRadius:20,
                      lineHeight:1,
                      fontWeight:500,
                      boxShadow:'0 1px 2px rgba(0,0,0,0.25)'
                    }}>{it.label}: {it.value}</span>
                  ))}
                </div>
              );
            })()}
            </Labeled>}
            {visibleFields.tailNumber && <Labeled label="Tail #"><input value={data.meta.tailNumber} onChange={e=>updateMeta('tailNumber', e.target.value)} placeholder="Registration" /></Labeled>}
            {visibleFields.captain && <Labeled label="Captain"><input value={data.meta.captain} onChange={e=>updateMeta('captain', e.target.value)} /></Labeled>}
            {visibleFields.coPilot && <Labeled label="Co-Pilot"><input value={data.meta.coPilot} onChange={e=>updateMeta('coPilot', e.target.value)} /></Labeled>}
            {visibleFields.dispatcher && <Labeled label="Dispatcher"><input value={data.meta.dispatcher} onChange={e=>updateMeta('dispatcher', e.target.value)} /></Labeled>}
        </div>
        {visibleFields.notes && (
          <Labeled label="Notes" full>
            <textarea rows={4} value={data.meta.notes} onChange={e=>updateMeta('notes', e.target.value)} style={{ resize:'vertical' }} />
          </Labeled>
        )}
        <div style={{ fontSize:11, opacity:.6, marginTop:6 }}>{autoSaveState}</div>
      </section>
      {outboundFlights.map((flight, idx)=> (
        <section key={idx} style={card(theme)}>
          <div style={sectionHeader(theme)}>Outbound Flight {outboundFlights.length>1 ? idx+1 : ''} Passengers ({flight.totalPax}){selectedAircraft && (selectedAircraft.maxOutboundWeight || selectedAircraft.maxPax) ? ` / Cap ${selectedAircraft.maxPax||'-'} Pax ${selectedAircraft.maxOutboundWeight? '/ '+selectedAircraft.maxOutboundWeight+' Wt':''}`:''}</div>
    <PassengerTable
      theme={theme}
      dir='outbound'
      list={flight.passengers}
      onUpdate={(id,f,v)=>updatePassenger('outbound',id,f,v)}
      onRemove={(id)=>removePassenger('outbound',id)}
      onManualRoute={(pid,field,val)=> manualRouteUpdate('outbound',pid,field,val)}
      personnelRecords={personnelRecords}
      openAddPerson={openAddPerson}
      applyPersonRecord={(passengerId, record)=>{
        setData(d=> ({ ...d, outbound: d.outbound.map(p => p.id===passengerId ? { ...p, name: record.firstName + (record.lastName? ' '+record.lastName:''), company: record.company, bodyWeight: record.bodyWeight, bagWeight: record.bagWeight, bagCount: record.bagCount } : p) }));
      }}
    />
          {idx===outboundFlights.length-1 && (
          <div style={{ display:'flex', gap:12, marginTop:12, flexWrap:'wrap', alignItems:'center' }}>
            <button onClick={()=>addPassenger('outbound')} style={actionBtn(theme)}>Add Outbound</button>
            <div style={{ marginLeft:'auto', fontSize:12, opacity:.8, display:'flex', gap:14, flexWrap:'wrap' }}>
              <span>Pax: {totalOutbound}</span>
              <span>Body Wt: {totalBodyOutbound.toFixed(1)}</span>
              <span>Bag Wt: {totalBagOutbound.toFixed(1)}</span>
              <span>Total: {totalWeightOutbound.toFixed(1)}</span>
            </div>
          </div>
          )}
          {selectedAircraft && (selectedAircraft.maxOutboundWeight) && (
            <div style={{ marginTop:8, fontSize:12, display:'flex', gap:18, flexWrap:'wrap' }}>
              <span>Flight Wt: {flight.totalWeight.toFixed(1)} / {parseFloat(selectedAircraft.maxOutboundWeight)||'--'} {flight.totalWeight > (parseFloat(selectedAircraft.maxOutboundWeight)||Infinity)? '(Over)':''}</span>
            </div>
          )}
        </section>
      ))}
      {inboundFlights.map((flight, idx)=> (
        <section key={'in'+idx} style={card(theme)}>
          <div style={sectionHeader(theme)}>Inbound Flight {inboundFlights.length>1 ? idx+1 : ''} Passengers ({flight.totalPax}){selectedAircraft && (selectedAircraft.maxInboundWeight || selectedAircraft.maxPax) ? ` / Cap ${selectedAircraft.maxPax||'-'} Pax ${selectedAircraft.maxInboundWeight? '/ '+selectedAircraft.maxInboundWeight+' Wt':''}`:''}</div>
    <PassengerTable
      theme={theme}
      dir='inbound'
      list={flight.passengers}
      onUpdate={(id,f,v)=>updatePassenger('inbound',id,f,v)}
      onRemove={(id)=>removePassenger('inbound',id)}
      onManualRoute={(pid,field,val)=> manualRouteUpdate('inbound',pid,field,val)}
      personnelRecords={personnelRecords}
      openAddPerson={openAddPerson}
      applyPersonRecord={(passengerId, record)=>{
        setData(d=> ({ ...d, inbound: d.inbound.map(p => p.id===passengerId ? { ...p, name: record.firstName + (record.lastName? ' '+record.lastName:''), company: record.company, bodyWeight: record.bodyWeight, bagWeight: record.bagWeight, bagCount: record.bagCount } : p) }));
      }}
    />
          {idx===inboundFlights.length-1 && (
          <div style={{ display:'flex', gap:12, marginTop:12, flexWrap:'wrap', alignItems:'center' }}>
            <button onClick={()=>addPassenger('inbound')} style={actionBtn(theme)}>Add Inbound</button>
            <div style={{ marginLeft:'auto', fontSize:12, opacity:.8, display:'flex', gap:14, flexWrap:'wrap' }}>
              <span>Pax: {totalInbound}</span>
              <span>Body Wt: {totalBodyInbound.toFixed(1)}</span>
              <span>Bag Wt: {totalBagInbound.toFixed(1)}</span>
              <span>Total: {totalWeightInbound.toFixed(1)}</span>
            </div>
          </div>
          )}
          {selectedAircraft && (selectedAircraft.maxInboundWeight) && (
            <div style={{ marginTop:8, fontSize:12, display:'flex', gap:18, flexWrap:'wrap' }}>
              <span>Flight Wt: {flight.totalWeight.toFixed(1)} / {parseFloat(selectedAircraft.maxInboundWeight)||'--'} {flight.totalWeight > (parseFloat(selectedAircraft.maxInboundWeight)||Infinity)? '(Over)':''}</span>
            </div>
          )}
        </section>
      ))}
      <section style={card(theme)}>
        <div style={sectionHeader(theme)}>Actions & Totals</div>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
          <button onClick={exportJSON} style={actionBtn(theme)}>Export JSON</button>
          <button onClick={printView} style={actionBtn(theme)}>Print</button>
          <button onClick={()=>saveToCatalog(false)} style={actionBtn(theme)} disabled={!isDirtyRelativeToCatalog}>Save{currentCatalogId && !isDirtyRelativeToCatalog? ' (Saved)':''}</button>
          <button onClick={()=>saveToCatalog(true)} style={actionBtn(theme)}>Save As New</button>
          <button onClick={()=>setCatalogOpen(o=>!o)} style={actionBtn(theme)}>{catalogOpen? 'Close Catalog':'Catalog'}</button>
          <button onClick={clearAll} style={{ ...actionBtn(theme), background:'#aa3333' }}>Clear All</button>
          <div style={{ marginLeft:'auto', fontSize:12, opacity:.8, display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
            <span>Grand Pax: {grandTotalPax}</span>
            <span>Grand Wt: {grandTotalWeight.toFixed(1)}</span>
      {capacityStatus && (
              <span style={{
                background: capacityStatus.issues.length? (theme.danger||'#c0392b') : (theme.success||'#2d7d46'),
                color:'#fff', padding:'6px 10px', borderRadius:8, fontWeight:600, display:'flex', gap:10, alignItems:'center', fontSize:13, boxShadow:'0 2px 4px rgba(0,0,0,0.3)'
              }}>
  {capacityStatus.maxPax!=null && <span>Pax {capacityStatus.totalPax}/{capacityStatus.maxPax}</span>}
  {capacityStatus.maxOutboundWeight!=null && <span>OB Wt {capacityStatus.totalWeightOutbound.toFixed(1)}/{capacityStatus.maxOutboundWeight}</span>}
  {capacityStatus.maxInboundWeight!=null && <span>IB Wt {capacityStatus.totalWeightInbound.toFixed(1)}/{capacityStatus.maxInboundWeight}</span>}
                {capacityStatus.issues.length>0 && <span style={{ textDecoration:'underline' }}>OVER</span>}
              </span>
            )}
          </div>
        </div>
      </section>
      {catalogOpen && (
        <section style={card(theme)}>
          <div style={{ ...sectionHeader(theme), marginBottom:10 }}>Saved Manifests ({catalog.length})</div>
          {catalog.length===0 && <div style={{ fontSize:12, opacity:.6 }}>No saved manifests yet.</div>}
          <div style={{ display:'grid', gap:8 }}>
            {catalog.map(e=> (
              <div key={e.id} style={{ display:'flex', gap:10, alignItems:'center', background: theme.name==='Dark'? '#2a3035':'#ecf1f5', padding:'6px 10px', borderRadius:8, border:'1px solid '+(currentCatalogId===e.id? (theme.primary||'#267') : (theme.name==='Dark'? '#444':'#ccc')) }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{e.meta.flightNumber || 'No Flight #'} - {e.date}</div>
                  <div style={{ fontSize:11, opacity:.7 }}>Outbound {e.outbound.length} / Inbound {e.inbound.length} &nbsp; Saved {new Date(e.savedAt||e.updatedAt).toLocaleString()}</div>
                </div>
                <button style={smallBtn(theme)} onClick={()=>loadFromCatalog(e.id)}>Load</button>
                <button style={smallBtn(theme)} onClick={()=>deleteFromCatalog(e.id)}>Del</button>
              </div>
            ))}
          </div>
        </section>
      )}
      <div style={{ fontSize:10, opacity:.5, marginTop:30 }}>Future: auto-populate from planner deltas; attach saved templates to flights; CSV export.</div>
      {addPersonOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'60px 20px', zIndex:600 }} onClick={e=>{ if(e.target===e.currentTarget) setAddPersonOpen(false); }}>
          <div style={{ background: theme.background, color: theme.text, padding:20, borderRadius:12, width:'min(480px,100%)', border:'1px solid '+(theme.name==='Dark'? '#666':'#444'), boxShadow:'0 8px 24px rgba(0,0,0,0.4)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <h3 style={{ margin:0, fontSize:18 }}>Add Person</h3>
              <button onClick={()=>setAddPersonOpen(false)} style={smallBtn(theme)}>Close</button>
            </div>
            <div style={{ display:'grid', gap:10, gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))' }}>
              <label style={{ fontSize:12 }}>First Name
                <input value={addPersonDraft.firstName} onChange={e=>setAddPersonDraft(d=>({...d, firstName:e.target.value}))} />
              </label>
              <label style={{ fontSize:12 }}>Last Name
                <input value={addPersonDraft.lastName} onChange={e=>setAddPersonDraft(d=>({...d, lastName:e.target.value}))} />
              </label>
              <label style={{ fontSize:12 }}>Company
                <input value={addPersonDraft.company} onChange={e=>setAddPersonDraft(d=>({...d, company:e.target.value}))} />
              </label>
              <label style={{ fontSize:12 }}>Body Wt
                <input value={addPersonDraft.bodyWeight} onChange={e=>setAddPersonDraft(d=>({...d, bodyWeight:e.target.value.replace(/[^0-9.]/g,'')}))} placeholder="lbs" />
              </label>
              <label style={{ fontSize:12 }}>Bag Wt
                <input value={addPersonDraft.bagWeight} onChange={e=>setAddPersonDraft(d=>({...d, bagWeight:e.target.value.replace(/[^0-9.]/g,'')}))} placeholder="lbs" />
              </label>
              <label style={{ fontSize:12 }}># Bags
                <input value={addPersonDraft.bagCount} onChange={e=>setAddPersonDraft(d=>({...d, bagCount:e.target.value.replace(/[^0-9]/g,'')}))} placeholder="#" />
              </label>
            </div>
            <div style={{ marginTop:16, display:'flex', justifyContent:'flex-end', gap:10 }}>
              <button onClick={()=>setAddPersonOpen(false)} style={smallBtn(theme)}>Cancel</button>
              <button onClick={saveNewPerson} style={actionBtn(theme)}>Save Person</button>
            </div>
            <div style={{ fontSize:11, opacity:.65, marginTop:10 }}>Record will be stored in local personnel database.</div>
          </div>
        </div>
      )}
    </div>
  );
}

const card = (theme) => ({ background: theme.surface, border:'1px solid '+(theme.name==='Dark' ? '#555':'#ccc'), borderRadius:12, padding:'16px 18px 20px', marginBottom:28, boxShadow:'0 4px 12px rgba(0,0,0,0.25)' });
const sectionHeader = (theme) => ({ fontSize:16, fontWeight:700, marginBottom:14, paddingBottom:6, borderBottom:'2px solid '+(theme.primary||'#267') });
const gridForm = { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:'10px 16px', marginBottom:12 };
const labelStyle = { fontSize:10, textTransform:'uppercase', letterSpacing:'.5px', fontWeight:600, opacity:.75, marginBottom:2 };
function Labeled({ label, children, full }) { return (
  <label style={{ display:'flex', flexDirection:'column', ...(full?{gridColumn:'1 / -1'}:{}) }}>
    <span style={labelStyle}>{label}</span>
    {children}
  </label>
);} 
const Th = ({ children, theme, style }) => <th style={{ padding:'6px 8px', textAlign:'left', background: theme.primary, color: theme.text, border:'1px solid '+(theme.name==='Dark' ? '#444':'#888'), fontSize:11, ...style }}>{children}</th>;
const Td = ({ children, colSpan, style }) => <td colSpan={colSpan} style={{ padding:'4px 6px', border:'1px solid #555', fontSize:11, ...style }}>{children}</td>;
const actionBtn = (theme) => ({ background: theme.primary, color: theme.text, border:'1px solid '+(theme.secondary||'#222'), padding:'6px 12px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600, boxShadow:'0 2px 4px rgba(0,0,0,0.3)' });
const smallBtn = (theme) => ({ background: theme.primary, color: theme.text, border:'1px solid '+(theme.secondary||'#222'), padding:'4px 6px', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:600 });
function escapeHtml(str='') { return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }
function PassengerTable({ theme, dir, list, onUpdate, onRemove, onManualRoute, personnelRecords, openAddPerson, applyPersonRecord }) {
  const [nameQuery, setNameQuery] = useState('');
  const [activeRow, setActiveRow] = useState(null);
  const matches = useMemo(()=>{
    if(!personnelRecords || !nameQuery || nameQuery.trim().length<2) return [];
    const q=nameQuery.toLowerCase();
    return personnelRecords.filter(r=> (r.firstName+' '+r.lastName).toLowerCase().includes(q)).slice(0,6);
  }, [nameQuery, personnelRecords]);
  return (
    <div style={{ overflowX:'auto', position:'relative', zIndex:1 }}>
      <table style={{ borderCollapse:'collapse', width:'100%', fontSize:12 }}>
        <colgroup>
          <col style={{ width:36 }} />
          <col style={{ width:190 }} />
          <col style={{ width:140 }} />
          <col style={{ width:60 }} />
          <col style={{ width:60 }} />
            <col style={{ width:46 }} />
          <col style={{ width:80 }} />
          <col style={{ width:110 }} />
          <col style={{ width:140 }} />
          <col style={{ width:280 }} />
          <col style={{ width:56 }} />
        </colgroup>
        <thead>
          <tr>
            <Th theme={theme}>#</Th>
            <Th theme={theme}>Name</Th>
            <Th theme={theme}>Company</Th>
            <Th theme={theme} style={{ textAlign:'center' }}>Body Wt</Th>
            <Th theme={theme} style={{ textAlign:'center' }}>Bag Wt</Th>
            <Th theme={theme} style={{ textAlign:'center' }}>#</Th>
            <Th theme={theme} style={{ textAlign:'center' }}>Total</Th>
            <Th theme={theme}>Origin</Th>
            <Th theme={theme}>Destination</Th>
            <Th theme={theme}>Comments</Th>
            <Th theme={theme}>Action</Th>
          </tr>
        </thead>
        <tbody>
          {list.map((p,i)=>{
            const origin = dir === 'outbound' ? (p.origin || p.metaOrigin) : (p.origin || p.metaOrigin);
            const destination = dir === 'outbound' ? (p.destination || p.metaDestination) : (p.destination || p.metaDestination);
            const bw = parseFloat(p.bodyWeight)||0; const gw = parseFloat(p.bagWeight)||0; const total = bw + gw;
            return (
            <tr key={p.id} style={{ background: i%2? (theme.name==='Dark'? '#3d4146':'#f7f7f7'):'transparent' }}>
              <Td style={{ textAlign:'center' }}>{i+1}</Td>
              <Td style={{ position:'relative' }}>
                <input style={{ width:'100%', boxSizing:'border-box' }} value={p.name} onChange={e=>{ onUpdate(p.id,'name',e.target.value); setNameQuery(e.target.value); setActiveRow(p.id);} } placeholder="Full Name" onBlur={e=>{ setTimeout(()=>{ if(activeRow===p.id) setActiveRow(null); },200); }} />
                {activeRow===p.id && (matches.length>0 || (nameQuery.trim().length>=2 && !matches.length)) && (
                  <div style={{ position:'absolute', top:'100%', left:0, zIndex:500, background: theme.background, border:'1px solid '+(theme.name==='Dark'? '#555':'#888'), borderRadius:6, padding:6, minWidth:220, boxShadow:'0 8px 20px rgba(0,0,0,0.45)' }}>
                    {matches.map(m=> (
                      <div key={m.id} style={{ padding:'4px 6px', cursor:'pointer', fontSize:11, borderRadius:4, background:'#0000' }} onMouseDown={()=>{ applyPersonRecord(p.id, m); setActiveRow(null); }} onMouseEnter={e=> e.currentTarget.style.background = (theme.name==='Dark'?'#2e3439':'#e6eef5')} onMouseLeave={e=> e.currentTarget.style.background='transparent'}>
                        {m.firstName} {m.lastName} <span style={{ opacity:.65 }}>({m.company||'No Company'})</span>
                      </div>
                    ))}
                    {!matches.length && (
                      <div style={{ fontSize:11, padding:'4px 2px' }}>
                        No match found.
                        <button style={{ marginLeft:6, ...smallBtn(theme), padding:'2px 6px', fontSize:10 }} onMouseDown={()=>{ openAddPerson(p.id, nameQuery, dir); setActiveRow(null); }}>Add Person</button>
                      </div>
                    )}
                  </div>
                )}
              </Td>
              <Td><input style={{ width:'100%', boxSizing:'border-box' }} value={p.company} onChange={e=>onUpdate(p.id,'company',e.target.value)} placeholder="Company" /></Td>
              <Td style={{ textAlign:'center' }}><input value={p.bodyWeight||''} onChange={e=>onUpdate(p.id,'bodyWeight',e.target.value.replace(/[^0-9]/g,''))} placeholder="###" style={{ width:'100%', textAlign:'center', boxSizing:'border-box' }} maxLength={3} /></Td>
              <Td style={{ textAlign:'center' }}><input value={p.bagWeight||''} onChange={e=>onUpdate(p.id,'bagWeight',e.target.value.replace(/[^0-9]/g,''))} placeholder="###" style={{ width:'100%', textAlign:'center', boxSizing:'border-box' }} maxLength={3} /></Td>
              <Td style={{ textAlign:'center' }}><input value={p.bagCount||''} onChange={e=>onUpdate(p.id,'bagCount',e.target.value.replace(/[^0-9]/g,''))} placeholder="##" style={{ width:'100%', textAlign:'center', boxSizing:'border-box' }} maxLength={2} /></Td>
              <Td style={{ fontWeight:600, textAlign:'center' }}>{total ? total.toFixed(0) : ''}</Td>
              <Td><input value={p.origin||''} onChange={e=> onManualRoute ? onManualRoute(p.id,'origin',e.target.value) : onUpdate(p.id,'origin',e.target.value)} placeholder={dir==='outbound'? 'Dep':'Arr'} title="Origin (auto-set unless manually changed)" style={{ width:'100%', boxSizing:'border-box' }} /></Td>
              <Td><input value={p.destination||''} onChange={e=> onManualRoute ? onManualRoute(p.id,'destination',e.target.value) : onUpdate(p.id,'destination',e.target.value)} placeholder={dir==='outbound'? 'Arr':'Dep'} title="Destination (auto-set unless manually changed)" style={{ width:'100%', boxSizing:'border-box' }} /></Td>
              <Td><input style={{ width:'100%', boxSizing:'border-box' }} value={p.comments} onChange={e=>onUpdate(p.id,'comments',e.target.value)} placeholder="Notes" /></Td>
              <Td><button onClick={()=>onRemove(p.id)} style={smallBtn(theme)}>✕</button></Td>
            </tr>
          )})}
          {list.length===0 && <tr><Td colSpan={11} style={{ fontStyle:'italic', opacity:.6 }}>None</Td></tr>}
        </tbody>
      </table>
  {/* Spacer to create gap between last row and scrollbar equal to one row height */}
  <div style={{ height:38 }} />
    </div>
  );
}
