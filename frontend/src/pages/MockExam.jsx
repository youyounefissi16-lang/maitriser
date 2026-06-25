import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import { useToast } from '../components/Toast.jsx';
import { useTranslation } from '../context/LanguageContext';
import { shuffle } from '../utils/shuffle';
import { logger } from '../utils/logger';
import { useSound } from '../context/SoundContext';
import '../styles/teal-theme.css';

const MockExam = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const notify = useToast();
  const { t } = useTranslation();
  const play = useSound();
  let userId;
  try { userId = localStorage.getItem('userId') || 'anonymous'; } catch { userId = 'anonymous'; }

  useEffect(() => { document.title = 'Examen Blanc — MAITRISEZ'; }, []);

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
  const [flagged, setFlagged] = useState(() => {
    try {
      const saved = sessionStorage.getItem('mock-exam-flagged');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [reviewing, setReviewing] = useState(false);
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

  useEffect(() => {
    try { sessionStorage.setItem('mock-exam-flagged', JSON.stringify(flagged)); } catch { /* ignore */ }
  }, [flagged]);

  const toggleFlag = useCallback((qId) => {
    play('click');
    setFlagged((prev) => prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]);
  }, []);

  const clearSaved = () => {
    try { sessionStorage.removeItem(STORAGE_KEY); sessionStorage.removeItem('mock-exam-flagged'); } catch { /* ignore */ }
  };

  useEffect(() => {
    const onLeave = (e) => { if (!submitted) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', onLeave);
    return () => { window.removeEventListener('beforeunload', onLeave); mountedRef.current = false; };
  }, [submitted]);

  const toggleOption = useCallback((qId, opt) => {
    if (submitted) return;
    play('select');
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

  const handleSubmit = useCallback(async () => {
    if (submitted) return;
    play('submit');
    setSubmitting(true);
    clearTimeout(timerRef.current);
    try {
      const submissionResults = [];
      const settledResults = await Promise.allSettled(
        questions.map(async (q) => {
          const selected = answers[q._id] || [];
          const res = await fetchWithAuth(`${API_BASE_URL}/api/quizzes/${q._id}/submit`, {
            method: 'POST',
            body: { selectedAnswers: selected },
          });
          if (!res.ok) throw new Error('Submission failed');
          const data = await res.json();
          return { quiz: q, ...data };
        })
      );
      for (const r of settledResults) {
        if (r.status === 'fulfilled') submissionResults.push(r.value);
      }
      if (mountedRef.current) {
        clearSaved();
        setResults(submissionResults);
        setSubmitted(true);
      }
    } catch (err) {
      logger.error({ err }, 'MockExam handleSubmit failed');
      if (mountedRef.current) notify('Erreur lors de la soumission. Veuillez réessayer.', 'error');
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  }, [submitted, questions, answers, notify, t]);

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
      handleSubmit().catch(() => {});
    }
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, submitted, handleSubmit]);

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
            <button className="btn-dark" onClick={() => { play('prev'); navigate('/quizPage'); }}>{t('mock.back')}</button>
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
            <h2 className="mock-result-title" style={{ margin: '0 0 8px' }}>📊 {t('mock.result')}</h2>
            <div className={`mock-result-score ${percentage >= 60 ? 'passing' : 'failing'}`}>{percentage}%</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-base)' }}>{correct} / {total} {t('mock.correct').toLowerCase()}</p>
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
          <button className="btn-dark" onClick={() => { play('prev'); navigate('/quizPage'); }}>{t('mock.back')}</button>
          </div>
        </div>
      </div>
    );
  }

  const current = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;

  if (reviewing) {
    const unanswered = questions.filter((q) => !answers[q._id] || answers[q._id].length === 0);
    return (
      <div className="page-teal">
        <div className="card-teal" style={{ maxWidth: '800px' }}>
          <h2 style={{ marginBottom: '8px' }}>Review Your Answers</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>
            {answeredCount} of {totalQuestions} answered{unanswered.length > 0 ? ` (${unanswered.length} skipped)` : ''}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
            {questions.map((q, i) => {
              const isAnswered = answers[q._id] && answers[q._id].length > 0;
              const isFlagged = flagged.includes(q._id);
              let bg = 'var(--color-bg)';
              let label = `${i + 1}`;
              if (isAnswered) { bg = 'var(--color-success-bg)'; label = `✓ ${i + 1}`; }
              if (isFlagged) { bg = 'var(--color-warning-bg)'; label = `⚑ ${i + 1}`; }
              if (isAnswered && isFlagged) { bg = 'var(--color-info-bg)'; label = `✓⚑ ${i + 1}`; }
              return (
                <button key={q._id} onClick={() => { setCurrentIndex(i); setReviewing(false); }}
                  style={{
                    width: '48px', height: '48px', borderRadius: '8px', border: '1px solid var(--border-light)',
                    background: bg, cursor: 'pointer', fontWeight: 700, fontSize: '13px',
                    color: isFlagged ? 'var(--color-warning)' : isAnswered ? 'var(--color-success)' : 'var(--text-dark)',
                  }}>
                  {label}
                </button>
              );
            })}
          </div>
          <div className="mock-nav" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
            <button className="btn-dark" onClick={() => setReviewing(false)}>
              ← Back to Question
            </button>
            <button className="btn-primary exam-submit-btn" onClick={handleSubmit} disabled={submitting}
              style={{ background: unanswered.length > 0 ? '#e67e22' : undefined }}>
              {submitting ? t('mock.submitting') : `Submit${unanswered.length > 0 ? ` (${unanswered.length} skipped)` : ''}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <div className="page-teal">
      <div className="quiz-container-teal" style={{ maxWidth: '800px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div className="mock-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-muted)' }}>
              {t('mock.question')} {currentIndex + 1} / {totalQuestions}
            </span>
            <div className="mock-header-right" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {answeredCount} / {totalQuestions} {t('mock.answered')}
              </span>
              <span className="timer-badge timer-running" style={{ color: timeLeft <= 60 ? 'var(--color-danger)' : 'var(--text-dark)', fontSize: '16px' }}>
                ⏱ {formatTime(timeLeft)}
              </span>
            </div>
          </div>
          <div className="exam-progress-bar">
            <div className="exam-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
            {questions.map((q, i) => {
              const isAnswered = answers[q._id] && answers[q._id].length > 0;
              const isFlagged = flagged.includes(q._id);
              let dotColor = 'var(--border-light)';
              if (isFlagged) dotColor = 'var(--color-warning)';
              else if (isAnswered) dotColor = 'var(--color-success)';
              return (
                <button key={q._id} onClick={() => setCurrentIndex(i)}
                  style={{
                    width: i === currentIndex ? '20px' : '16px', height: '6px', borderRadius: '3px',
                    border: 'none', background: i === currentIndex ? '#04484F' : dotColor,
                    cursor: 'pointer', transition: 'all 0.2s', padding: 0,
                    opacity: i === currentIndex ? 1 : 0.6,
                  }}
                  title={`Q${i + 1}${isFlagged ? ' (flagged)' : ''}${isAnswered ? ' (answered)' : ''}`} />
              );
            })}
          </div>
        </div>

        {current._blockType === 'case' && (
          <div className="case-box" style={{
            background: 'var(--color-info-bg)', border: '1px solid var(--border-light)', borderRadius: '10px',
            padding: '16px', marginBottom: '16px',
          }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: '15px', color: '#04484F', marginBottom: '4px' }}>📋 {t('mock.case', { title: current._caseTitle })}</p>
            <p style={{ margin: 0, fontSize: '13px', color: '#1a237e', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{current._caseDescription}</p>
          </div>
        )}
        <h3 style={{ fontSize: '18px', marginBottom: '8px', color: 'var(--text-dark)' }}>
          {current.question?.questionText}
        </h3>
        {current.question?.options?.length > 2 && (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
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
                  background: selected ? 'var(--color-info-bg)' : 'var(--color-bg)',
                  borderColor: selected ? '#04484F' : 'var(--border-light)',
                  cursor: 'pointer',
                }}>
                <input type="checkbox" checked={selected} readOnly />
                {opt}
              </label>
            );
          })}
        </div>

        <div className="mock-nav" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {currentIndex > 0 && (
              <button className="btn-dark" onClick={() => { play('prev'); setCurrentIndex((i) => i - 1); }}>
                {t('mock.prev')}
              </button>
            )}
            <button className="btn-flag" onClick={() => toggleFlag(current._id)}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: flagged.includes(current._id) ? '2px solid #ffc107' : '1px solid var(--border-light)',
                background: flagged.includes(current._id) ? 'var(--color-warning-bg)' : 'var(--color-bg)',
                cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: flagged.includes(current._id) ? '#856404' : 'var(--text-muted)',
              }}>
              ⚑ {flagged.includes(current._id) ? 'Flagged' : 'Flag'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-review" onClick={() => setReviewing(true)}
              style={{
                padding: '8px 16px', borderRadius: '8px',                 border: '1px solid #04484F',
                background: 'var(--card-bg)', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#04484F',
              }}>
              Review all
            </button>
            {currentIndex < totalQuestions - 1 ? (
              <button className="btn-primary" onClick={() => { play('next'); setCurrentIndex((i) => i + 1); }}>
                {t('mock.next')}
              </button>
            ) : (
              <button className="btn-primary exam-submit-btn" onClick={() => setReviewing(true)}>
                Review & Submit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockExam;
