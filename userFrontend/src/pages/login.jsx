import React, { useEffect, useState, useRef } from 'react';
import { SignIn, useAuth, useClerk } from "@clerk/react";
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { setToken } from '../utils/tokenStore';
import '../styles/teal-theme.css';
import '../styles/pagesStyle/login.css';

const Login = () => {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const [status, setStatus] = useState('idle');
  const synced = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || synced.current || status !== 'idle') return;
    let aborted = false;
    localStorage.removeItem('userId');
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
          `${import.meta.env.VITE_API_BASE_URL}/api/auth/clerk-sync`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (aborted) return;
        localStorage.setItem('userId', res.data.userId);
        synced.current = true;
        navigate('/', { replace: true });
      } catch {
        if (!aborted) setStatus('sync_failed');
      }
    };
    sync();
    return () => { aborted = true; };
  }, [isLoaded, isSignedIn, status, getToken, navigate]);

  if (!isLoaded) return <div className="page-teal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>Loading...</div>;

  if (isSignedIn) {
    return (
      <div className="page-teal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div className="login-container" style={{ justifyContent: 'center', alignItems: 'center', height: 'auto', padding: 60 }}>
          <div style={{ textAlign: 'center' }}>
            {status === 'syncing' && <p>Syncing your account…</p>}
            {status === 'sync_failed' && (
              <>
                <p style={{ color: '#e74c3c', marginBottom: 16 }}>Sync failed</p>
                <button className="login-btn" onClick={() => setStatus('idle')} style={{ marginBottom: 12 }}>Retry</button>
                <br />
                <button className="login-btn" style={{ background: '#888' }} onClick={() => signOut()}>Sign out</button>
              </>
            )}
            {status === 'idle' && <p>Checking account…</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-teal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div className="login-container">
        <div className="login-form">
          <SignIn signUpUrl="/signup" />
        </div>
        <div className="vertical-line"></div>
        <div className="description">
          <h2>Welcome Back</h2>
          <p>Sign in to continue your learning journey.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
