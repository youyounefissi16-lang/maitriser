import React, { useEffect, useState, useCallback } from 'react';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import { SkeletonQuizItem } from '../components/LoadingSkeleton';
import Pagination from '../components/Pagination';
import '../styles/teal-theme.css';

const ResultPage = () => {
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => { document.title = 'Mes Résultats — QuizApp'; }, []);

  const userId = localStorage.getItem('userId');

  const fetchResults = useCallback(async (signal) => {
    const pg = signal instanceof AbortSignal ? 1 : signal ?? 1;
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/results/${userId}?page=${pg}&limit=50`, {
        signal: signal instanceof AbortSignal ? signal : undefined,
      });
      const d = await res.json();
      if (signal instanceof AbortSignal && signal.aborted) return;
      setResults(d.data || (Array.isArray(d) ? d : []));
      setPage(d.page || 1);
      setTotalPages(d.pages || 1);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message);
    } finally {
      if (!(signal instanceof AbortSignal) || !signal.aborted) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchResults(controller.signal);
    return () => controller.abort();
  }, [userId]);

  if (loading) return <div className="page-teal"><div className="card-teal"><SkeletonQuizItem count={4} /></div></div>;
  if (error)   return <div className="page-teal"><div className="card-teal" style={{ textAlign: 'center', color: '#e74c3c' }}><p>Erreur : {error}</p><button type="button" className="btn-primary" onClick={() => fetchResults(1)} style={{ marginTop: '12px' }}>Réessayer</button></div></div>;

  const total = results.length;
  const correct = results.filter((r) => r.score === 1).length;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  const moduleStats = {};
  results.forEach((r) => {
    const modId = r.quizId?.moduleId?._id || 'unknown';
    const modName = r.quizId?.moduleId?.name || 'Inconnu';
    const course = r.quizId?.course || '';
    const year = r.quizId?.year || '';
    const key = `${modId}|${course}`;
    if (!moduleStats[key]) moduleStats[key] = { name: modName, course, year, total: 0, correct: 0 };
    moduleStats[key].total++;
    if (r.score === 1) moduleStats[key].correct++;
  });

  return (
    <div className="page-teal">
      <div className="card-teal" style={{ maxWidth: '800px' }}>
        <h2>📊 Mes Résultats</h2>

        {total > 0 && (
          <div style={{ marginBottom: '24px', padding: '20px', background: '#f0fbfc', borderRadius: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', fontWeight: 800, color: percentage >= 60 ? '#27ae60' : '#e74c3c' }}>
              {percentage}%
            </div>
            <div style={{ fontSize: '14px', color: '#555' }}>
              {correct} / {total} correctes — {results.length} tentative{results.length > 1 ? 's' : ''}
            </div>
          </div>
        )}

        {Object.keys(moduleStats).length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>📈 Performance par module</h3>
            <div className="exam-results-list">
              {Object.entries(moduleStats).map(([key, stat]) => {
                const pct = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
                return (
                  <div key={key} className="exam-result-item" style={{ borderLeft: `4px solid ${pct >= 60 ? '#27ae60' : '#e74c3c'}` }}>
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '2px' }}>
                      Année {stat.year}{stat.course ? ` — ${stat.course}` : ''}
                    </div>
                    <div className="exam-result-text">{stat.name}</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: pct >= 60 ? '#27ae60' : '#e74c3c' }}>
                      {pct}% ({stat.correct}/{stat.total})
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Historique détaillé</h3>
        {results.length === 0 ? (
          <div className="empty-state">
            <p>Aucune tentative de QCM pour le moment.</p>
            <p style={{ color: '#888', fontSize: '13px', marginTop: '4px' }}>Commencez un QCM depuis la page d'accueil pour voir vos résultats ici.</p>
          </div>
        ) : (
          <table className="table-teal">
            <thead>
              <tr>
                <th>QCM</th>
                <th>Résultat</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={r._id || i}>
                  <td>{r.quizId?.question?.questionText?.substring(0, 60) || r.quizId?.quizId || r.quizId?._id}</td>
                  <td>
                    <span style={{ color: r.score === 1 ? '#27ae60' : '#e74c3c', fontWeight: 'bold' }}>
                      {r.score === 1 ? '✅ Correct' : '❌ Faux'}
                    </span>
                  </td>
                  <td>{new Date(r.timestamp).toLocaleString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && !error && <Pagination page={page} pages={totalPages} onPageChange={(p) => fetchResults(p)} />}
      </div>
    </div>
  );
};

export default ResultPage;
