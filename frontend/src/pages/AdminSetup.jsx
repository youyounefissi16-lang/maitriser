import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from "@clerk/react";
import { useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import '../styles/adminLogin.css';

const AdminSetup = () => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenReady, setTokenReady] = useState(false);
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    let aborted = false;
    (async () => {
      let token = await getToken();
      if (!token && isSignedIn) {
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 500));
          if (aborted || !mountedRef.current) return;
          token = await getToken();
          if (token) break;
        }
      }
      if (!aborted && mountedRef.current) setTokenReady(true);
    })();
    return () => { aborted = true; };
  }, [isLoaded, isSignedIn, getToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) { setError('Session expired. Please sign out and sign in again.'); setLoading(false); return; }
      await axios.post(`${API_BASE_URL}/api/admin/claim`, { code });
      localStorage.setItem('adminRole', 'admin');
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || (err.message === 'Network Error' ? 'Network error. Please check your connection.' : 'Invalid code'));
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) return <div style={{ padding: 24 }}>Vérification…</div>;
  if (!isSignedIn) return <Navigate to="/login" replace />;
  if (!tokenReady) {
    return (
      <div className="form-container">
        <div className="form" style={{ textAlign: 'center', padding: 40 }}>
          <div className="spinner" style={{ margin: '0 auto 16px', width: 32, height: 32, border: '3px solid #e0e0e0', borderTopColor: '#0C4A4A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: '#888', fontSize: 14 }}>Initializing session…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="form-container">
      <div className="form">
        <h2 style={{ textAlign: 'center', marginBottom: 20 }}>Admin Setup</h2>
        <p style={{ textAlign: 'center', color: '#888', marginBottom: 16, fontSize: 14 }}>
          Enter the admin code to claim admin access.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="code">Admin Code</label>
            <input type="password" id="code" value={code}
              onChange={(e) => setCode(e.target.value)} required />
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="form-btn" disabled={loading}>
            {loading ? 'Verifying...' : 'Claim Admin'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminSetup;
