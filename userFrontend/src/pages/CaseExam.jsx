import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import { useToast } from '../components/Toast';
import { SkeletonQuizItem } from '../components/LoadingSkeleton';
import { useTranslation } from '../context/LanguageContext';
import { logger } from '../utils/logger';
import { useSound } from '../context/SoundContext';
import '../styles/teal-theme.css';

const CaseExam = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const notify = useToast();
  const play = useSound();
  const { t } = useTranslation();

  const [caseData, setCaseData] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const STORAGE_KEY = `case-exam-${caseId}`;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState([]);
  const [results, setResults] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const restored = useRef(false);

  useEffect(() => {
    try {
      const savedRaw = sessionStorage.getItem(STORAGE_KEY);
      if (savedRaw) {
        const saved = JSON.parse(savedRaw);
        if (saved.caseId === caseId) {
          setCurrentIndex(saved.currentIndex || 0);
          setResults(saved.results || {});
          restored.current = true;
        }
      }
    } catch { /* ignore */ }
  }, []);

  const current = quizzes[currentIndex];
  const isSubmitted = results[current?._id] !== undefined;
  const allDone = quizzes.length > 0 && quizzes.every((q) => results[q._id] !== undefined);

  useEffect(() => {
    if (!quizzes.length || allDone) return;
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ caseId, currentIndex, results })); } catch { /* ignore */ }
  }, [currentIndex, results, quizzes, allDone]);

  const clearSaved = () => { try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ } };

  useEffect(() => {
    const onLeave = (e) => { if (!allDone) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [allDone]);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/cases/${caseId}`, { signal: controller.signal });
        if (!res.ok) throw new Error(t('quizcase.notFound') || 'Case not found');
        const data = await res.json();
        if (controller.signal.aborted) return;
        setCaseData(data.case);
        setQuizzes((data.quizzes || []).filter((q) => q.question?.questionText));
      } catch (err) {
        if (err.name === 'AbortError') return;
        logger.error({ err, caseId }, 'CaseExam fetch failed');
        setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [caseId]);

  useEffect(() => {
    if (current) setSelected([]);
  }, [currentIndex, current]);

  const toggleOption = (opt) => {
    if (isSubmitted) return;
    play('select');
    setSelected((prev) => prev.includes(opt) ? prev.filter((a) => a !== opt) : [...prev, opt]);
  };

  const handleSubmit = async () => {
    play('submit');
    if (!current || selected.length === 0) return notify(t('quizcard.warning.select'), 'warning');
    setSubmitting(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/quizzes/${current._id}/submit`, {
        method: 'POST',
        body: { selectedAnswers: selected },
      });
      if (!res.ok) throw new Error(t('quizcard.error.submit') || 'Submit failed');
      const data = await res.json();
      const newResults = { ...results, [current._id]: data };
      setResults(newResults);
      if (quizzes.every((q) => newResults[q._id] !== undefined)) clearSaved();
    } catch (err) {
      logger.error({ err, quizId: current?._id }, 'CaseExam submit failed');
      notify(t('quizcard.error.submitRetry'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-teal"><div className="card-teal"><SkeletonQuizItem count={3} /></div></div>;
  if (error) return (
    <div className="page-teal">
      <div className="card-teal case-exam-error">
        <p>{error}</p>
        <button className="btn-primary" onClick={() => { play('prev'); navigate('/quizPage'); }}>
          {t('quizcard.back')}
        </button>
      </div>
    </div>
  );
  if (!quizzes.length) return (
    <div className="page-teal">
      <div className="card-teal case-exam-empty">
        <p>{t('quiz.noQuizzes')}</p>
        <button className="btn-dark" onClick={() => { play('prev'); navigate('/quizPage'); }}>
          {t('quizcard.back')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="page-teal">
      <div className="card-teal case-exam-container">
        <div className="case-exam-header">
          <h2 className="case-exam-title">{caseData?.title}</h2>
          {allDone && <span className="case-exam-badge-done">{t('quizcase.done')}</span>}
        </div>

        <div className="case-exam-description">
          <p>{caseData?.description}</p>
        </div>

        <div className="case-exam-nav-row">
          <span className="case-exam-counter">
            {t('mock.question')} {currentIndex + 1} / {quizzes.length}
          </span>
          <div className="case-exam-dots">
            {quizzes.map((q, i) => (
              <button key={q._id} onClick={() => setCurrentIndex(i)}
                className={`case-dot ${i === currentIndex ? 'active' : ''} ${results[q._id] ? 'done' : ''}`}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="exam-progress-bar">
          <div className="exam-progress-fill" style={{ width: `${((Object.keys(results).length) / quizzes.length) * 100}%` }} />
        </div>

        <div key={current._id}>
          <p className="case-exam-question">
            {current.question.questionText}
          </p>

          {current.question.options.map((opt, i) => {
            let variant = 'default';
            if (isSubmitted) {
              if (results[current._id]?.correctAnswers?.includes(opt)) variant = 'correct';
              else if (selected.includes(opt)) variant = 'incorrect';
            } else if (selected.includes(opt)) {
              variant = 'selected';
            }
            return (
              <label key={i} className={`option-label ${variant}`}
                onClick={() => toggleOption(opt)}
                style={{ cursor: isSubmitted ? 'default' : 'pointer' }}>
                <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggleOption(opt)} disabled={isSubmitted} />
                {opt}
              </label>
            );
          })}

          {isSubmitted && (
            <div className={`case-result-box ${results[current._id].correct ? 'correct' : 'incorrect'}`}>
              <p className="case-result-label">
                {results[current._id].correct ? t('mock.correct') : t('mock.incorrect')}
              </p>
              {!results[current._id].correct && (
                <p className="case-result-answers">
                  <strong>{results[current._id].correctAnswers?.length > 1 ? t('mock.correctAnswers') : t('mock.correctAnswer')} :</strong>{' '}
                  {results[current._id].correctAnswers?.join(', ')}
                </p>
              )}
              {results[current._id].explanation && (
                <div className="explanation-box">
                  {results[current._id].explanation}
                </div>
              )}
            </div>
          )}

          <div className="case-exam-footer">
            <div>
              {currentIndex > 0 && (
                <button className="btn-dark" onClick={() => { play('prev'); setCurrentIndex((i) => i - 1); }}>
                  {t('mock.prev')}
                </button>
              )}
            </div>
            <div className="case-exam-actions">
              {!isSubmitted ? (
                <button className="btn-primary" onClick={handleSubmit} disabled={submitting || selected.length === 0}>
                  {submitting ? t('mock.submitting') : t('mock.submit')}
                </button>
              ) : currentIndex < quizzes.length - 1 ? (
                <button className="btn-primary" onClick={() => { play('next'); setCurrentIndex((i) => i + 1); }}>
                  {t('mock.next')}
                </button>
              ) : (
                <button className="btn-dark" onClick={() => { play('prev'); navigate('/quizPage'); }}>
                  {t('quizcard.back')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseExam;
