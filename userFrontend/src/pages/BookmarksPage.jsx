import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, authHeaders } from '../config/api';
import { SkeletonQuizItem } from '../components/LoadingSkeleton';
import '../styles/teal-theme.css';

const BookmarksPage = () => {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');

  const fetchBookmarks = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/bookmarks`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBookmarks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchBookmarks(); }, [fetchBookmarks]);

  const removeBookmark = async (quizId) => {
    await fetch(`${API_BASE_URL}/api/bookmarks/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ quizId }),
    });
    setBookmarks((prev) => prev.filter((b) => b.quizId?._id !== quizId));
  };

  if (loading) return <div className="page-teal"><div className="card-teal"><SkeletonQuizItem count={4} /></div></div>;

  return (
    <div className="page-teal">
      <div className="card-teal">
        <h2>🔖 Mes Favoris</h2>
        {error ? (
          <div className="empty-state" style={{ color: '#e74c3c' }}>
            <p>Erreur lors du chargement : {error}</p>
            <button type="button" className="btn-primary" onClick={fetchBookmarks} style={{ marginTop: '12px' }}>Réessayer</button>
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="empty-state">
            <p>Aucun QCM en favori.</p>
            <p style={{ color: '#888', fontSize: '13px', marginTop: '4px' }}>Marquez des QCM depuis la liste pour les retrouver ici.</p>
          </div>
        ) : (
          bookmarks.map((b) => {
            const quiz = b.quizId;
            if (!quiz) return null;
            return (
              <div key={b._id} className="quiz-card-item">
                <div className="qid">{quiz.quizId}</div>
                <h3>{quiz.question?.questionText?.substring(0, 80) || quiz.quizId}</h3>
                <div className="qmeta">
                  Année {quiz.year || ''} — {quiz.moduleId?.name || ''}{quiz.course ? ` — ${quiz.course}` : ''}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-primary" onClick={() => navigate(`/quiz/${quiz._id}`, { state: { quizId: quiz._id, quizName: quiz.question?.questionText || quiz.quizId, question: quiz.question, caseId: quiz.caseId || null } })}>Commencer</button>
                  <button className="btn-icon danger" onClick={() => removeBookmark(quiz._id)} title="Retirer des favoris">×</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default BookmarksPage;
