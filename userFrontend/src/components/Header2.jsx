import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useClerk } from "@clerk/react";
import { useTranslation } from '../context/LanguageContext';

const Header2 = ({ toggleDarkMode, isDarkMode }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { t, lang, setLang } = useTranslation();
  const { signOut } = useClerk();

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);

  const handleLogout = () => {
    signOut();
    localStorage.removeItem('userId');
    setIsMenuOpen(false);
    navigate('/login');
  };

  const linkStyler = ({ isActive }) => ({
    textDecoration: 'none',
    color: isActive ? 'var(--teal-accent, #14a3a8)' : 'var(--text-color, #333)',
    fontSize: '14px', fontWeight: 500, padding: '6px 12px', borderRadius: '6px',
  });

  return (
    <nav style={{
      background: 'var(--header-bg, #fff)',
      borderRadius: '9999px',
      padding: '10px 28px',
      margin: '20px 24px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: isMenuOpen ? 'wrap' : 'nowrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '32px', height: '32px', background: 'linear-gradient(135deg, #0C4A4A, #14a3a8)',
          color: '#fff', fontWeight: 800, fontSize: '16px', borderRadius: '6px',
        }}>Q</span>
        <span style={{ fontWeight: 700, fontSize: '18px', color: 'var(--text-color, #111)' }}>Quiz</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
        <NavLink to="/quizPage" style={linkStyler} onClick={() => setIsMenuOpen(false)}>{t('nav.qcm')}</NavLink>
        <NavLink to="/mock-exam" style={linkStyler} onClick={() => setIsMenuOpen(false)}>{t('nav.mockExam')}</NavLink>
        <NavLink to="/voice-exams" style={linkStyler} onClick={() => setIsMenuOpen(false)}>{t('nav.oral')}</NavLink>
        <NavLink to="/books" style={linkStyler} onClick={() => setIsMenuOpen(false)}>{t('nav.library')}</NavLink>
        <NavLink to="/resultPage" style={linkStyler} onClick={() => setIsMenuOpen(false)}>{t('nav.results')}</NavLink>
        <NavLink to="/bookmarks" style={linkStyler} onClick={() => setIsMenuOpen(false)}>{t('nav.bookmarks')}</NavLink>
        <NavLink to="/review" style={linkStyler} onClick={() => setIsMenuOpen(false)}>{t('nav.review')}</NavLink>
        <NavLink to="/profile" style={linkStyler} onClick={() => setIsMenuOpen(false)}>{t('nav.profile')}</NavLink>
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
        <button onClick={handleLogout} style={{
          padding: '8px 20px', borderRadius: '9999px', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          background: '#111', color: '#fff',
        }}>{t('nav.logout')}</button>
      </div>
    </nav>
  );
};

export default Header2;
