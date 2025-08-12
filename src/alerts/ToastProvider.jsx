import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { storage } from '../utils/storageAdapter';

const ToastContext = createContext({ addToast: () => {} });
export const TOAST_PREF_KEY = 'pobToastDisabled';

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const seenKeys = useRef(new Set());
  const [detailModal, setDetailModal] = useState(null);
  const toastDisabled = storage.getBool(TOAST_PREF_KEY, false);

  const addToast = useCallback((toast) => {
    if (toastDisabled) return; // user opted out
    const key = toast.dedupeKey;
    if (key && seenKeys.current.has(key)) return;
    if (key) seenKeys.current.add(key);
    const id = ++idCounter;
    setToasts(t => [...t, { id, ...toast }]);
    if (toast.autoClose !== false) {
      setTimeout(() => {
        setToasts(t => t.filter(x => x.id !== id));
      }, toast.timeout || 6000);
    }
  }, [toastDisabled]);

  const showDetail = useCallback((toast) => {
    setDetailModal({
      title: toast.title || 'Details',
      message: toast.message,
      detail: toast.detail,
      fix: toast.fix,
      link: toast.link
    });
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div style={{ position:'fixed', bottom:16, right:16, zIndex:9999, display:'flex', flexDirection:'column', gap:8, maxWidth:360 }}>
        {toasts.map(t => (
          <div key={t.id} onClick={() => showDetail(t)} style={{ cursor:'pointer', padding:'10px 12px', borderRadius:6, boxShadow:'0 4px 10px -2px rgba(0,0,0,0.35)', background: t.type==='error'? '#b00020' : t.type==='warn'? '#ff9800' : t.type==='info'? '#1976d2': '#455a64', color:'#fff', fontSize:13, lineHeight:1.25, border:'1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ fontWeight:600, marginBottom:2 }}>{t.title || (t.type==='error'?'Error': t.type==='warn'?'Warning':'Notice')}</div>
            <div style={{ opacity:.9 }}>{t.message}</div>
            <div style={{ fontSize:11, opacity:.7, marginTop:4 }}>Click for details</div>
          </div>
        ))}
      </div>
      {detailModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10000 }} onClick={()=>setDetailModal(null)}>
          <div onClick={e=>e.stopPropagation()} style={{ width:'min(600px,90%)', maxHeight:'80vh', overflowY:'auto', background:'#1e1f22', color:'#fff', padding:20, borderRadius:8, boxShadow:'0 6px 18px -4px rgba(0,0,0,0.6)' }}>
            <h3 style={{ marginTop:0 }}>{detailModal.title}</h3>
            <p style={{ whiteSpace:'pre-wrap' }}>{detailModal.message}</p>
            {detailModal.detail && (
              <div style={{ marginTop:12 }}>
                <strong>Details:</strong>
                <pre style={{ background:'#2a2c30', padding:10, fontSize:12, overflowX:'auto', borderRadius:4 }}>{detailModal.detail}</pre>
              </div>
            )}
            {detailModal.fix && (
              <div style={{ marginTop:12 }}>
                <strong>Recommended Fix:</strong>
                <div style={{ marginTop:4, fontSize:13, lineHeight:1.35 }}>{detailModal.fix}</div>
              </div>
            )}
            {detailModal.link && (
              <div style={{ marginTop:14 }}>
                <a href={detailModal.link} style={{ color:'#64b5f6' }}>Go to related page</a>
              </div>
            )}
            <div style={{ marginTop:20, display:'flex', justifyContent:'flex-end' }}>
              <button onClick={()=>setDetailModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(){
  return useContext(ToastContext);
}
