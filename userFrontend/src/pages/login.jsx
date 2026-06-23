import React, { useEffect, useState, useRef } from 'react';
import { SignIn, useAuth, useClerk } from "@clerk/react";
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { setToken } from '../utils/tokenStore';
import { logger } from '../utils/logger';
import { API_BASE_URL } from '../config/api';
import { useTranslation } from '../context/LanguageContext';
import '../styles/teal-theme.css';
import '../styles/pagesStyle/login.css';

const Login = () => {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [status, setStatus] = useState('idle');
  const synced = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || synced.current || status !== 'idle') return;
    let aborted = false;
    try { localStorage.removeItem('userId'); } catch { /* ignore */ }
    setStatus('syncing');
    const sync = async () => {
      try {
        let token = await getToken();
        if (!token) {
          for (let i = 0; i < 10; i++) {
            if (aborted) return;
            await new Promise((r) => setTimeout(r, 300));
            token = await getToken();
            if (token) break;
          }
        }
        if (aborted) return;
        if (!token) throw new Error('No token');
        setToken(token);
        const res = await axios.post(
          `${API_BASE_URL}/api/auth/clerk-sync`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (aborted) return;
        try { localStorage.setItem('userId', res.data.userId); } catch { /* ignore */ }
        synced.current = true;
        navigate('/', { replace: true });
      } catch (err) {
        logger.error({ err }, 'Login sync failed');
        if (!aborted) setStatus('sync_failed');
      }
    };
    sync();
    return () => { aborted = true; };
  }, [isLoaded, isSignedIn, status, getToken, navigate]);

  if (!isLoaded) return (
    <div className="page-teal login-page">
      <div className="login-loading">{t('loading')}</div>
    </div>
  );

  if (isSignedIn) {
    return (
      <div className="page-teal login-page">
        <div className="login-container login-sync-container">
          <div className="login-sync-inner">
            {status === 'syncing' && <p>{t('login.syncing')}</p>}
            {status === 'sync_failed' && (
              <>
                <p className="login-sync-error">{t('login.syncFailed')}</p>
                <button className="login-btn" onClick={() => setStatus('idle')}>{t('login.retry')}</button>
                <button className="login-btn login-btn-secondary" onClick={() => signOut()}>{t('login.signOut')}</button>
              </>
            )}
            {status === 'idle' && <p>{t('login.checking')}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-teal login-page">
      <div className="login-container">
        <div className="login-form" role="main" aria-label="Formulaire de connexion">
          <SignIn signUpUrl="/signup" />
          <p style={{ textAlign: 'center', marginTop: 16 }}>
            <a href="/forgot-password" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Mot de passe oublié ?</a>
          </p>
        </div>
        <div className="vertical-line"></div>
        <div className="description">
          <h2>{t('login.title')}</h2>
          <p>{t('login.subtitle')}</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
