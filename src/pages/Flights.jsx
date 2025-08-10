import React, { useState, useMemo } from 'react';
import { useTheme } from '../ThemeContext.jsx';
import { generateFlightComments } from '../utils/generateFlightComment.js';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

// Format date into planner key (M/D/YYYY)
const keyForDate = (d) => (d.getMonth()+1) + '/' + d.getDate() + '/' + d.getFullYear();

export default function FlightsPage() {
  const { theme } = useTheme();
  const rowData = useMemo(() => { try { return JSON.parse(localStorage.getItem('pobPlannerData')) || []; } catch { return []; } }, []);
  const today = new Date();
  const [displayMonth, setDisplayMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDates, setSelectedDates] = useState([]);
  const [manifestOpen, setManifestOpen] = useState(false);

  const allDatesForMonth = useMemo(() => {
    const y = displayMonth.getFullYear();
    const m = displayMonth.getMonth();
    const first = new Date(y, m, 1);
    const arr = []; let d = new Date(first);
    while (d.getMonth() === m) { arr.push(new Date(d)); d.setDate(d.getDate()+1); }
    return arr;
  }, [displayMonth]);
  const { flightsOut, flightsIn } = useMemo(() => {
    if (!allDatesForMonth.length) return { flightsOut:{}, flightsIn:{} };
    const base = new Date(allDatesForMonth[0]); base.setDate(base.getDate()-1);
    const dateObjs = [base, ...allDatesForMonth].map(d => ({ date: keyForDate(d) }));
    return generateFlightComments(rowData, dateObjs);
  }, [allDatesForMonth, rowData]);
  const movementCounts = useMemo(()=> {
    const map = {};
    allDatesForMonth.forEach(d => { const k = keyForDate(d); map[k] = (flightsOut[k]?.length||0) + (flightsIn[k]?.length||0); });
    return map;
  }, [allDatesForMonth, flightsOut, flightsIn]);
  const sortedSelectedKeys = selectedDates.map(d => keyForDate(d)).sort((a,b)=> new Date(a)-new Date(b));
  const clearSelection = () => { setSelectedDates([]); setManifestOpen(false); };

  return (
    <div style={{ color: theme.text, background: theme.background, minHeight:'100vh', padding:'24px' }}>
      <a href="#logistics" style={{ textDecoration:'none', color: theme.primary, fontSize:12, fontWeight:600 }}>← Back</a>
      <h2 style={{ margin:'8px 0 12px' }}>Flights</h2>
      <div style={{ display:'flex', gap:40, alignItems:'flex-start', flexWrap:'wrap' }}>
        <div style={{ background: theme.surface, padding:16, border:'1px solid '+(theme.name==='Dark' ? '#555':'#ccc'), borderRadius:12, boxShadow:'0 4px 10px rgba(0,0,0,0.25)' }}>
          <DayPicker
            mode="multiple"
            month={displayMonth}
            onMonthChange={setDisplayMonth}
            selected={selectedDates}
            onSelect={(days)=> { setSelectedDates(days||[]); if (days && days.length) setManifestOpen(true); }}
            showOutsideDays
            weekStartsOn={0}
            modifiers={{}}
            components={{
              DayContent: (props) => {
                const day = props.date;
                const k = keyForDate(day);
                const movement = movementCounts[k] || 0;
                return (
                  <div style={{ position:'relative', width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }} title={movement? `${movement} flight movement change(s)`: undefined}>
                    <span>{day.getDate()}</span>
                    {movement>0 && <span style={{ position:'absolute', bottom:2, right:2, fontSize:9, padding:'1px 3px', borderRadius:6, background: theme.secondary, color: theme.text }}>{movement}</span>}
                  </div>
                );
              }
            }}
            styles={{
              caption:{ color: theme.text },
              head_cell:{ background: theme.primary, color: theme.text, fontWeight:600, fontSize:12 },
              day:{ fontSize:'0.7rem', padding:'6px 0' },
              day_selected:{ background: theme.primary, color: theme.text },
              day_today:{ outline:'2px solid '+theme.secondary },
              nav_button_previous:{ background: theme.primary, color: theme.text },
              nav_button_next:{ background: theme.primary, color: theme.text }
            }}
          />
          <div style={{ marginTop:8, fontSize:11, opacity:.75 }}>Select one or more dates to view flight manifest.</div>
          {selectedDates.length>0 && <button onClick={clearSelection} style={{ marginTop:8, ...navBtnStyle(theme), padding:'6px 10px' }}>Clear Selection</button>}
        </div>
      </div>

  {manifestOpen && selectedDates.length>0 && (
        <div style={overlayStyle} onClick={e=> { if(e.target===e.currentTarget) setManifestOpen(false); }}>
          <div style={modalStyle(theme)}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <div style={{ fontSize:18, fontWeight:700 }}>Flight Manifest</div>
              <button onClick={()=> setManifestOpen(false)} style={navBtnStyle(theme)}>Close</button>
            </div>
    {sortedSelectedKeys.map(k => {
      const outs = flightsOut[k] || [];
      const ins = flightsIn[k] || [];
              const totalOut = outs.reduce((s,v)=> s + (parseInt(String(v).split('-')[0],10)||0),0);
              const totalIn = ins.reduce((s,v)=> s + (parseInt(String(v).split('-')[0],10)||0),0);
              return (
                <div key={k} style={{ marginBottom:16, border:'1px solid '+(theme.name==='Dark' ? '#666':'#ccc'), borderRadius:8, overflow:'hidden' }}>
                  <div style={{ background: theme.primary, color: theme.text, padding:'6px 10px', fontWeight:600 }}>{k}</div>
                  <div style={{ padding:'8px 10px', background: theme.surface }}>
                    <div style={{ fontSize:12, fontWeight:600, marginBottom:4 }}>Flights Out (+) {totalOut? `Total: ${totalOut}`:''}</div>
                    {outs.length ? <ul style={{ margin:0, padding:'0 0 0 18px', fontSize:12 }}>{outs.map((c,i)=> <li key={i}>{c}</li>)}</ul> : <div style={{ fontSize:11, fontStyle:'italic', opacity:.6 }}>No increases</div>}
                    <div style={{ fontSize:12, fontWeight:600, margin:'8px 0 4px' }}>Flights In (-) {totalIn? `Total: ${totalIn}`:''}</div>
                    {ins.length ? <ul style={{ margin:0, padding:'0 0 0 18px', fontSize:12 }}>{ins.map((c,i)=> <li key={i}>{c}</li>)}</ul> : <div style={{ fontSize:11, fontStyle:'italic', opacity:.6 }}>No decreases</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const navBtnStyle = (theme) => ({ background: theme.primary, color: theme.text, border:'1px solid '+theme.secondary, borderRadius:6, padding:'4px 8px', cursor:'pointer', fontSize:12, fontWeight:600 });
const overlayStyle = { position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'60px 20px', zIndex:400 };
const modalStyle = (theme) => ({ background: theme.background, color: theme.text, width:'min(820px,100%)', maxHeight:'80vh', overflowY:'auto', border:'1px solid '+(theme.name==='Dark'?'#777':'#444'), borderRadius:12, padding:'14px 16px', boxShadow:'0 8px 24px rgba(0,0,0,0.35)' });
