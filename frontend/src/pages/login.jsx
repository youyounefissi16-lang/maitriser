import React, { useEffect, useState } from 'react';
import { SignIn, useAuth } from "@clerk/react";
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import '../styles/teal-theme.css';
import '../styles/pagesStyle/login.css';

const Login = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const userId = (() => { try { return localStorage.getItem('userId'); } catch { return null; } })();
    if (userId) {
      navigate('/dashboard', { replace: true });
    } else {
      setWaiting(true);
      const interval = setInterval(() => {
        const uid = (() => { try { return localStorage.getItem('userId'); } catch { return null; } })();
        if (uid) {
          clearInterval(interval);
          navigate('/dashboard', { replace: true });
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded) return (
    <div className="page-teal login-page">
      <div className="login-loading">{t('loading')}</div>
    </div>
  );

  if (isSignedIn && waiting) {
    return (
      <div className="page-teal login-page">
        <div className="login-container login-sync-container">
          <div className="login-sync-inner">
            <p>{t('login.syncing')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isSignedIn) return null;

  return (
    <div className="page-teal login-page">
      <div className="login-container">
        <div className="login-form" role="main" aria-label="Formulaire de connexion">
          <SignIn signUpUrl="/signup" afterSignInUrl="/login" />
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
