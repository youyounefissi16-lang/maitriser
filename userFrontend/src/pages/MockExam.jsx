import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_BASE_URL, authHeaders } from '../config/api';
import { useToast } from '../components/Toast.jsx';
import { useTranslation } from '../context/LanguageContext';
import { shuffle } from '../utils/shuffle';
import '../styles/teal-theme.css';

const MockExam = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const notify = useToast();
  const { t } = useTranslation();
  const userId = localStorage.getItem('userId') || 'anonymous';

  useEffect(() => { document.title = 'Examen Blanc — QuizApp'; }, []);

  const questions = useMemo(() => {
    if (!state?.quizzes?.length) return [];
    let list = state.quizzes;
    if (!state.casesExpanded) list = shuffle(list);
    return list.slice(0, Math.min(state.count || 10, list.length)).map((q) => ({
      ...q,
      _shuffledOptions: q.question?.options ? shuffle(q.question.options) : [],
    }));
  }, [state]);

  const totalSeconds = (state?.examTimer || 30) * 60;
  const STORAGE_KEY = 'mock-exam-state';

  // Restore saved exam state from sessionStorage
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);
  const restored = useRef(false);

  useEffect(() => {
    try {
      const savedRaw = sessionStorage.getItem(STORAGE_KEY);
      if (savedRaw && state?.restore !== false) {
        const saved = JSON.parse(savedRaw);
        if (saved.questions?.length && saved.questions[0]._id === state?.quizzes?.[0]?._id) {
          setCurrentIndex(saved.currentIndex || 0);
          setAnswers(saved.answers || {});
          setTimeLeft(saved.timeLeft ?? totalSeconds);
          restored.current = true;
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Save exam state to sessionStorage on changes
  useEffect(() => {
    if (submitted || !questions.length) return;
    const toSave = { questions, answers, currentIndex, timeLeft };
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toSave)); } catch { /* ignore */ }
  }, [answers, currentIndex, timeLeft, submitted, questions]);

  const clearSaved = () => { try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ } };

  useEffect(() => {
    const onLeave = (e) => { if (!submitted) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', onLeave);
    return () => { window.removeEventListener('beforeunload', onLeave); mountedRef.current = false; };
  }, [submitted]);

  // Pause timer when tab is hidden
  const hiddenRef = useRef(false);
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) { hiddenRef.current = true; clearTimeout(timerRef.current); }
      else { hiddenRef.current = false; setTimeLeft((t) => t); } // re-trigger timer
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    if (hiddenRef.current) return;
    if (!submitted && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && !submitted && mountedRef.current) {
      handleSubmit();
    }
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, submitted]);

  const toggleOption = useCallback((qId, opt) => {
    if (submitted) return;
    setAnswers((prev) => {
      const current = prev[qId] || [];
      return {
        ...prev,
        [qId]: current.includes(opt)
          ? current.filter((a) => a !== opt)
          : [...current, opt],
      };
    });
  }, [submitted]);

  const handleSubmit = async () => {
    if (submitted) return;
    const unanswered = questions.filter((q) => !answers[q._id] || answers[q._id].length === 0);
    if (unanswered.length > 0) {
      notify(t('mock.unanswered', { n: unanswered.length }), 'warning');
      return;
    }
    setSubmitting(true);
    clearTimeout(timerRef.current);
    try {
      const submissionResults = [];
      for (const q of questions) {
        const selected = answers[q._id] || [];
        const res = await fetch(`${API_BASE_URL}/api/quizzes/${q._id}/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
          },
          body: JSON.stringify({ selectedAnswers: selected }),
        });
        const data = await res.json();
        submissionResults.push({ quiz: q, ...data });
      }
      if (mountedRef.current) {
        clearSaved();
        setResults(submissionResults);
        setSubmitted(true);
      }
    } catch {
      if (mountedRef.current) notify('Erreur lors de la soumission. Veuillez réessayer.', 'error');
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!questions.length) {
    return (
      <div className="page-teal">
        <div className="card-teal" style={{ textAlign: 'center' }}>
          <p>{t('mock.noQuestions')}</p>
          <button className="btn-dark" onClick={() => navigate('/quizPage')}>{t('mock.back')}</button>
        </div>
      </div>
    );
  }

  if (submitted && results) {
    const total = results.length;
    const correct = results.filter((r) => r.correct).length;
    const percentage = Math.round((correct / total) * 100);

    return (
      <div className="page-teal">
        <div className="card-teal" style={{ maxWidth: '800px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 className="mock-result-title" style={{ margin: '0 0 8px', fontSize: '28px' }}>📊 {t('mock.result')}</h2>
            <div className="mock-result-score" style={{
              fontSize: '48px', fontWeight: 800,
              color: percentage >= 60 ? '#27ae60' : '#e74c3c',
              margin: '16px 0',
            }}>{percentage}%</div>
            <p style={{ color: '#555', fontSize: '16px' }}>{correct} / {total} {t('mock.correct').toLowerCase()}es</p>
          </div>

          <div className="exam-results-list">
            {results.map((r, i) => (
              <div key={r.quiz._id} className={`exam-result-item ${r.correct ? 'correct' : 'incorrect'}`}>
                <div className="exam-result-qnum">{t('mock.question')} {i + 1}</div>
                <div className="exam-result-text">{r.quiz.question?.questionText}</div>
                <div className="exam-result-status">
                  {r.correct ? `✅ ${t('mock.correct')}` : `❌ ${t('mock.incorrect')}`}
                </div>
                {!r.correct && (
                  <div className="exam-result-answer">
                    <strong>{(r.correctAnswers?.length > 1 ? t('mock.correctAnswers') : t('mock.correctAnswer'))} :</strong>{' '}
                    {r.correctAnswers?.join(', ')}
                  </div>
                )}
                {r.explanation && (
                  <div className="exam-result-explanation">
                    <strong>💡 {t('mock.explanation')} :</strong> {r.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <button className="btn-dark" onClick={() => navigate('/quizPage')}>{t('mock.back')}</button>
          </div>
        </div>
      </div>
    );
  }

  const current = questions[currentIndex];
  const totalQuestions = questions.length;
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <div className="page-teal">
      <div className="quiz-container-teal" style={{ maxWidth: '800px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div className="mock-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#555' }}>
              {t('mock.question')} {currentIndex + 1} / {totalQuestions}
            </span>
            <div className="mock-header-right" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#888' }}>
                {Object.keys(answers).length} / {totalQuestions} {t('mock.answered')}
              </span>
              <span className="timer-badge" style={{ color: timeLeft <= 60 ? '#e74c3c' : 'var(--text-dark)', fontSize: '16px' }}>
                ⏱ {formatTime(timeLeft)}
              </span>
            </div>
          </div>
          <div className="exam-progress-bar">
            <div className="exam-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {current._blockType === 'case' && (
          <div className="case-box" style={{
            background: '#e3f2fd', border: '1px solid #bbdefb', borderRadius: '10px',
            padding: '16px', marginBottom: '16px',
          }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: '15px', color: '#0C4A4A', marginBottom: '4px' }}>📋 {t('mock.case', { title: current._caseTitle })}</p>
            <p style={{ margin: 0, fontSize: '13px', color: '#1a237e', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{current._caseDescription}</p>
          </div>
        )}
        <h3 style={{ fontSize: '18px', marginBottom: '8px', color: '#111' }}>
          {current.question?.questionText}
        </h3>
        {current.question?.options?.length > 2 && (
          <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
            {t('mock.selectAll')}
          </p>
        )}

        <div style={{ marginTop: '16px' }}>
          {(current._shuffledOptions || current.question?.options || []).map((opt, i) => {
            const selected = (answers[current._id] || []).includes(opt);
            return (
              <label key={i} className="option-label"
                onClick={() => toggleOption(current._id, opt)}
                style={{
                  background: selected ? '#e3f2fd' : '#f9f9f9',
                  borderColor: selected ? '#14a3a8' : '#e8e8e8',
                  cursor: 'pointer',
                }}>
                <input type="checkbox" checked={selected} readOnly />
                {opt}
              </label>
            );
          })}
        </div>

        <div className="mock-nav" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
          <div>
            {currentIndex > 0 && (
              <button className="btn-dark" onClick={() => setCurrentIndex((i) => i - 1)}>
                {t('mock.prev')}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {currentIndex < totalQuestions - 1 ? (
              <button className="btn-primary" onClick={() => setCurrentIndex((i) => i + 1)}>
                {t('mock.next')}
              </button>
            ) : (
              <button className="btn-primary exam-submit-btn" onClick={handleSubmit} disabled={submitting}>
                {submitting ? t('mock.submitting') : t('mock.submit')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockExam;
