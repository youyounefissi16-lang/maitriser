import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { API_BASE_URL } from '../config/api';
import '../styles/teal-theme.css';

const ResetPassword = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const token = searchParams.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) { setMessage('Token manquant.'); return; }
    setLoading(true); setMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) setMessage(t('reset.success'));
      else setMessage(data.message || t('reset.error.generic'));
    } catch {
      setMessage(t('reset.error.generic'));
    } finally { setLoading(false); }
  };

  return (
    <div className="page-teal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div className="card-teal" style={{ maxWidth: 400, padding: '2rem' }}>
        <h2>{t('reset.title')}</h2>
        {!token ? (
          <p style={{ color: 'var(--color-danger)' }}>{t('reset.error.generic')}</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <input type="password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={t('reset.password')} required minLength={8}
              style={{ width: '100%', marginBottom: 12 }} />
            <button className="btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? t('reset.loading') : t('reset.button')}
            </button>
          </form>
        )}
        {message && (
          <p style={{ marginTop: 12, color: message === t('reset.success') ? 'var(--color-success)' : 'var(--text-muted)' }}>
            {message}
          </p>
        )}
        {message === t('reset.success') && (
          <p style={{ marginTop: 12, textAlign: 'center' }}><Link to="/login">{t('nav.login')}</Link></p>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
