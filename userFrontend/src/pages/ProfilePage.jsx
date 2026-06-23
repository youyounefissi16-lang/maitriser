import React, { useState, useEffect } from 'react';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import { useToast } from '../components/Toast';
import { useTranslation } from '../context/LanguageContext';
import { logger } from '../utils/logger';
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
    document.title = `${t('profile.title')} — MAITRISEZ`;
    const controller = new AbortController();
    fetchUser(controller.signal);
    return () => controller.abort();
  }, []);

  const fetchUser = async (signal) => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/users/profile`, { signal });
      if (res.ok) {
        const data = await res.json();
        setName(data.user?.name || '');
        setEmail(data.user?.email || '');
      } else {
        notify(t('profile.error'), 'error');
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      logger.error({ err }, 'ProfilePage fetchUser failed');
      notify(t('profile.error'), 'error');
    }
    setLoading(false);
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) return notify(t('profile.nameRequired'), 'warning');
    setSaving(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        body: { name: name.trim(), email: email.trim() },
      });
      const data = res.ok ? await res.json() : null;
      if (res.ok) {
        notify(t('profile.saved'), 'success');
        if (data?.user) { setName(data.user.name); setEmail(data.user.email); }
      } else notify(data?.message || t('profile.error'), 'error');
    } catch (err) { logger.error({ err }, 'ProfilePage save failed'); notify(t('profile.error'), 'error'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return notify(t('profile.fillAllFields'), 'warning');
    if (newPassword.length < 6) return notify(t('profile.passwordMinLength'), 'warning');
    setChangingPwd(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/users/change-password`, {
        method: 'PUT',
        body: { currentPassword, newPassword },
      });
      const data = res.ok ? await res.json() : null;
      if (res.ok) { notify(t('profile.pwdChanged'), 'success'); setCurrentPassword(''); setNewPassword(''); }
      else notify(data?.message || t('profile.error'), 'error');
    } catch (err) { logger.error({ err }, 'ProfilePage changePassword failed'); notify(t('profile.error'), 'error'); }
    finally { setChangingPwd(false); }
  };

  if (loading) return <div className="page-teal"><div className="card-teal profile-loading">{t('loading')}</div></div>;

  return (
    <div className="page-teal">
      <div className="card-teal profile-card">
        <h2 className="profile-heading">{t('profile.title')}</h2>

        <label className="profile-label">{t('profile.name')}</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="profile-input" />

        <label className="profile-label">{t('profile.email')}</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="profile-input" />

        <button className="btn-primary profile-btn" onClick={handleSaveProfile} disabled={saving}>
          {saving ? t('profile.saving') : t('profile.save')}
        </button>

        <h3 className="profile-heading">{t('profile.passwordTitle')}</h3>

        <label className="profile-label">{t('profile.currentPwd')}</label>
        <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="profile-input" />

        <label className="profile-label">{t('profile.newPwd')}</label>
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="profile-input" />

        <button className="btn-primary profile-btn" onClick={handleChangePassword} disabled={changingPwd}>
          {changingPwd ? t('profile.saving') : t('profile.changePwd')}
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
