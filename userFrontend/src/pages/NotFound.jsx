import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div className="page-teal">
      <div className="card-teal" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '72px', fontWeight: 800, color: '#14a3a8', marginBottom: '8px' }}>404</div>
        <h2 style={{ marginBottom: '8px' }}>Page introuvable</h2>
        <p style={{ color: '#888', marginBottom: '24px' }}>La page que vous cherchez n'existe pas.</p>
        <button className="btn-primary" onClick={() => navigate('/')}>Retour à l'accueil</button>
      </div>
    </div>
  );
};

export default NotFound;
