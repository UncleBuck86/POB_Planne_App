// Passive AI code removed on 2025-08-11. See _ARCHIVE_2025_08_11/passiveAI.js for original implementation.
// Graceful stubs so UI does not crash when AI is disabled.
export function getPassiveSuggestions() { return []; }
export function getPassiveSnapshot() { return null; }
export function registerContextProvider() { /* stub */ }
export function setPassiveAIEnabled() { /* stub */ }

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

export function initPassiveAI() { /* stub */ }

export function exposePassiveDebug() { /* stub */ }
export function setPassiveDebug() { /* stub */ }
export function setPassiveInterval() { /* stub */ }
export function setPassiveRedaction() { /* stub */ }
export function setPassiveSystemPrompt() { /* stub */ }
export function triggerPassiveNow() { /* stub */ }
