import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';

const linkStyle = {
  textDecoration: 'none',
  color: 'var(--text-color, #333)',
  fontSize: '14px',
  fontWeight: 500,
  padding: '6px 12px',
  borderRadius: '6px',
};

const btnStyle = {
  padding: '8px 20px',
  borderRadius: '9999px',
  border: 'none',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
};

export default function Header({ toggleDarkMode, isDarkMode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t, lang, setLang } = useTranslation();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <nav style={{
      background: 'var(--header-bg, #fff)',
      borderRadius: '9999px',
      padding: '10px 28px',
      margin: '20px 24px',
      boxShadow: 'var(--shadow-card, 0 4px 20px rgba(0,0,0,0.12))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: isMenuOpen ? 'wrap' : 'nowrap',
    }}>
      <NavLink to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '32px', height: '32px', background: 'linear-gradient(135deg, #0C4A4A, #14a3a8)',
          color: '#fff', fontWeight: 800, fontSize: '16px', borderRadius: '6px',
        }}>Q</span>
        <span style={{ fontWeight: 700, fontSize: '18px', color: 'var(--text-color, #111)' }}>Quiz</span>
      </NavLink>

      <div className="hamburger" onClick={toggleMenu} style={{ display: 'none', cursor: 'pointer', fontSize: '20px' }}>
        {isMenuOpen ? '✖' : '☰'}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
        <NavLink to="/" style={linkStyle}>{t('nav.home')}</NavLink>
        <NavLink to="/about" style={linkStyle}>{t('nav.about')}</NavLink>
        <NavLink to="/help" style={linkStyle}>{t('nav.help')}</NavLink>
        <NavLink to="/contact" style={linkStyle}>{t('nav.contact')}</NavLink>
        <NavLink to="/books" style={linkStyle}>{t('nav.library')}</NavLink>
        <button onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')} style={{
          background: 'none', border: '1px solid var(--border-light, #ddd)', cursor: 'pointer',
          fontSize: '12px', fontWeight: 700, padding: '4px 8px', borderRadius: '6px', lineHeight: 1,
        }} title={t('nav.language')}>
          {lang === 'fr' ? 'EN' : 'FR'}
        </button>
        <button onClick={toggleDarkMode} style={{
          background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '6px 8px', lineHeight: 1,
        }} title={isDarkMode ? t('nav.lightMode') : t('nav.darkMode')}>
          {isDarkMode ? '☀️' : '🌙'}
        </button>
        <NavLink to="/login"><button style={{ ...btnStyle, background: 'var(--border-light, #f0f0f0)', color: 'var(--text-color, #111)' }}>{t('nav.login')}</button></NavLink>
        <NavLink to="/signup"><button style={{ ...btnStyle, background: '#111', color: '#fff' }}>{t('nav.signup')}</button></NavLink>
      </div>
    </nav>
  );
}
