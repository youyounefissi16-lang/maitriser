import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ProfileGuardModal = ({ children }) => {
  const navigate = useNavigate();
  const [incomplete, setIncomplete] = useState(true);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const disc = localStorage.getItem('userDiscipline');
    const year = localStorage.getItem('userYear');
    setIncomplete(!disc || !year);
    setChecking(false);
  }, []);

  if (checking) return null;

  if (incomplete) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          background: 'var(--card-bg, #fff)',
          color: 'var(--text-dark, #0F172A)',
          borderRadius: 16, padding: 40, maxWidth: 420,
          width: '90%', textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16, lineHeight: 1 }}>⚠️</div>
          <h2 style={{ marginBottom: 12, color: 'var(--teal-dark, #04484F)' }}>Profil incomplet</h2>
          <p style={{ color: 'var(--text-dark, #555)', marginBottom: 24, lineHeight: 1.6, fontSize: 15 }}>
            Veuillez renseigner votre discipline et votre année dans votre profil pour accéder à cette page.
          </p>
          <button
            onClick={() => navigate('/profile')}
            style={{
              padding: '12px 32px', fontSize: 16, fontWeight: 600,
              background: 'linear-gradient(135deg, var(--teal-dark, #04484F), var(--teal-deeper, #066A73))',
              color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            Aller au profil
          </button>
        </div>
      </div>
    );
  }

  return children;
};

export default ProfileGuardModal;
