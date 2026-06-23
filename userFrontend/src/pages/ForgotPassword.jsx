import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import '../styles/teal-theme.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMessage(data.message || 'Email envoyé si le compte existe.');
    } catch {
      setMessage('Erreur réseau.');
    } finally { setLoading(false); }
  };

  return (
    <div className="page-teal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div className="card-teal" style={{ maxWidth: 400, padding: '2rem' }}>
        <h2>Mot de passe oublié</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 16 }}>
          Entrez votre email pour recevoir un lien de réinitialisation.
        </p>
        <form onSubmit={handleSubmit}>
          <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Votre email" required style={{ width: '100%', marginBottom: 12 }} />
          <button className="btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Envoi…' : 'Envoyer le lien'}
          </button>
        </form>
        {message && <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>{message}</p>}
        <p style={{ marginTop: 16, textAlign: 'center' }}><Link to="/login">Retour à la connexion</Link></p>
      </div>
    </div>
  );
};

export default ForgotPassword;
