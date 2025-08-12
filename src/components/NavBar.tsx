import React from 'react';
import { useAuth } from '../auth/AuthContext';

export const NavBar: React.FC = () => {
  const { state, logout } = useAuth();
  return (
    <div style={{ display:'flex', gap:12, alignItems:'center', padding:'8px 12px', background:'#101826', color:'#fff' }}>
      <div style={{ fontWeight:700 }}>POB Planner</div>
      <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
        {state.isAuthenticated ? (
          <>
            <span style={{ fontSize:12 }}>User: {state.username}</span>
            <span style={{ fontSize:12 }}>Effective Role: {state.effectiveRole}</span>
            <button onClick={logout} style={{ padding:'6px 10px', borderRadius:6, background:'#334155', color:'#fff', border:'1px solid #475569', cursor:'pointer' }}>Logout</button>
          </>
        ) : (
          <span style={{ fontSize:12, opacity:.8 }}>Not signed in</span>
        )}
      </div>
    </div>
  );
};
