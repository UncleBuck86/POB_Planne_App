import React, { useState, useRef, useEffect } from 'react';
import { streamChat, isOpenAI } from '../ai/client.js';

export default function AISidebar({ suggestion, onAsk, open, setOpen, getContext }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState(() => [
    { role: 'assistant', content: suggestion || 'Ask me about POB planning, logistics risks, or capacity issues.' }
  ]);
  const [includeContext, setIncludeContext] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    // Update initial assistant message if external suggestion changes
    if (suggestion && !messages.some(m=>m.role==='assistant' && m.content.includes(suggestion))) {
      setMessages(m => [...m, { role: 'assistant', content: suggestion }]);
    }
  }, [suggestion]);

  useEffect(()=> {
    const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const handleAsk = async () => {
    if (!question.trim()) return;
    // Optionally append context snapshot
    let content = question.trim();
    if (includeContext && typeof getContext === 'function') {
      try {
        const ctx = getContext();
        content += '\n\n[SCREEN_CONTEXT]\n' + JSON.stringify(ctx).slice(0, 6000);
      } catch {/* ignore context errors */}
    }
    const userMsg = { role: 'user', content };
    setMessages(m => [...m, userMsg]);
    setQuestion('');
    setLoading(true);
    let assistantAccum = '';
    try {
      await streamChat([...messages.filter(m=>m.role!=='system'), userMsg], {
        onToken: (tok, full) => {
          assistantAccum = full;
          setMessages(curr => {
            // If last is streaming assistant, update; else append new
            if (curr.length && curr[curr.length-1].role === 'assistant' && curr[curr.length-1].streaming) {
              const updated = [...curr];
              updated[updated.length-1] = { role:'assistant', content: full, streaming:true };
              return updated;
            }
            return [...curr, { role:'assistant', content: full, streaming:true }];
          });
        },
        onDone: (final) => {
          setMessages(curr => {
            if (curr.length && curr[curr.length-1].role === 'assistant' && curr[curr.length-1].streaming) {
              const updated = [...curr];
              updated[updated.length-1] = { role:'assistant', content: final };
              return updated;
            }
            return [...curr, { role:'assistant', content: final }];
          });
        },
        onError: (err) => {
          setMessages(m => [...m, { role:'assistant', content: 'Error: '+err.message }]);
        },
        temperature: 0.2,
        maxTokens: 400
      });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', right: 0, top: 64, width: 360, height: 'calc(100vh - 64px)', background: '#1e1f22',
      color: '#e6e6e6', boxShadow: '0 0 12px #0008', transition: 'right 0.3s', zIndex: 1000, display:'flex', flexDirection:'column', borderLeft:'1px solid #333'
    }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', borderBottom:'1px solid #333' }}>
        <strong style={{ fontSize:14 }}>AI Assistant</strong>
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={()=> setMessages([{ role:'assistant', content:'Context cleared. Ask a new question.' }])} style={btnStyle('#444')}>Clear</button>
          <button onClick={() => setOpen(false)} style={btnStyle('#444')}>✕</button>
        </div>
      </div>
      <div ref={scrollRef} style={{ flex:1, overflowY:'auto', padding:'12px 14px', fontSize:13 }}>
        {messages.map((m,i) => (
          <div key={i} style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, opacity:0.6, textTransform:'uppercase', marginBottom:2 }}>{m.role === 'user' ? 'You' : 'Assistant'}</div>
            <div style={{ background: m.role==='user'?'#2d2f33':'#26292d', padding:'8px 10px', borderRadius:6, whiteSpace:'pre-wrap' }}>{m.content}</div>
          </div>
        ))}
        {loading && isOpenAI && <div style={{ fontSize:11, opacity:0.6 }}>Streaming...</div>}
      </div>
      <div style={{ padding:'10px 12px', borderTop:'1px solid #333' }}>
        <form onSubmit={e=> { e.preventDefault(); handleAsk(); }} style={{ display:'flex', gap:8 }}>
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Ask a question..."
            style={{ flex:1, padding:'8px 10px', borderRadius:6, border:'1px solid #444', background:'#1b1c1f', color:'#e6e6e6', fontSize:13 }}
            disabled={loading}
          />
          <button type="submit" disabled={loading || !question.trim()} style={btnStyle('#375a9e')}>
            {loading ? '...' : 'Send'}
          </button>
        </form>
        <label style={{ display:'flex', alignItems:'center', gap:6, marginTop:8, fontSize:11, opacity:0.8 }}>
          <input type="checkbox" checked={includeContext} onChange={e=> setIncludeContext(e.target.checked)} /> Include screen context
        </label>
        <div style={{ marginTop:6, fontSize:10, opacity:0.55 }}>Shift+Enter for newline.</div>
      </div>
    </div>
  );
}

function btnStyle(bg) {
  return { background:bg, color:'#eee', border:'1px solid #555', padding:'6px 10px', borderRadius:5, cursor:'pointer', fontSize:12 };
}
