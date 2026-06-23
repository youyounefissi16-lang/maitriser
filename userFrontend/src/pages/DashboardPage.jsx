import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import { useTranslation } from '../context/LanguageContext';
import { useSound } from '../context/SoundContext';
import { logger } from '../utils/logger';
import '../styles/teal-theme.css';

const CACHE_KEY = 'dashboardStats';
const CACHE_TTL = 60 * 60 * 1000;

function getGreetingKey() {
  const h = new Date().getHours();
  if (h < 12) return 'dashboard.greeting.morning';
  if (h < 18) return 'dashboard.greeting.afternoon';
  return 'dashboard.greeting.evening';
}

function getUserName() {
  try {
    const raw = localStorage.getItem('user');
    if (raw) {
      const u = JSON.parse(raw);
      return u.name || u.email?.split('@')[0] || null;
    }
  } catch { /* ignore */ }
  return null;
}

function calcStreak(results) {
  if (!results.length) return 0;
  const sorted = [...results].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  let streak = 0;
  let prev = null;
  for (const r of sorted) {
    const day = new Date(r.timestamp).toDateString();
    if (day === prev) continue;
    if (r.score === 1) {
      streak++;
      prev = day;
    } else {
      break;
    }
  }
  return streak;
}

const DashboardPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const play = useSound();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentResults, setRecentResults] = useState([]);
  const fetchedRef = useRef(false);

  const greetingKey = useMemo(() => getGreetingKey(), []);
  const userName = useMemo(() => getUserName(), []);

  useEffect(() => {
    document.title = `${t('nav.dashboard') || 'Dashboard'} — MAITRISEZ`;
  }, [t]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const cached = (() => {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.timestamp > CACHE_TTL) return null;
        return parsed.data;
      } catch { return null; }
    })();

    if (cached) {
      setStats(cached.stats);
      setRecentResults(cached.recentResults || []);
      setLoading(false);
      return;
    }

    const userId = (() => { try { return localStorage.getItem('userId'); } catch { return null; } })();
    if (!userId) { setLoading(false); return; }

    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/results/${userId}?limit=200`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const d = await res.json();
        const results = d.data || (Array.isArray(d) ? d : []);
        const total = results.length;
        const correct = results.filter((r) => r.score === 1).length;
        const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
        const streak = calcStreak(results);
        const computed = { total, correct, percentage: pct, streak };
        const recent = results.slice(0, 5);
        setStats(computed);
        setRecentResults(recent);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: { stats: computed, recentResults: recent } }));
        } catch { /* ignore */ }
      } catch (err) {
        logger.error({ err }, 'Dashboard fetch failed');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="page-teal">
        <div className="dashboard-container">
          <div className="dashboard-skeleton" />
        </div>
      </div>
    );
  }

  const isEmpty = !stats || stats.total === 0;
  const accuracyColor = stats?.percentage >= 70 ? 'var(--color-success)' : stats?.percentage >= 50 ? 'var(--color-warning)' : 'var(--color-danger)';

  return (
    <div className="page-teal">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-greeting">
              {t(greetingKey)}{userName ? `, ${userName}` : ''}
            </h1>
            <p className="dashboard-subtitle">{t('dashboard.subtitle')}</p>
          </div>
        </div>

        {isEmpty ? (
          <div className="dashboard-empty">
            <div className="dashboard-empty-icon">
              <span className="icon-circle">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 17 10 11 4 5" />
                  <line x1="12" y1="19" x2="20" y2="19" />
                </svg>
              </span>
            </div>
            <h2>{t('dashboard.empty.title')}</h2>
            <p>{t('dashboard.empty.desc')}</p>
            <button className="btn-primary" onClick={() => { play('navigate'); navigate('/quizPage'); }}>
              {t('dashboard.empty.cta')}
            </button>
          </div>
        ) : (
          <>
            <div className="dashboard-stats">
              <div className="stat-card">
                <div className="stat-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--teal-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">{t('dashboard.stats.total')}</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="stat-value" style={{ color: 'var(--color-success)' }}>{stats.correct}</div>
                <div className="stat-label">{t('dashboard.stats.correct')}</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div className="stat-value" style={{ color: accuracyColor }}>{stats.percentage}%</div>
                <div className="stat-label">{t('dashboard.stats.accuracy')}</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--orange-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>
                <div className="stat-value" style={{ color: 'var(--orange-accent)' }}>{stats.streak}</div>
                <div className="stat-label">{t('dashboard.stats.streak')}</div>
              </div>
            </div>

            <h2 className="dashboard-section-title">{t('dashboard.quickActions')}</h2>
            <div className="dashboard-actions">
              <button className="action-card" onClick={() => { play('navigate'); navigate('/quizPage'); }}>
                <span className="action-icon-wrap">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--teal-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </span>
                <span className="action-name">{t('dashboard.quickActions.quiz')}</span>
                <span className="action-desc">{t('dashboard.quickActions.quiz.desc')}</span>
              </button>
              <button className="action-card" onClick={() => { play('navigate'); navigate('/quizPage', { state: { mockExam: true } }); }}>
                <span className="action-icon-wrap">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--teal-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </span>
                <span className="action-name">{t('dashboard.quickActions.mock')}</span>
                <span className="action-desc">{t('dashboard.quickActions.mock.desc')}</span>
              </button>
              <button className="action-card" onClick={() => { play('navigate'); navigate('/voice-exams'); }}>
                <span className="action-icon-wrap">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--teal-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                </span>
                <span className="action-name">{t('dashboard.quickActions.voice')}</span>
                <span className="action-desc">{t('dashboard.quickActions.voice.desc')}</span>
              </button>
              <button className="action-card" onClick={() => { play('navigate'); navigate('/books'); }}>
                <span className="action-icon-wrap">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--teal-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                </span>
                <span className="action-name">{t('dashboard.quickActions.library')}</span>
                <span className="action-desc">{t('dashboard.quickActions.library.desc')}</span>
              </button>
              <button className="action-card" onClick={() => { play('navigate'); navigate('/bookmarks'); }}>
                <span className="action-icon-wrap">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--teal-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </span>
                <span className="action-name">{t('dashboard.quickActions.bookmarks')}</span>
                <span className="action-desc">{t('dashboard.quickActions.bookmarks.desc')}</span>
              </button>
            </div>

            <h2 className="dashboard-section-title">{t('dashboard.recent')}</h2>
            {recentResults.length > 0 ? (
              <div className="dashboard-recent">
                {recentResults.map((r, i) => (
                  <div key={r._id || i} className={`recent-item ${r.score === 1 ? 'correct' : 'incorrect'}`}>
                    <div className="recent-dot" />
                    <div className="recent-info">
                      <div className="recent-question">
                        {r.quizId?.question?.questionText?.substring(0, 80) || r.quizId?.quizId || 'Quiz'}
                      </div>
                      <div className="recent-meta">
                        {new Date(r.timestamp).toLocaleDateString()} — {r.score === 1 ? t('mock.correct') : t('mock.incorrect')}
                      </div>
                    </div>
                  </div>
                ))}
                <button className="btn-ghost" onClick={() => { play('navigate'); navigate('/resultPage'); }}>
                  {t('dashboard.seeAll')} &rarr;
                </button>
              </div>
            ) : (
              <p className="dashboard-recent-empty">{t('dashboard.recent.none')}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
