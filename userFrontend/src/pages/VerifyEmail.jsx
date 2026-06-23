import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import '../styles/teal-theme.css';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) { setStatus('error'); setMessage('Token manquant.'); return; }
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (res.ok) { setStatus('success'); setMessage('Email vérifié avec succès !'); }
        else { setStatus('error'); setMessage(data.message || 'Échec de la vérification.'); }
      } catch {
        setStatus('error'); setMessage('Erreur réseau. Veuillez réessayer.');
      }
    })();
  }, [searchParams]);

  return (
    <div className="page-teal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div className="card-teal" style={{ maxWidth: 440, textAlign: 'center', padding: '2rem' }}>
        <h2>Vérification de l'email</h2>
        {status === 'verifying' && <p>Vérification en cours…</p>}
        {status === 'success' && <p style={{ color: 'var(--color-success, #10B981)' }}>{message}</p>}
        {status === 'error' && <p style={{ color: 'var(--color-danger, #EF4444)' }}>{message}</p>}
        <Link to="/login" className="btn-primary" style={{ display: 'inline-block', marginTop: 16 }}>Se connecter</Link>
      </div>
    </div>
  );
};

export default VerifyEmail;
