import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from "@clerk/react";
import { authFetch } from '../config/authFetch';
import { logger } from '../utils/logger';

const AdminProfile = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const adminName = user?.fullName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'Admin';
  const adminEmail = user?.emailAddresses?.[0]?.emailAddress || '—';
  let adminRole = '—';
  try { adminRole = localStorage.getItem('adminRole') || '—'; } catch { /* ignore */ }
  const adminId = user?.id || '—';

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMsg('');
    setPwError('');
    if (newPassword.length < 6) { setPwError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    setPwLoading(true);
    try {
      const res = await authFetch('/api/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = res.ok ? await res.json() : null;
      if (!res.ok) { setPwError(data?.message || 'Error'); return; }
      setPwMsg('Mot de passe modifié avec succès.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      logger.error({ err }, 'AdminProfile changePassword failed');
      setPwError('Erreur lors du changement de mot de passe.');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="admin-page">
      <h2>Profil administrateur</h2>
      <div className="admin-form-card" style={{ maxWidth: 400, textAlign: 'center' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--dc-accent), var(--dc-highlight))',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', fontWeight: 'bold', margin: '0 auto 16px',
        }}>
          {adminName.charAt(0).toUpperCase()}
        </div>
        <h3 style={{ marginBottom: 4 }}>{adminName}</h3>
        <p style={{ color: 'var(--dc-text-muted)', marginBottom: 20, fontSize: '0.9rem' }}>{adminRole}</p>
        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><strong>Email:</strong> {adminEmail}</div>
          <div><strong>ID:</strong> {adminId}</div>
          <div><strong>Rôle:</strong> <span className="year-tag">{adminRole}</span></div>
        </div>

        <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid var(--dc-border)' }} />
        <h4 style={{ marginBottom: 12, textAlign: 'left' }}>Changer le mot de passe</h4>
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
          <input type="password" placeholder="Mot de passe actuel" value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)} required
            style={{ padding: '10px', borderRadius: 6, border: '1px solid var(--dc-border)', width: '100%', boxSizing: 'border-box' }} />
          <input type="password" placeholder="Nouveau mot de passe" value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)} required
            style={{ padding: '10px', borderRadius: 6, border: '1px solid var(--dc-border)', width: '100%', boxSizing: 'border-box' }} />
          <button type="submit" disabled={pwLoading}
            style={{ padding: '10px', border: 'none', borderRadius: 6, background: 'var(--dc-accent)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
            {pwLoading ? 'Mise à jour…' : 'Changer le mot de passe'}
          </button>
          {pwMsg && <p style={{ color: '#27ae60', fontSize: '0.85rem', margin: 0 }}>{pwMsg}</p>}
          {pwError && <p style={{ color: '#e74c3c', fontSize: '0.85rem', margin: 0 }}>{pwError}</p>}
        </form>

        <button onClick={() => navigate('/dashboard')} style={{
          marginTop: 20, padding: '8px 24px', border: 'none', borderRadius: 6,
          background: 'var(--dc-highlight)', color: '#fff', cursor: 'pointer', fontWeight: 600,
        }}>
          Retour au tableau de bord
        </button>
      </div>
    </div>
  );
};

export default AdminProfile;
