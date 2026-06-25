import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useSound } from '../context/SoundContext';
import { useTranslation } from '../context/LanguageContext';

export default function Header({ toggleDarkMode, isDarkMode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t, lang, setLang } = useTranslation();
  const play = useSound();

  const linkClass = ({ isActive }) => `header-link ${isActive ? 'active' : ''}`;

  return (
    <nav className="header-nav" role="navigation" aria-label="Navigation principale">
      <NavLink to="/" onClick={() => play('navigate')} className="header-logo" aria-label="Accueil MAITRISEZ">
        <img src="/logo.png" alt="MAITRISEZ" className="header-logo-img" />
      </NavLink>

      <div className="hamburger" onClick={() => setIsMenuOpen(!isMenuOpen)} style={{ display: 'none', cursor: 'pointer', fontSize: '20px' }}>
        {isMenuOpen ? '✖' : '☰'}
      </div>

      <div className="header-links">
        <NavLink to="/" onClick={() => play('navigate')} className={linkClass}>{t('nav.home')}</NavLink>
        <NavLink to="/about" onClick={() => play('navigate')} className={linkClass}>{t('nav.about')}</NavLink>
        <NavLink to="/help" onClick={() => play('navigate')} className={linkClass}>{t('nav.help')}</NavLink>
        <NavLink to="/contact" onClick={() => play('navigate')} className={linkClass}>{t('nav.contact')}</NavLink>
        <NavLink to="/books" onClick={() => play('navigate')} className={linkClass}>{t('nav.library')}</NavLink>
      </div>

      <div className="header-actions">
        <button onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')} className="header-btn-lang" title={t('nav.language')}>
          {lang === 'fr' ? 'EN' : 'FR'}
        </button>
        <button onClick={toggleDarkMode} className="header-btn-theme" title={isDarkMode ? t('nav.lightMode') : t('nav.darkMode')}>
          {isDarkMode ? '☀️' : '🌙'}
        </button>
        <NavLink to="/login" onClick={() => play('navigate')}><button className="btn-secondary" style={{ padding: '8px 20px', minHeight: 'auto' }}>{t('nav.login')}</button></NavLink>
        <NavLink to="/signup" onClick={() => play('navigate')}><button className="btn-dark" style={{ padding: '8px 20px', minHeight: 'auto' }}>{t('nav.signup')}</button></NavLink>
      </div>
    </nav>
  );
}
