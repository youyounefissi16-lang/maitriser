import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import { useToast } from '../components/Toast';
import { SkeletonQuizItem } from '../components/LoadingSkeleton';
import '../styles/teal-theme.css';

const CaseExam = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const notify = useToast();

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
        if (!res.ok) throw new Error('Cas clinique introuvable');
        const data = await res.json();
        if (controller.signal.aborted) return;
        setCaseData(data.case);
        setQuizzes(data.quizzes.filter((q) => q.question?.questionText));
      } catch (err) {
        if (err.name === 'AbortError') return;
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
    setSelected((prev) => prev.includes(opt) ? prev.filter((a) => a !== opt) : [...prev, opt]);
  };

  const handleSubmit = async () => {
    if (!current || selected.length === 0) return notify('Sélectionnez au moins une réponse.', 'warning');
    setSubmitting(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/quizzes/${current._id}/submit`, {
        method: 'POST',
        body: { selectedAnswers: selected },
      });
      const data = await res.json();
      const newResults = { ...results, [current._id]: data };
      setResults(newResults);
      if (quizzes.every((q) => newResults[q._id] !== undefined)) clearSaved();
    } catch {
      notify('Erreur de soumission.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-teal"><div className="card-teal"><SkeletonQuizItem count={3} /></div></div>;
  if (error) return <div className="page-teal"><div className="card-teal" style={{ textAlign: 'center', color: '#e74c3c' }}><p>{error}</p><button className="btn-primary" onClick={() => navigate('/quizPage')} style={{ marginTop: '12px' }}>Retour</button></div></div>;
  if (!quizzes.length) return <div className="page-teal"><div className="card-teal" style={{ textAlign: 'center' }}><p>Aucun QCM pour ce cas.</p><button className="btn-dark" onClick={() => navigate('/quizPage')}>Retour</button></div></div>;

  return (
    <div className="page-teal">
      <div className="card-teal" style={{ maxWidth: '800px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>📋 {caseData.title}</h2>
          {allDone && <span style={{ background: '#d4edda', color: '#155724', padding: '4px 12px', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 700 }}>✅ Terminé</span>}
        </div>

        <div style={{
          background: '#e3f2fd', border: '1px solid #bbdefb', borderRadius: '10px',
          padding: '16px', marginBottom: '20px',
        }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#1a237e', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{caseData.description}</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontWeight: 700, fontSize: '14px', color: '#555' }}>
            Question {currentIndex + 1} / {quizzes.length}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {quizzes.map((q, i) => (
              <button key={q._id} onClick={() => setCurrentIndex(i)} style={{
                width: '28px', height: '28px', borderRadius: '50%', border: '2px solid',
                borderColor: i === currentIndex ? 'var(--teal-accent)' : results[q._id] ? '#27ae60' : 'var(--border-light)',
                background: i === currentIndex ? 'var(--teal-accent)' : results[q._id] ? '#d4edda' : '#fff',
                color: i === currentIndex ? '#fff' : results[q._id] ? '#155724' : '#888',
                fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
              }}>{i + 1}</button>
            ))}
          </div>
        </div>

        <div className="exam-progress-bar" style={{ marginBottom: '24px' }}>
          <div className="exam-progress-fill" style={{ width: `${((Object.keys(results).length) / quizzes.length) * 100}%` }} />
        </div>

        <div key={current._id}>
          <p style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '16px', color: 'var(--text-dark)' }}>
            {current.question.questionText}
          </p>

          {current.question.options.map((opt, i) => {
            let bg = '#f9f9f9';
            let borderColor = '#e8e8e8';
            if (isSubmitted) {
              if (results[current._id]?.correctAnswers?.includes(opt)) { bg = '#d4edda'; borderColor = '#c3e6cb'; }
              else if (selected.includes(opt)) { bg = '#f8d7da'; borderColor = '#f5c6cb'; }
            } else if (selected.includes(opt)) {
              bg = '#e3f2fd'; borderColor = '#14a3a8';
            }
            return (
              <label key={i} className="option-label"
                onClick={() => toggleOption(opt)}
                style={{ background: bg, borderColor, cursor: isSubmitted ? 'default' : 'pointer' }}>
                <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggleOption(opt)} disabled={isSubmitted} />
                {opt}
              </label>
            );
          })}

          {isSubmitted && (
            <div style={{
              marginTop: '16px', padding: '14px', borderRadius: '10px',
              background: results[current._id].correct ? '#d4edda' : '#f8d7da',
              border: `1px solid ${results[current._id].correct ? '#c3e6cb' : '#f5c6cb'}`,
            }}>
              <p style={{ fontWeight: 'bold', fontSize: '15px', margin: '0 0 4px', color: '#111' }}>
                {results[current._id].correct ? '✅ Correct' : '❌ Faux'}
              </p>
              {!results[current._id].correct && (
                <p style={{ fontSize: '13px', color: '#555', margin: '0' }}>
                  <strong>Réponse{results[current._id].correctAnswers?.length > 1 ? 's' : ''} correcte{results[current._id].correctAnswers?.length > 1 ? 's' : ''} :</strong>{' '}
                  {results[current._id].correctAnswers?.join(', ')}
                </p>
              )}
              {results[current._id].explanation && (
                <div style={{ marginTop: '8px', padding: '10px', background: 'rgba(255,255,255,0.7)', borderRadius: '8px', fontSize: '13px', color: '#333' }}>
                  <strong>💡</strong> {results[current._id].explanation}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
            <div>
              {currentIndex > 0 && (
                <button className="btn-dark" onClick={() => setCurrentIndex((i) => i - 1)}>← Précédent</button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {!isSubmitted ? (
                <button className="btn-primary" onClick={handleSubmit} disabled={submitting || selected.length === 0}>
                  {submitting ? 'Soumission…' : 'Soumettre'}
                </button>
              ) : currentIndex < quizzes.length - 1 ? (
                <button className="btn-primary" onClick={() => setCurrentIndex((i) => i + 1)}>Suivant →</button>
              ) : (
                <button className="btn-dark" onClick={() => navigate('/quizPage')}>Retour aux QCM</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseExam;
