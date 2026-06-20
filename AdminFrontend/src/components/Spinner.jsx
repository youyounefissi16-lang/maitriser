import React from 'react';

const Spinner = ({ size = 24, text = 'Loading...' }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 20, justifyContent: 'center' }}>
    <div style={{
      width: size, height: size,
      border: '3px solid var(--dc-border)',
      borderTopColor: 'var(--dc-accent)',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
    <span style={{ color: 'var(--dc-text)', fontSize: '0.9rem' }}>{text}</span>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export default Spinner;
