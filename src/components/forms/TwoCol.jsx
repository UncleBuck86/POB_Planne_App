import React from 'react';

export default function TwoCol({ children, gap=16, align='start' }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap, alignItems:align }}>
      {children}
    </div>
  );
}
