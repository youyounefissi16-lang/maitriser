import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth, API_BASE_URL } from '../config/api';
import { useToast } from '../components/Toast';
import { logger } from '../utils/logger';

const disciplines = [
  { value: 'medicine', label: 'Médecine', icon: '🩺', description: 'Programme de médecine générale' },
  { value: 'pharmacy', label: 'Pharmacie', icon: '💊', description: 'Programme de pharmacie' },
];

const DisciplinePicker = () => {
  const navigate = useNavigate();
  const notify = useToast();
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(true);

  useEffect(() => {
    document.title = 'Choisissez votre discipline — MAITRISEZ';
    const check = () => {
      if (localStorage.getItem('userId')) {
        setSyncing(false);
      } else {
        setTimeout(check, 500);
      }
    };
    check();
  }, []);

  const handleSelect = async (discipline) => {
    setSaving(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        body: { discipline },
      });
      if (res.ok) {
        localStorage.setItem('userDiscipline', discipline);
        navigate('/dashboard');
      } else {
        const d = await res.json().catch(() => ({}));
        notify(d.message || 'Erreur lors de l\'enregistrement', 'error');
      }
    } catch (err) {
      logger.error({ err }, 'DisciplinePicker failed');
      notify('Erreur réseau', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (syncing) {
    return (
      <div className="page-teal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="card-teal" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ fontSize: 18 }}>Synchronisation de votre compte…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-teal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="card-teal" style={{ maxWidth: 600, width: '100%', padding: 40 }}>
        <h2 style={{ textAlign: 'center', marginBottom: 8 }}>Bienvenue !</h2>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: 28 }}>
          Choisissez votre discipline pour personnaliser votre expérience
        </p>
        <div style={{ display: 'flex', gap: 16, flexDirection: 'column' }}>
          {disciplines.map((d) => (
            <button
              key={d.value}
              onClick={() => handleSelect(d.value)}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px',
                border: '2px solid var(--border-light, #ddd)', borderRadius: 12,
                background: 'var(--card-bg, #fff)', cursor: 'pointer', textAlign: 'left',
                fontSize: 16, transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--teal, #04484F)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-light, #ddd)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <span style={{ fontSize: 36 }}>{d.icon}</span>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.label}</div>
                <div style={{ fontSize: 13, color: '#888' }}>{d.description}</div>
              </div>
            </button>
          ))}
        </div>
        <p style={{ textAlign: 'center', color: '#aaa', fontSize: 12, marginTop: 20 }}>
          Vous pourrez modifier ce choix plus tard dans votre profil
        </p>
      </div>
    </div>
  );
};

export default DisciplinePicker;
