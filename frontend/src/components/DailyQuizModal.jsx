import React, { useState, useCallback } from 'react';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import '../styles/modal.css';

const DailyQuizModal = ({ quizzes, onComplete, onClose }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [results, setResults] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  const current = quizzes[currentIdx];
  const isLast = currentIdx === quizzes.length - 1;
  const isMulti = (current?.question?.correctAnswers?.length || 1) > 1;

  const toggleOption = (idx) => {
    if (showFeedback) return;
    if (isMulti) {
      setSelectedAnswers((prev) =>
        prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
      );
    } else {
      setSelectedAnswers([idx]);
    }
  };

  const handleCheck = () => {
    if (selectedAnswers.length === 0) return;
    const correct = current?.question?.correctAnswers || [];
    const selected = selectedAnswers.map((i) => current?.question?.options?.[i] || '');
    const sorted = (arr) => [...arr].sort();
    const correctFlag = JSON.stringify(sorted(selected)) === JSON.stringify(sorted(correct));
    setIsCorrect(correctFlag);
    setShowFeedback(true);
    setResults((prev) => [...prev, {
      quizId: current._id,
      questionText: current?.question?.questionText || '',
      selectedAnswers: selected,
      correctAnswers: correct,
      correct: correctFlag,
    }]);
  };

  const handleNext = useCallback(() => {
    if (isLast) {
      handleSubmit();
    } else {
      setCurrentIdx((i) => i + 1);
      setSelectedAnswers([]);
      setShowFeedback(false);
      setIsCorrect(false);
    }
  }, [isLast]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const allResults = [...results];
      const res = await fetchWithAuth(`${API_BASE_URL}/api/quizzes/daily/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: allResults }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || 'Submission failed');
        setSubmitting(false);
        return;
      }
      const data = await res.json();
      setSummary(data.results || data);
    } catch (err) {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Summary screen ──
  if (summary) {
    const s = summary.score || 0;
    const t = summary.total || 1;
    const pct = Math.round((s / t) * 100);
    return (
      <div className="daily-quiz-overlay" onClick={onClose}>
        <div className="daily-quiz-card" onClick={(e) => e.stopPropagation()}>
          <div className="daily-quiz-header">
            <span className="daily-quiz-title">&#128197; Today's Quiz — Complete!</span>
            <button className="daily-quiz-close-btn" onClick={onClose}>&times;</button>
          </div>
          <div className={`daily-summary-score ${pct >= 70 ? 'good' : pct >= 50 ? 'ok' : 'bad'}`}>
            {s}/{t} ({pct}%)
          </div>
          <div style={{ marginTop: 16 }}>
            {(summary.answers || []).map((ans, i) => (
              <div key={i} className={`daily-summary-item ${ans.correct ? 'correct' : 'wrong'}`}>
                <span style={{ flex: 1, fontSize: '0.82rem' }}>
                  Q{i + 1}: {ans.questionText?.substring(0, 60)}
                </span>
                <span style={{ fontWeight: 700, marginLeft: 8 }}>
                  {ans.correct ? '&#10003;' : '&#10007;'}
                </span>
              </div>
            ))}
          </div>
          <button className="daily-quiz-check-btn" style={{ marginTop: 20 }} onClick={() => { onComplete?.(summary); onClose(); }}>
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const options = current?.question?.options || [];

  return (
    <div className="daily-quiz-overlay" onClick={onClose}>
      <div className="daily-quiz-card" onClick={(e) => e.stopPropagation()}>
        <div className="daily-quiz-header">
          <span className="daily-quiz-title">&#128197; Today's Quiz</span>
          <span className="daily-quiz-progress">Question {currentIdx + 1}/{quizzes.length}</span>
        </div>

        <div className="daily-quiz-question">
          {current?.question?.questionText}
        </div>

        {current?.question?.questionImage && (
          <img
            src={`${API_BASE_URL}/api/quiz-images/${current.question.questionImage}`}
            alt="Question"
            className="daily-quiz-image"
          />
        )}

        <div className="daily-quiz-options">
          {options.map((opt, i) => {
            let cls = 'daily-quiz-option';
            if (selectedAnswers.includes(i)) cls += ' selected';
            if (showFeedback) {
              cls += ' disabled';
              if (current?.question?.correctAnswers?.includes(opt)) cls += ' correct';
              else if (selectedAnswers.includes(i) && !current?.question?.correctAnswers?.includes(opt)) cls += ' wrong';
            }
            return (
              <div key={i} className={cls} onClick={() => toggleOption(i)}>
                <span style={{ fontWeight: 700, minWidth: 24 }}>{String.fromCharCode(65 + i)}</span>
                <span>{opt}</span>
              </div>
            );
          })}
        </div>

        {error && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: 12, textAlign: 'center' }}>{error}</div>}

        {showFeedback ? (
          <>
            <div className={`daily-quiz-feedback ${isCorrect ? 'correct' : 'wrong'}`}>
              {isCorrect
                ? '\u2713 Correct!'
                : `\u2717 Incorrect. Correct answer: ${current?.question?.correctAnswers?.join(', ') || 'N/A'}`
              }
              {current?.explanation && (
                <div style={{ marginTop: 6, fontSize: '0.8rem' }}>{current.explanation}</div>
              )}
            </div>
            <button
              className="daily-quiz-next-btn"
              onClick={handleNext}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : isLast ? 'See Summary' : 'Next Question'}
            </button>
          </>
        ) : (
          <button
            className="daily-quiz-check-btn"
            onClick={handleCheck}
            disabled={selectedAnswers.length === 0}
          >
            Check Answer
          </button>
        )}
      </div>
    </div>
  );
};

export default DailyQuizModal;
