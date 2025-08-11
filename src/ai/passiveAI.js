import { onEvent, emitDomain } from './eventBus.js';
import { streamChat } from './client.js';

// Rolling event log & providers
let recent = [];
const MAX_EVENTS = 40;
const providers = {}; // name -> fn()
let enabled = false;
let debugEnabled = false;
let pending = false;
let lastRun = 0;
let intervalMs = 60_000; // configurable interval
const CRITICAL = new Set(['POB_OVER_MAX','POB_OVER_EFFECTIVE']);
let lastSnapshot = null;
let lastSuggestions = [];
let systemPrompt = 'You are Buck, an offshore logistics assistant. Provide at most 3 concise actionable bullet suggestions (risk prevention, capacity, flight optimization).';
let redactionEnabled = false;
const suggestionHistory = []; // { ts, suggestions }
const MAX_HISTORY = 40;

export function registerContextProvider(name, fn) { providers[name] = fn; }
export function setPassiveAIEnabled(v){ enabled = !!v; }
export function setPassiveDebug(v){ debugEnabled = !!v; exposePassiveDebug(); }
export function getPassiveSnapshot(){ return lastSnapshot; }
export function getPassiveEvents(){ return [...recent]; }
export function getPassiveSuggestions(){ return [...lastSuggestions]; }
export function setPassiveInterval(ms){ if(typeof ms==='number' && ms>=5000) intervalMs = ms; }
export function triggerPassiveNow(){ if(!enabled) return; schedule(true); }
export function setPassiveSystemPrompt(p){ if(typeof p==='string' && p.trim()) systemPrompt = p.trim(); }
export function setPassiveRedaction(flag){ redactionEnabled = !!flag; }
export function getPassiveSuggestionHistory(){ return [...suggestionHistory]; }

function record(evt){
  recent.push(evt);
  if(recent.length>MAX_EVENTS) recent.splice(0, recent.length-MAX_EVENTS);
}

function buildSnapshot(){
  const snap = { ts:new Date().toISOString(), intervalMs, events: recent.map(e=>({ t:e.ts, type:e.type, brief:e.brief, meta: trim(e.meta) })), ctx:{} };
  for(const [k,fn] of Object.entries(providers)) {
    try { snap.ctx[k] = trim(fn()); } catch { /* ignore */ }
  }
  lastSnapshot = snap; return snap;
}

function maskString(str){
  if(!str) return str;
  if(str.length <= 2) return str[0]+'*';
  return str[0] + '*'.repeat(Math.min(6, str.length-2)) + str[str.length-1];
}

function redactKey(key, value){
  if(!redactionEnabled) return value;
  const nameLike = /(first|last)?name$/i.test(key) || ['firstName','lastName','name'].includes(key);
  if(nameLike && typeof value==='string') return maskString(value);
  return value;
}

function trim(obj){
  if(!obj || typeof obj!=='object') return obj;
  if(Array.isArray(obj)) return obj.slice(0,8);
  const out={};
  for(const k in obj){
    const v=obj[k];
    if(typeof v==='string') out[k]= redactKey(k, v.length>140? v.slice(0,140)+'…': v);
    else if(Array.isArray(v)) out[k]= v.slice(0,8);
    else if(typeof v==='object') out[k]= trim(v);
    else out[k]=v;
  }
  return out;
}

function schedule(immediate=false){
  if(!enabled) return;
  const now=Date.now();
  if(!immediate && (pending || (now-lastRun < intervalMs))) return;
  pending=true;
  setTimeout(runCycle, immediate? 50: 400);
}

async function runCycle(){
  try {
    const snap=buildSnapshot();
    const compact = JSON.stringify(snap).slice(0,6000);
  const system = systemPrompt + ' Respond JSON only.';
    let acc='';
    await streamChat([
      { role:'system', content: system },
      { role:'user', content: 'SNAPSHOT:'+compact+'\nReturn JSON array: [{"title":"","detail":"","type":"RISK|ACTION|NOTE","urgency":1-5}]' }
    ], {
      onToken:(t, full)=>{ acc=full; },
      onDone:(final)=>{ acc=final; }
    });
    let parsed=[];
    try { parsed = JSON.parse(acc); } catch { /* ignore */ }
    lastSuggestions = parsed.slice(0,3);
  suggestionHistory.push({ ts: Date.now(), suggestions: lastSuggestions });
  if(suggestionHistory.length>MAX_HISTORY) suggestionHistory.splice(0, suggestionHistory.length-MAX_HISTORY);
    window.dispatchEvent(new CustomEvent('passiveAISuggestions', { detail: lastSuggestions }));
  } finally {
    lastRun=Date.now(); pending=false; }
}

export function initPassiveAI(){
  const domainEvents = [
    'POB_TOTAL_CHANGED','CAPACITY_THRESHOLD','WIDGET_MOVED','PERSON_ADDED','PERSON_UPDATED','PERSON_REMOVED','FLIGHT_MANIFEST_UPDATED','BUNK_ASSIGNED','BUNK_UNASSIGNED','CONFIG_CHANGED','MANIFEST_TEMPLATE_CHANGED','MANIFEST_GENERATED'
  ];
  domainEvents.forEach(name=> onEvent(name, evt=> {
    record(evt);
    const immediate = !!(evt.meta && (evt.meta.errorCode && CRITICAL.has(evt.meta.errorCode) || evt.meta.forceImmediate));
    schedule(immediate);
  }));
  // Manual trigger event (UI button)
  window.addEventListener('buckPassiveRefresh', ()=> triggerPassiveNow());
  buildSnapshot();
  // First cycle shortly after init for baseline
  schedule(true);
}

export function exposePassiveDebug(){
  if(debugEnabled){
    window.__buckPassive = {
      snapshot: ()=> lastSnapshot,
      events: ()=> getPassiveEvents(),
      suggestions: ()=> getPassiveSuggestions()
    };
  } else if(window.__buckPassive) delete window.__buckPassive;
}
