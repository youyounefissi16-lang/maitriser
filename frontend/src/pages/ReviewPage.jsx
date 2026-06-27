import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import { SkeletonQuizItem } from '../components/LoadingSkeleton';
import { logger } from '../utils/logger';
import '../styles/teal-theme.css';

const ReviewPage = () => {
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  let userId;
  try { userId = localStorage.getItem('userId'); } catch { userId = null; }

  const fetchResults = useCallback(async (signal) => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/results/${userId}`, signal ? { signal } : undefined);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const results = Array.isArray(data) ? data : [];
      const seen = new Set();
      const wrong = results
        .filter((r) => r.score === 0 && r.quizId && r.quizId._id)
        .filter((r) => {
          const dup = seen.has(r.quizId._id);
          seen.add(r.quizId._id);
          return !dup;
        });
      setWrongAnswers(wrong);
    } catch (err) {
      if (err.name === 'AbortError') return;
      logger.error({ err }, 'ReviewPage fetchResults failed');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchResults(controller.signal);
    return () => controller.abort();
  }, [fetchResults]);

  if (loading) return <div className="page-teal"><div className="card-teal"><SkeletonQuizItem count={4} /></div></div>;

  return (
    <div className="page-teal">
      <div className="card-teal">
        <h2>🔄 Spaced Repetition — Review Failed Questions</h2>
        {error ? (
          <div className="empty-state" style={{ color: 'var(--color-danger)' }}>
                <p>Error loading: {error}</p>
                <button type="button" className="btn-primary" onClick={fetchResults} style={{ marginTop: '12px' }}>Retry</button>
          </div>
        ) : wrongAnswers.length === 0 ? (
          <div className="empty-state">
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>No questions to review!</p>
            <p style={{ color: 'var(--text-muted)' }}>All previously failed questions have been retried successfully, or you haven't attempted any quizzes yet.</p>
          </div>
        ) : (
          <>
            <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
              {wrongAnswers.length} question{wrongAnswers.length > 1 ? 's' : ''} to review. Questions you answered incorrectly are shown here for spaced repetition — retry them to strengthen your memory before the exam.
            </p>
            {wrongAnswers.map((r) => {
              const quiz = r.quizId;
              return (
                <div key={r._id} className="quiz-card-item" style={{ borderLeft: '4px solid var(--color-danger)' }}>
                  <div className="qid">{quiz.quizId || ''}</div>
                  <h3>{quiz.question?.questionText?.substring(0, 80) || quiz._id}</h3>
                  {quiz.question?.questionImage && (
                    <img src={`${API_BASE_URL}/api/quiz-images/${quiz.question.questionImage}`} alt="Question" style={{ maxWidth: '100%', maxHeight: 150, borderRadius: 6, marginTop: 6, marginBottom: 6 }} />
                  )}
                  <div className="qmeta">
                    Last attempt: {new Date(r.timestamp).toLocaleDateString('en-US')}
                  </div>
                  <button className="btn-primary" onClick={() => navigate(`/quiz/${quiz._id}`, { state: { quizId: quiz._id, quizName: quiz.question?.questionText || quiz.quizId, question: quiz.question, caseId: quiz.caseId || null } })}>
                    Retry
                  </button>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

export default ReviewPage;
