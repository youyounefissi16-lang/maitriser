import React, { useState, useEffect, useRef, useMemo } from 'react';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useToast } from './Toast.jsx';
import { SkeletonQuizItem } from './LoadingSkeleton';
import '../styles/teal-theme.css';

const TIMER_SECONDS = 60;

const QuizCard = () => {
  const { state }    = useLocation();
  const { id }       = useParams();
  const navigate     = useNavigate();
  const notify = useToast();

  const [quizData, setQuizData]   = useState(
    state ? { quizId: state.quizId, quizName: state.quizName, question: state.question, caseId: state.caseId || null } : null
  );
  const [loading, setLoading]     = useState(!state);
  const [selected, setSelected]   = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult]       = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [quizTimer, setQuizTimer] = useState(TIMER_SECONDS);
  const [timeLeft, setTimeLeft]   = useState(quizTimer);
  const [timerActive, setTimerActive] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const timerRef = useRef(null);
  const submittingRef = useRef(false);
  const handleSubmitRef = useRef(null);

  const userId = localStorage.getItem('userId') || 'anonymous';
  const studyMode = state?.studyMode || false;

  const options = useMemo(() => {
    if (!quizData?.question?.options) return [];
    const opts = [...quizData.question.options];
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    return opts;
  }, [quizData?.question?.options]);

  useEffect(() => {
    if (quizData) return;
    if (!id) { navigate('/quizPage'); return; }

    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/quizzes/${id}`, { signal: controller.signal });
        if (!res.ok) throw new Error('Quiz not found');
        const data = await res.json();
        if (controller.signal.aborted) return;
        const t = data.timer || TIMER_SECONDS;
        setQuizTimer(t);
        setTimeLeft(t);
        setQuizData({
          quizId:   data._id,
          quizName: data.question?.questionText || data.quizId,
          question: {
            questionText: data.question.questionText,
            options:      data.question.options,
          },
          caseId: data.caseId || null,
        });
      } catch (err) {
        if (err.name !== 'AbortError') navigate('/quizPage');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [id]);

  const hiddenRef = useRef(false);
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) { hiddenRef.current = true; clearTimeout(timerRef.current); }
      else { hiddenRef.current = false; setTimeLeft((t) => t); }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    if (hiddenRef.current || studyMode) return;
    if (timerActive && timeLeft > 0 && !submitted) {
      timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timerActive && timeLeft === 0 && !submitted && handleSubmitRef.current) {
      handleSubmitRef.current();
    }
    return () => clearTimeout(timerRef.current);
  }, [timerActive, timeLeft, submitted, studyMode]);

  useEffect(() => {
    const onLeave = (e) => { if (!submitted) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [submitted]);

  useEffect(() => {
    if (!quizData?.quizId) return;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/bookmarks/${quizData.quizId}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        const data = await res.json();
        setBookmarked(data.bookmarked);
      } catch { /* ignore */ }
    })();
    return () => controller.abort();
  }, [quizData?.quizId]);

  const startTimer = () => { if (!timerActive) setTimerActive(true); };

  const toggleOption = (opt) => {
    if (submitted) return;
    if (studyMode) {
      setSelected([opt]);
      handleStudyCheck(opt);
      return;
    }
    startTimer();
    setSelected((prev) =>
      prev.includes(opt) ? prev.filter((a) => a !== opt) : [...prev, opt]
    );
  };

  const handleStudyCheck = async (opt) => {
    setSubmitting(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/quizzes/${quizData.quizId}/submit`, {
        method: 'POST',
        body: { selectedAnswers: [opt] },
      });
      const data = await res.json();
      setResult(data);
      setSubmitted(true);
    } catch {
      notify('Erreur de vérification.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (submitted || submittingRef.current) return;
    if (selected.length === 0) return notify('Sélectionnez au moins une réponse.', 'warning');
    submittingRef.current = true;
    setSubmitting(true);
    setTimerActive(false);
    clearTimeout(timerRef.current);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/quizzes/${quizData.quizId}/submit`, {
        method: 'POST',
        body: { selectedAnswers: selected },
      });
      const data = await res.json();
      setResult(data);
      setSubmitted(true);
    } catch {
      notify('Échec de la soumission. Veuillez réessayer.', 'error');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };
  handleSubmitRef.current = handleSubmit;

  const toggleBookmark = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/bookmarks/toggle`, {
        method: 'POST',
        body: { quizId: quizData.quizId },
      });
      const data = await res.json();
      setBookmarked(data.bookmarked);
    } catch { /* ignore */ }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="page-teal"><div className="card-teal"><SkeletonQuizItem count={1} /></div></div>;
  if (!quizData?.question) return <div className="page-teal"><div className="card-teal" style={{ textAlign: 'center' }}>QCM introuvable.</div></div>;

  const { quizName, question } = quizData;
  const isMulti = !result
    ? question.options?.length > 2
    : (result.correctAnswers?.length || 1) > 1;

  return (
    <div className="page-teal">
      <div className="quiz-container-teal">
        <div className="flex-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)' }}>{quizName}</h2>
            <button onClick={toggleBookmark} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '4px' }} title={bookmarked ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
              {bookmarked ? '★' : '☆'}
            </button>
          </div>
          {!studyMode && (
            <span className="timer-badge" style={{ color: timeLeft <= 10 ? '#e74c3c' : 'var(--text-dark)' }}>
              ⏱ {formatTime(timeLeft)}
            </span>
          )}
        </div>

        {studyMode && <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>🔍 Mode étude — Cliquez sur une réponse pour voir immédiatement si elle est correcte</div>}

        {quizData.caseId && (
          <div className="case-box" style={{
            background: '#e3f2fd', border: '1px solid #bbdefb', borderRadius: '10px',
            padding: '14px 16px', marginBottom: '16px',
          }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#0C4A4A', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              📋 Cas clinique — {quizData.caseId.title || ''}
            </div>
            <p style={{ margin: 0, fontSize: '14px', color: '#1a237e', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {quizData.caseId.description || quizData.caseId}
            </p>
          </div>
        )}

        <p style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '16px', color: 'var(--text-dark)' }}>
          {question.questionText}
        </p>

        {isMulti && !submitted && !studyMode && (
          <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
            Sélectionnez toutes les réponses correctes
          </p>
        )}

        {options.map((opt, i) => {
          let bg = '#f9f9f9';
          let borderColor = '#e8e8e8';
          if (submitted) {
            if (result?.correctAnswers?.includes(opt)) { bg = '#d4edda'; borderColor = '#c3e6cb'; }
            else if (selected.includes(opt))           { bg = '#f8d7da'; borderColor = '#f5c6cb'; }
          } else if (selected.includes(opt)) {
            bg = '#e3f2fd'; borderColor = '#14a3a8';
          }

          return (
            <label key={i} className="option-label" onClick={() => toggleOption(opt)}
              style={{ background: bg, borderColor, cursor: submitted ? 'default' : 'pointer' }}>
              <input type="checkbox" checked={selected.includes(opt)}
                onChange={() => toggleOption(opt)} disabled={submitted} />
              {opt}
            </label>
          );
        })}

        {submitted && result && (
          <div className="result-box" style={{
            marginTop: '20px', padding: '16px', borderRadius: '10px',
            background: result.correct ? '#d4edda' : '#f8d7da',
            border: `1px solid ${result.correct ? '#c3e6cb' : '#f5c6cb'}`,
          }}>
            <p style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '6px', color: '#111' }}>
              {result.correct ? '✅ Correct !' : '❌ Incorrect'}
            </p>
            {!result.correct && (
              <p style={{ fontSize: '14px', color: '#555' }}>
                <strong>Réponse{result.correctAnswers?.length > 1 ? 's' : ''} correcte{result.correctAnswers?.length > 1 ? 's' : ''} :</strong>{' '}
                {result.correctAnswers?.join(', ')}
              </p>
            )}
            {result.explanation && (
              <div className="explanation-box" style={{ marginTop: '12px', padding: '12px', background: 'rgba(255,255,255,0.7)', borderRadius: '8px', fontSize: '14px', color: '#333' }}>
                <strong>💡 Explication :</strong> {result.explanation}
              </div>
            )}
          </div>
        )}

        <div className="button-row" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          {!submitted ? (
            !studyMode && (
              <button className="btn-primary" onClick={handleSubmit}
                disabled={submitting || selected.length === 0}>
                {submitting ? 'Soumission…' : 'Soumettre la réponse'}
              </button>
            )
          ) : (
            <button className="btn-dark" onClick={() => navigate('/quizPage')}>
              Retour aux QCM
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizCard;
