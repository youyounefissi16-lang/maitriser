import React, { useState, useEffect } from 'react';
import { API_BASE_URL, authHeaders } from '../config/api';
import { useToast } from '../components/Toast';
import { useTranslation } from '../context/LanguageContext';
import '../styles/teal-theme.css';

const ProfilePage = () => {
  const { t } = useTranslation();
  const notify = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  useEffect(() => {
    document.title = 'Mon Profil — QuizApp';
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/profile`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setName(data.user?.name || '');
        setEmail(data.user?.email || '');
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) return notify('Name is required', 'warning');
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        notify(t('profile.saved'), 'success');
        if (data.user) { setName(data.user.name); setEmail(data.user.email); }
      } else notify(data.message || t('profile.error'), 'error');
    } catch { notify(t('profile.error'), 'error'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return notify('Fill all fields', 'warning');
    if (newPassword.length < 6) return notify('New password must be at least 6 characters', 'warning');
    setChangingPwd(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) { notify(t('profile.pwdChanged'), 'success'); setCurrentPassword(''); setNewPassword(''); }
      else notify(data.message, 'error');
    } catch { notify(t('profile.error'), 'error'); }
    finally { setChangingPwd(false); }
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', border: '1px solid var(--border-light, #ddd)',
    borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', marginBottom: '12px',
  };

  if (loading) return <div className="page-teal"><div className="card-teal" style={{ textAlign: 'center', padding: 40 }}>{t('loading')}</div></div>;

  return (
    <div className="page-teal">
      <div className="card-teal" style={{ maxWidth: '500px', margin: '0 auto' }}>
        <h2 style={{ marginBottom: '24px' }}>{t('profile.title')}</h2>

        <label style={{ fontWeight: 600, fontSize: '13px', display: 'block', marginBottom: '4px' }}>{t('profile.name')}</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />

        <label style={{ fontWeight: 600, fontSize: '13px', display: 'block', marginBottom: '4px' }}>{t('profile.email')}</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />

        <button className="btn-primary" onClick={handleSaveProfile} disabled={saving} style={{ width: '100%', marginBottom: '32px' }}>
          {saving ? t('profile.saving') : t('profile.save')}
        </button>

        <h3 style={{ marginBottom: '16px' }}>{t('profile.passwordTitle')}</h3>

        <label style={{ fontWeight: 600, fontSize: '13px', display: 'block', marginBottom: '4px' }}>{t('profile.currentPwd')}</label>
        <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={inputStyle} />

        <label style={{ fontWeight: 600, fontSize: '13px', display: 'block', marginBottom: '4px' }}>{t('profile.newPwd')}</label>
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} />

        <button className="btn-primary" onClick={handleChangePassword} disabled={changingPwd} style={{ width: '100%' }}>
          {changingPwd ? t('profile.saving') : t('profile.changePwd')}
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
