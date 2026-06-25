import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import '../styles/teal-theme.css';
import '../styles/pagesStyle/Home.css';

const features = [
  { icon: '🧠', key: 'quiz', to: '/quizPage' },
  { icon: '📖', key: 'library', to: '/books' },
  { icon: '🎤', key: 'oral', to: '/voice-exams' },
];

export default function Home({ toggleDarkMode, isDarkMode }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="nav-left">
          <img src="/logo.png" alt="MAITRISEZ" className="nav-logo-img" />
        </div>
        <div className="nav-center">
          <a href="#features">{t('home.nav.features')}</a>
          <a href="#pricing">{t('home.nav.pricing')}</a>
          <a href="#contact">{t('home.nav.contact')}</a>
          <Link to="/login">{t('home.nav.studentLogin')}</Link>
          <button onClick={toggleDarkMode} className="nav-dark-toggle" title={isDarkMode ? t('nav.lightMode') : t('nav.darkMode')}>
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
        <div className="nav-right">
          <Link to="/signup" className="nav-cta">{t('home.hero.cta')}</Link>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-card">
          <h1>{t('home.hero.title')}</h1>
          <p>{t('home.hero.subtitle')}</p>
          <Link to="/signup" className="hero-cta">{t('home.hero.cta')}</Link>
        </div>
      </section>

      <section className="features" id="features">
        {features.map((f, i) => (
          <div key={i} className="feature-card" onClick={() => navigate(f.to)}>
            <div className="feature-icon-circle">
              <span className="feature-emoji">{f.icon}</span>
            </div>
            <h3>{t(`home.features.${f.key}`)}</h3>
            <p className="feature-desc">{t(`home.features.${f.key}.desc`)}</p>
          </div>
        ))}
      </section>

      <footer className="landing-footer">
        <img src="/logo.png" alt="MAITRISEZ" className="footer-logo-img" />
      </footer>

      <button className="fab" onClick={() => navigate('/help')} title="Aide">?</button>
    </div>
  );
}
