import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import { SkeletonQuizItem } from '../components/LoadingSkeleton';
import { logger } from '../utils/logger';
import { useToast } from '../components/Toast';
import { useSound } from '../context/SoundContext';
import '../styles/teal-theme.css';

const BookmarksPage = () => {
  const notify = useToast();
  const play = useSound();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  let userId;
  try { userId = localStorage.getItem('userId'); } catch { userId = null; }

  const fetchBookmarks = useCallback(async (signal) => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/bookmarks`, signal ? { signal } : undefined);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBookmarks(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.name === 'AbortError') return;
      logger.error({ err }, 'BookmarksPage fetchBookmarks failed');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchBookmarks(controller.signal);
    return () => controller.abort();
  }, [fetchBookmarks]);

  const removeBookmark = async (quizId) => {
    if (!window.confirm('Retirer ce QCM des favoris ?')) return;
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/bookmarks/toggle`, {
        method: 'POST',
        body: { quizId },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setBookmarks((prev) => prev.filter((b) => b.quizId?._id !== quizId));
      play('bookmark');
      notify('QCM retiré des favoris', 'success');
    } catch (err) {
      logger.error({ err, quizId }, 'BookmarksPage removeBookmark failed');
      notify('Erreur lors de la suppression', 'error');
    }
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
                  <button className="btn-primary" onClick={() => { play('navigate'); navigate(`/quiz/${quiz._id}`, { state: { quizId: quiz._id, quizName: quiz.question?.questionText || quiz.quizId, question: quiz.question, caseId: quiz.caseId || null } }); }}>Commencer</button>
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
