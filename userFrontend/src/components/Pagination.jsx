import React from 'react';

const Pagination = ({ page, pages, onPageChange }) => {
  if (pages <= 1) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '16px 0' }}>
      <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
        style={{ padding: '6px 14px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.5 : 1 }}>
        ← Précédent
      </button>
      <span style={{ fontSize: '14px', color: '#555' }}>Page {page} / {pages}</span>
      <button onClick={() => onPageChange(page + 1)} disabled={page >= pages}
        style={{ padding: '6px 14px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: page >= pages ? 'default' : 'pointer', opacity: page >= pages ? 0.5 : 1 }}>
        Suivant →
      </button>
    </div>
  );
};

export default Pagination;
