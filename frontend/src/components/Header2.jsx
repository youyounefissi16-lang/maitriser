import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useClerk } from "@clerk/react";
import { useSound } from '../context/SoundContext';
import { useTranslation } from '../context/LanguageContext';

const Header2 = ({ toggleDarkMode, isDarkMode }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { t, lang, setLang } = useTranslation();
  const { signOut } = useClerk();
  const play = useSound();
  const isAdmin = (() => { try { return localStorage.getItem('adminRole') === 'admin'; } catch { return false; } })();

  const handleLogout = () => {
    play('navigate');
    signOut();
    try { localStorage.removeItem('userId'); } catch { /* ignore */ }
    setIsMenuOpen(false);
    navigate('/login');
  };

  const linkClass = ({ isActive }) => `header-link ${isActive ? 'active' : ''}`;

  return (
    <nav className="header-nav" role="navigation" aria-label="Navigation principale">
      <NavLink to="/" onClick={() => { play('navigate'); setIsMenuOpen(false); }} className="header-logo" aria-label="Accueil MAITRISEZ">
        <img src="/logo.png" alt="MAITRISEZ" className="header-logo-img" />
      </NavLink>

      <div className="header-links">
        <NavLink to="/quizPage" className={linkClass} onClick={() => { play('navigate'); setIsMenuOpen(false); }}>{t('nav.qcm')}</NavLink>
        <NavLink to="/voice-exams" className={linkClass} onClick={() => { play('navigate'); setIsMenuOpen(false); }}>{t('nav.oral')}</NavLink>
        <NavLink to="/books" className={linkClass} onClick={() => { play('navigate'); setIsMenuOpen(false); }}>{t('nav.library')}</NavLink>
        <NavLink to="/resultPage" className={linkClass} onClick={() => { play('navigate'); setIsMenuOpen(false); }}>{t('nav.results')}</NavLink>
        <NavLink to="/bookmarks" className={linkClass} onClick={() => { play('navigate'); setIsMenuOpen(false); }}>{t('nav.bookmarks')}</NavLink>
        <NavLink to="/review" className={linkClass} onClick={() => { play('navigate'); setIsMenuOpen(false); }}>{t('nav.review')}</NavLink>
        <NavLink to="/profile" className={linkClass} onClick={() => { play('navigate'); setIsMenuOpen(false); }}>{t('nav.profile')}</NavLink>
      </div>

      <div className="header-actions">
        {isAdmin && (
          <NavLink to="/admin/dashboard" className="header-btn-admin" onClick={() => play('navigate')}>
            Admin
          </NavLink>
        )}
        <button onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')} className="header-btn-lang" title={t('nav.language')}>
          {lang === 'fr' ? 'EN' : 'FR'}
        </button>
        <button onClick={toggleDarkMode} className="header-btn-theme" title={isDarkMode ? t('nav.lightMode') : t('nav.darkMode')}>
          {isDarkMode ? '☀️' : '🌙'}
        </button>
        <button onClick={handleLogout} className="header-btn-logout">{t('nav.logout')}</button>
      </div>
    </nav>
  );
};

export default Header2;
