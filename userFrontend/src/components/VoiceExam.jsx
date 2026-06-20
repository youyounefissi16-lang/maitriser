import React, { useState, useRef, useEffect } from 'react';
import { API_BASE_URL, authHeaders } from '../config/api';
import '../styles/teal-theme.css';

const Recorder = ({ onAudioReady }) => {
  const [state, setState]       = useState('idle'); // idle | recording | done
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError]       = useState('');
  const mediaRecorderRef        = useRef(null);
  const chunksRef               = useRef([]);

  const startRecording = async () => {
    setError('');
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: mime });

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState('done');
        if (onAudioReady) onAudioReady(blob, url);
      };

      mediaRecorderRef.current.onerror = () => {
        setError('Erreur d\'enregistrement.');
        setState('idle');
      };

      mediaRecorderRef.current.start();
      setState('recording');
    } catch {
      setError('Accès au micro refusé.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {state === 'idle' && (
        <button type="button" onClick={startRecording} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          🎤 Enregistrer
        </button>
      )}
      {state === 'recording' && (
        <button type="button" onClick={stopRecording} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#e74c3c', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          🔴 Arrêter
        </button>
      )}
      {state === 'done' && audioUrl && (
        <>
          <audio src={audioUrl} controls style={{ height: 36 }} />
          <button type="button" onClick={() => { setState('idle'); setAudioUrl(null); if (onAudioReady) onAudioReady(null, null); }} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontSize: 11 }}>
            ✕ Supprimer
          </button>
        </>
      )}
      {error && <span style={{ color: '#e74c3c', fontSize: 12 }}>{error}</span>}
    </div>
  );
};

const VoiceExam = ({ exam, onBack }) => {
  const STORAGE_KEY = `voice-exam-${exam._id}`;
  const [answers, setAnswers]     = useState(() => exam.questions.map(() => ({ text: '' })));
  const [result, setResult]       = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');
  const [showModel, setShowModel] = useState({});
  const restored = useRef(false);

  useEffect(() => {
    try {
      const savedRaw = sessionStorage.getItem(STORAGE_KEY);
      if (savedRaw) {
        const saved = JSON.parse(savedRaw);
        if (saved.examId === exam._id && !saved.result) {
          setAnswers(saved.answers || exam.questions.map(() => ({ text: '' })));
          return;
        }
      }
    } catch { /* ignore */ }
    setAnswers(exam.questions.map(() => ({ text: '' })));
    setResult(null);
    setError('');
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, [exam._id]);

  useEffect(() => {
    if (result || !answers.length) return;
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ examId: exam._id, answers })); } catch { /* ignore */ }
  }, [answers, result]);

  useEffect(() => {
    const onLeave = (e) => { if (!result) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [result]);

  const clearSaved = () => { try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ } };

  const setAnswer = (idx, text) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], text };
      return next;
    });
  };

  const handleSubmit = async () => {
    const filled = answers.every((a) => a.text.trim());
    if (!filled) { setError('Veuillez répondre à toutes les questions.'); return; }
    setError('');
    setSubmitting(true);
    try {
      const body = { answers: answers.map((a, i) => ({ questionIndex: i, text: a.text })) };
      const res = await fetch(`${API_BASE_URL}/api/voice-exams/${exam._id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submission failed');
      clearSaved();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const allPassed = result?.answers?.every((a) => a.allPassed);

  return (
    <div className="quiz-container-teal">
      <div style={{ marginBottom: 16 }}>
        <button type="button" onClick={onBack} style={{ background: 'none', border: '1px solid #ccc', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>
          &larr; Retour
        </button>
      </div>

      <p style={{ fontSize: 12, color: '#f97316', fontWeight: 'bold', margin: '0 0 8px' }}>EXAMEN ORAL</p>
      <h3 style={{ margin: '0 0 16px' }}>{exam.title}</h3>

      <div style={{ background: '#f8f9fa', padding: 14, borderRadius: 6, marginBottom: 20 }}>
        <p style={{ margin: '0 0 12px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{exam.clinicalCasePrompt}</p>
        {exam.images && exam.images.length > 0 && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {exam.images.map((img, i) => (
              <img key={i} src={`${API_BASE_URL}/api/voice-exam-images/${img}`} alt={`Image ${i + 1}`}
                style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, objectFit: 'contain', border: '1px solid #ddd' }}
              />
            ))}
          </div>
        )}
      </div>

      {!result && exam.questions.map((q, qi) => (
        <div key={qi} className="voice-exam-question" style={{ marginBottom: 16, padding: 14, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
          <p style={{ fontWeight: 600, margin: '0 0 8px' }}>Q{qi + 1}. {q.questionText}</p>
          <Recorder />
          <textarea
            placeholder="Écrivez votre réponse ici..."
            value={answers[qi]?.text || ''}
            onChange={(e) => setAnswer(qi, e.target.value)}
            rows={4}
            style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginTop: 8 }}
          />
        </div>
      ))}

      {!result && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          style={{ padding: '10px 24px', borderRadius: 6, border: 'none', background: '#0C4A4A', color: '#fff', fontWeight: 'bold', cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}
        >
          {submitting ? 'Soumission...' : 'Soumettre les réponses'}
        </button>
      )}

      {error && <p style={{ color: '#e74c3c', marginTop: 12 }}>{error}</p>}

      {result && (
        <div style={{ marginTop: 20 }}>
          <div className="voice-exam-result-box" style={{
            padding: 16, borderRadius: 8, marginBottom: 16, textAlign: 'center', fontSize: 18, fontWeight: 700,
            background: allPassed ? '#d4edda' : '#f8d7da', color: allPassed ? '#155724' : '#721c24',
          }}>
            {allPassed ? '✅ Réponse correcte !' : '❌ Réponse incorrecte'}
            <span style={{ display: 'block', fontSize: 13, fontWeight: 400, marginTop: 4 }}>
              {result.overallPassed}/{result.overallMax} questions correctes
            </span>
          </div>

          {exam.questions.map((q, qi) => {
            const a = result.answers?.[qi];
            if (!a) return null;
            return (
              <div key={qi} style={{ marginBottom: 16, padding: 14, borderRadius: 8, border: '1px solid #e0e0e0', background: '#fff' }}>
                <p style={{ fontWeight: 600, margin: '0 0 8px' }}>Q{qi + 1}. {q.questionText}</p>
                <p style={{ fontStyle: 'italic', color: '#555', margin: '0 0 10px', padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                  « {a.text} »
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                  {a.criteriaResults.map((cr, ci) => (
                    <div key={ci} className="voice-exam-criteria" style={{
                      padding: '4px 10px', borderRadius: 4, fontSize: 13,
                      background: cr.passed ? '#d4edda' : '#f8d7da',
                      color: cr.passed ? '#155724' : '#721c24',
                      fontWeight: 500,
                    }}>
                      {cr.passed ? '✓' : '✗'} {cr.label}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowModel((prev) => ({ ...prev, [qi]: !prev[qi] }))}
                  style={{ background: 'none', border: '1px solid #0C4A4A', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, color: '#0C4A4A' }}
                >
                  {showModel[qi] ? 'Masquer' : 'Voir le modèle de réponse'}
                </button>
                {showModel[qi] && (
                  <div style={{ marginTop: 8, padding: 10, background: '#eaf4fb', borderRadius: 6, fontSize: 13 }}>
                    {q.idealAnswer || 'Aucune réponse modèle fournie.'}
                  </div>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => { setResult(null); setAnswers(exam.questions.map(() => ({ text: '' }))); setError(''); }}
            style={{ padding: '10px 24px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontWeight: 600 }}
          >
            Réessayer
          </button>
        </div>
      )}
    </div>
  );
};

export default VoiceExam;