import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div className="admin-page">
      <div className="admin-form-card" style={{ textAlign: 'center', padding: '60px 20px', maxWidth: 400, margin: '60px auto' }}>
        <div style={{ fontSize: '72px', fontWeight: 800, color: 'var(--dc-accent)', marginBottom: '8px' }}>404</div>
        <h2 style={{ marginBottom: '8px' }}>Page introuvable</h2>
        <p style={{ color: 'var(--dc-text-muted)', marginBottom: '24px' }}>La page que vous cherchez n'existe pas.</p>
        <button onClick={() => navigate('/dashboard')} style={{ padding: '10px 24px', border: 'none', borderRadius: 6, background: 'var(--dc-accent)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
          Retour au tableau de bord
        </button>
      </div>
    </div>
  );
};

export default NotFound;
