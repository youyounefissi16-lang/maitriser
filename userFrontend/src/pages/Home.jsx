import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import '../styles/teal-theme.css';
import '../styles/pagesStyle/Home.css';

const features = [
  { bg: '#B9D5E1', icons: ['📋', '🧠'], key: 'quiz', preview: 'quiz', to: '/quizPage' },
  { bg: '#E2934D', icons: ['📖', '📱'], key: 'library', preview: 'book', to: '/books' },
  { bg: '#BF9FE3', icons: ['🎤', '💬'], key: 'oral', preview: 'voice', to: '/voice-exams' },
];

export default function Home({ toggleDarkMode, isDarkMode }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div className="landing">
      {/* Decorative shapes */}
      <div className="shape shape-hexagon-green"></div>
      <div className="shape shape-capsule-pink"></div>
      <div className="shape shape-circle-orange"></div>
      <div className="shape shape-hexagon-blue"></div>
      <div className="shape shape-triangle-yellow"></div>
      <div className="shape shape-square-purple"></div>
      <div className="shape shape-rectangle-pink"></div>
      <div className="shape shape-cylinder-orange"></div>

      {/* Global Nav */}
      <nav className="landing-nav">
        <div className="nav-left">
          <span className="nav-logo-icon">M</span>
          <span className="nav-logo-text">Maîtrisez</span>
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

      {/* Hero */}
      <section className="hero">
        <div className="hero-card">
          <h1>{t('home.hero.title')}</h1>
          <p>{t('home.hero.subtitle')}</p>
          <Link to="/signup" className="hero-cta">{t('home.hero.cta')}</Link>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="features" id="features">
        {features.map((f, i) => (
          <div key={i} className="feature-card" style={{ background: f.bg, cursor: 'pointer' }} onClick={() => navigate(f.to)}>
            <div className="feature-header">
              {f.icons.map((icon, j) => (
                <span key={j} className="feature-icon">{icon}</span>
              ))}
              <h3>{t(`home.features.${f.key}`)}</h3>
            </div>
            <p className="feature-desc">{t(`home.features.${f.key}.desc`)}</p>
            <div className="feature-preview">
              {f.preview === 'quiz' && <MiniQuiz />}
              {f.preview === 'book' && <MiniBook />}
              {f.preview === 'voice' && <MiniVoice />}
            </div>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <span className="footer-brand">Maîtrisez</span>
        <span className="footer-attribution">Sélectionné par <strong>youyou</strong></span>
      </footer>

      {/* FAB */}
      <button className="fab" onClick={() => navigate('/help')} title="Aide">?</button>
    </div>
  );
}

function MiniQuiz() {
  return (
    <div className="mini-quiz">
      <p className="mini-label">Question: Quel nerf est endommagé dans...?</p>
      <div className="mini-options">
        {['A.', 'B.', 'C.', 'D.', 'E.', 'F.'].map((l, i) => (
          <span key={i} className="mini-pill">{l} Option</span>
        ))}
      </div>
    </div>
  );
}

function MiniBook() {
  return (
    <div className="mini-book">
      <p className="mini-book-title">Fondamentaux de la Cardiologie</p>
      <div className="mini-book-columns">
        <div className="mini-col">
          <div className="mini-line"></div>
          <div className="mini-line"></div>
          <div className="mini-line short"></div>
        </div>
        <div className="mini-col">
          <div className="mini-line"></div>
          <div className="mini-line"></div>
          <div className="mini-line short"></div>
        </div>
      </div>
    </div>
  );
}

function MiniVoice() {
  return (
    <div className="mini-voice">
      <div className="voice-waveform">
        {[4,8,12,16,20,24,20,16,12,8,4,8,12,18,22,18,12,6,4,10,16,20,16,10,4].map((h, i) => (
          <div key={i} className="wave-bar" style={{ height: `${h}px` }}></div>
        ))}
      </div>
      <div className="voice-meta">
        <span className="voice-avatar">👤</span>
        <span className="voice-text">Cas ECOS: Patient se présentant avec une dou... </span>
      </div>
      <div className="voice-controls">
        <div className="voice-progress"><div className="voice-progress-fill" style={{ width: '45%' }}></div></div>
        <span className="voice-volume">🔊</span>
        <span className="voice-more">⋯</span>
      </div>
    </div>
  );
}
