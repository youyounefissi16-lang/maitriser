import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import { SkeletonQuizItem } from '../components/LoadingSkeleton';
import '../styles/teal-theme.css';

const ReviewPage = () => {
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');

  const fetchResults = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/results/${userId}`);
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  if (loading) return <div className="page-teal"><div className="card-teal"><SkeletonQuizItem count={4} /></div></div>;

  return (
    <div className="page-teal">
      <div className="card-teal">
        <h2>🔄 Révision — Questions échouées</h2>
        {error ? (
          <div className="empty-state" style={{ color: '#e74c3c' }}>
            <p>Erreur lors du chargement : {error}</p>
            <button type="button" className="btn-primary" onClick={fetchResults} style={{ marginTop: '12px' }}>Réessayer</button>
          </div>
        ) : wrongAnswers.length === 0 ? (
          <div className="empty-state">
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>Aucune question à réviser !</p>
            <p style={{ color: '#888' }}>Toutes les questions que vous avez déjà réussies ou aucune tentative pour le moment.</p>
          </div>
        ) : (
          <>
            <p style={{ color: '#555', marginBottom: '16px' }}>
              {wrongAnswers.length} question{wrongAnswers.length > 1 ? 's' : ''} à revoir. La répétition espacée vous aide à mémoriser les réponses correctes.
            </p>
            {wrongAnswers.map((r) => {
              const quiz = r.quizId;
              return (
                <div key={r._id} className="quiz-card-item" style={{ borderLeft: '4px solid #e74c3c' }}>
                  <div className="qid">{quiz.quizId || ''}</div>
                  <h3>{quiz.question?.questionText?.substring(0, 80) || quiz._id}</h3>
                  <div className="qmeta">
                    Dernière tentative : {new Date(r.timestamp).toLocaleDateString('fr-FR')}
                  </div>
                  <button className="btn-primary" onClick={() => navigate(`/quiz/${quiz._id}`, { state: { quizId: quiz._id, quizName: quiz.question?.questionText || quiz.quizId, question: quiz.question, caseId: quiz.caseId || null } })}>
                    Réessayer
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
