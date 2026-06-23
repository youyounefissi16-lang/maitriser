import React, { useState, useEffect, useRef } from 'react';
import { authFetch } from '../config/authFetch';
import { FaTrash, FaEdit, FaImage, FaPlus, FaTimes } from 'react-icons/fa';
import { API_BASE_URL } from '../config/api';
import { useToast } from '../components/Toast';
import { useSound } from '../context/SoundContext';
import ConfirmModal from '../components/ConfirmModal';
import Spinner from '../components/Spinner';
import { logger } from '../utils/logger';
import '../styles/sharedAdmin.css';

const YEARS = [1, 2, 3, 4, 5, 6, 7];

const emptyCriterion = () => ({ label: '', keywords: [] });
const emptyQuestion = () => ({ questionText: '', idealAnswer: '', criteria: [emptyCriterion()] });

const emptyForm = () => ({
  title: '', selectedYear: '', moduleId: '',
  clinicalCasePrompt: '', questions: [emptyQuestion()],
});

const VoiceExamManagement = () => {
  const notify = useToast();
  const play = useSound();
  const [modules, setModules]               = useState([]);
  const [filteredModules, setFilteredModules] = useState([]);
  const [exams, setExams]                   = useState([]);
  const [form, setForm]                     = useState(emptyForm());
  const [editId, setEditId]                 = useState(null);
  const [filterYear, setFilterYear]         = useState('');
  const [filterModule, setFilterModule]     = useState('');
  const [newImages, setNewImages]           = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [previews, setPreviews]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [deleteTarget, setDeleteTarget]     = useState(null);
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchModules(); fetchExams(); }, []);

  useEffect(() => {
    setFilteredModules(form.selectedYear
      ? modules.filter((m) => m.year === Number(form.selectedYear))
      : modules);
  }, [form.selectedYear, modules]);

  useEffect(() => { fetchExams(); }, [filterYear, filterModule]);

  const previewsRef = useRef(previews);
  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);
  useEffect(() => {
    return () => previewsRef.current.forEach((p) => URL.revokeObjectURL(p));
  }, []);

  const fetchModules = async () => {
    try {
      const res = await authFetch('/api/modules');
      if (!res.ok) { setError('Failed to load modules'); return; }
      const modData = await res.json();
      setModules(Array.isArray(modData) ? modData : []);
    } catch (err) { logger.error({ err }, 'VoiceExamManagement fetchModules failed'); setError('Failed to load modules'); }
  };

  const fetchExams = async () => {
    let url = '/api/voice-exams?';
    if (filterModule) url += `moduleId=${filterModule}`;
    else if (filterYear) url += `year=${filterYear}`;
    try {
      setLoading(true);
      const res = await authFetch(url);
      if (!res.ok) throw new Error('Failed');
      const examData = await res.json();
      setExams(Array.isArray(examData) ? examData : []);
      setError('');
    } catch (err) { logger.error({ err }, 'VoiceExamManagement fetchExams failed'); setError('Failed to load exams'); }
    finally { setLoading(false); }
  };

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    setNewImages((prev) => [...prev, ...files]);
    setPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
  };

  const removeNewImage = (idx) => {
    URL.revokeObjectURL(previews[idx]);
    setNewImages((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeExistingImage = (filename) => {
    setExistingImages((prev) => prev.filter((f) => f !== filename));
  };

  // ── Questions management ──────────────────────────────────────────

  const addQuestion = () => {
    setForm((f) => ({ ...f, questions: [...f.questions, emptyQuestion()] }));
  };

  const removeQuestion = (qIdx) => {
    setForm((f) => ({ ...f, questions: f.questions.filter((_, i) => i !== qIdx) }));
  };

  const setQuestion = (qIdx, field, value) => {
    setForm((f) => {
      const qs = [...f.questions];
      qs[qIdx] = { ...qs[qIdx], [field]: value };
      return { ...f, questions: qs };
    });
  };

  const addCriterion = (qIdx) => {
    setForm((f) => {
      const qs = [...f.questions];
      qs[qIdx] = { ...qs[qIdx], criteria: [...qs[qIdx].criteria, emptyCriterion()] };
      return { ...f, questions: qs };
    });
  };

  const removeCriterion = (qIdx, cIdx) => {
    setForm((f) => {
      const qs = [...f.questions];
      qs[qIdx] = { ...qs[qIdx], criteria: qs[qIdx].criteria.filter((_, i) => i !== cIdx) };
      return { ...f, questions: qs };
    });
  };

  const setCriterion = (qIdx, cIdx, field, value) => {
    setForm((f) => {
      const qs = [...f.questions];
      const criteria = [...qs[qIdx].criteria];
      if (field === 'keywords') {
        criteria[cIdx] = { ...criteria[cIdx], keywords: value.split(',').map((s) => s.trim()).filter(Boolean) };
      } else {
        criteria[cIdx] = { ...criteria[cIdx], [field]: value };
      }
      qs[qIdx] = { ...qs[qIdx], criteria };
      return { ...f, questions: qs };
    });
  };

  // ── Submit ─────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    play('submit');
    if (submittingRef.current) return;
    const { title, moduleId, clinicalCasePrompt, questions } = form;
    if (!title || !moduleId || !clinicalCasePrompt)
      return notify('Title, module, and case prompt are required', 'warning');

    const validQuestions = questions.filter((q) => q.questionText.trim());
    if (validQuestions.length === 0)
      return notify('At least one question with text is required', 'warning');

    const url    = editId ? `/api/voice-exams/${editId}` : '/api/voice-exams';
    const method = editId ? 'PUT' : 'POST';

    const hasFiles = newImages.length > 0;

    const body = JSON.stringify({
      title, moduleId, clinicalCasePrompt,
      questions: validQuestions,
      existingImages,
    });

    submittingRef.current = true;
    setSubmitting(true);

    try {
      if (hasFiles) {
        const fd = new FormData();
        fd.append('title', title);
        fd.append('moduleId', moduleId);
        fd.append('clinicalCasePrompt', clinicalCasePrompt);
        fd.append('questions', JSON.stringify(validQuestions));
        fd.append('existingImages', JSON.stringify(existingImages));
        newImages.forEach((f) => fd.append('images', f));

        const res = await authFetch(url, { method, body: fd });
        const data = res.ok ? await res.json() : null;
        if (res.ok) { fetchExams(); resetForm(); notify(editId ? 'Exam updated' : 'Exam created', 'success'); }
        else notify(`Failed: ${data?.message || 'Unknown error'}`, 'error');
      } else {
        const res  = await authFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body });
        const data = await res.json();
        if (res.ok) { fetchExams(); resetForm(); notify(editId ? 'Exam updated' : 'Exam created', 'success'); }
        else notify(`Failed: ${data.message}`, 'error');
      }
    } catch (err) {
      logger.error({ err }, 'VoiceExamManagement handleSubmit failed');
      notify('Network error', 'error');
    } finally { submittingRef.current = false; setSubmitting(false); }
  };

  const confirmDelete = async () => {
    play('delete');
    if (!deleteTarget || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await authFetch(`/api/voice-exams/${deleteTarget._id}`, { method: 'DELETE' });
      if (res.ok) { fetchExams(); notify('Exam deleted', 'success'); }
      else notify('Failed to delete', 'error');
    } catch (err) {
      logger.error({ err }, 'VoiceExamManagement confirmDelete failed');
      notify('Network error', 'error');
    } finally {
      setDeleteTarget(null);
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const startEdit = (exam) => {
    setEditId(exam._id);
    setForm({
      title: exam.title,
      selectedYear: String(exam.year),
      moduleId: exam.moduleId?._id || exam.moduleId,
      clinicalCasePrompt: exam.clinicalCasePrompt,
      questions: (exam.questions || []).length > 0
        ? exam.questions.map((q) => ({
            questionText: q.questionText || '',
            idealAnswer: q.idealAnswer || '',
            criteria: (q.criteria || []).length > 0
              ? q.criteria.map((c) => ({ label: c.label || '', keywords: c.keywords || [] }))
              : [emptyCriterion()],
          }))
        : [emptyQuestion()],
    });
    setExistingImages(exam.images || []);
    setNewImages([]);
    setPreviews([]);
  };

  const resetForm = () => {
    setForm(emptyForm());
    setEditId(null);
    setNewImages([]);
    setExistingImages([]);
    previews.forEach((p) => URL.revokeObjectURL(p));
    setPreviews([]);
  };

  const filterModulesForBar = filterYear
    ? modules.filter((m) => m.year === Number(filterYear))
    : modules;

  const inp = { padding: 8, border: '1px solid var(--dc-border)', borderRadius: 6, width: '100%', background: 'var(--dc-cream-light)', boxSizing: 'border-box' };

  if (loading) return <div className="admin-page"><h2>Voice Exam Management</h2><Spinner /></div>;

  return (
    <div className="admin-page">
      <h2>Voice Exam Management</h2>

      {error && <div className="error-banner">{error}<button onClick={() => setError('')}>&times;</button></div>}

      <div className="admin-form-card" style={{ maxWidth: 900 }}>
        <h3>{editId ? 'Edit Voice Exam' : 'Create Voice Exam'}</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
          <input placeholder="Exam Title" value={form.title} onChange={(e) => set('title', e.target.value)} style={inp} />
          <select value={form.selectedYear} onChange={(e) => set('selectedYear', e.target.value)} style={inp}>
            <option value="">-- Year --</option>
            {YEARS.map((y) => <option key={y} value={y}>Year {y}</option>)}
          </select>
          <select value={form.moduleId} onChange={(e) => set('moduleId', e.target.value)} disabled={!form.selectedYear} style={inp}>
            <option value="">-- Module --</option>
            {filteredModules.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
          </select>
        </div>

        <textarea
          placeholder="Clinical case prompt / scenario shown to student"
          value={form.clinicalCasePrompt}
          onChange={(e) => set('clinicalCasePrompt', e.target.value)}
          rows={4}
          style={{ ...inp, width: '100%', marginBottom: 10 }}
        />

        <div style={{ marginBottom: 10 }}>
          <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FaImage /> Images
          </p>
          {existingImages.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {existingImages.map((img, i) => (
                <div key={i} style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={`${API_BASE_URL}/api/voice-exam-images/${img}`} alt="" loading="lazy"
                    style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--dc-border)' }}
                  />
                  <button type="button" onClick={() => removeExistingImage(img)} style={{
                    position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%',
                    background: 'var(--dc-highlight)', color: '#fff', border: 'none', cursor: 'pointer',
                    fontSize: 12, lineHeight: '20px', padding: 0, textAlign: 'center',
                  }}>×</button>
                </div>
              ))}
            </div>
          )}
          {previews.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {previews.map((p, i) => (
                <div key={i} style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={p} alt="" loading="lazy" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--dc-border)' }} />
                  <button type="button" onClick={() => removeNewImage(i)} style={{
                    position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%',
                    background: 'var(--dc-highlight)', color: '#fff', border: 'none', cursor: 'pointer',
                    fontSize: 12, lineHeight: '20px', padding: 0, textAlign: 'center',
                  }}>×</button>
                </div>
              ))}
            </div>
          )}
          <input type="file" accept="image/*" multiple onChange={handleImageSelect} style={{ fontSize: 13 }} />
        </div>

        <h4 style={{ margin: '16px 0 8px' }}>Questions</h4>

        {form.questions.map((q, qIdx) => (
          <div key={qIdx} style={{ border: '1px solid var(--dc-border)', borderRadius: 8, padding: 14, marginBottom: 12, background: '#fafafa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong style={{ fontSize: 14 }}>Question {qIdx + 1}</strong>
              {form.questions.length > 1 && (
                <button type="button" onClick={() => removeQuestion(qIdx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e74c3c' }}>
                  <FaTimes />
                </button>
              )}
            </div>

            <textarea
              placeholder="Question text"
              value={q.questionText}
              onChange={(e) => setQuestion(qIdx, 'questionText', e.target.value)}
              rows={2}
              style={{ ...inp, width: '100%', marginBottom: 8 }}
            />

            <textarea
              placeholder="Ideal answer (shown to student after submission)"
              value={q.idealAnswer}
              onChange={(e) => setQuestion(qIdx, 'idealAnswer', e.target.value)}
              rows={2}
              style={{ ...inp, width: '100%', marginBottom: 8 }}
            />

            <div style={{ marginLeft: 12 }}>
              <p style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>Criteria</p>
              {q.criteria.map((c, cIdx) => (
                <div key={cIdx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                  <input
                    placeholder="Criterion label (e.g. Diagnosis)"
                    value={c.label}
                    onChange={(e) => setCriterion(qIdx, cIdx, 'label', e.target.value)}
                    style={{ ...inp, width: '200px' }}
                  />
                  <input
                    placeholder="Keywords, comma-separated"
                    value={c.keywords.join(', ')}
                    onChange={(e) => setCriterion(qIdx, cIdx, 'keywords', e.target.value)}
                    style={{ ...inp, flex: 1 }}
                  />
                  {q.criteria.length > 1 && (
                    <button type="button" onClick={() => removeCriterion(qIdx, cIdx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e74c3c', padding: '6px 4px' }}>
                      <FaTimes />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => addCriterion(qIdx)} style={{ background: 'none', border: '1px dashed var(--dc-border)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, marginTop: 4 }}>
                <FaPlus /> Add criterion
              </button>
            </div>
          </div>
        ))}

        <button type="button" onClick={addQuestion} style={{ background: 'none', border: '1px dashed var(--dc-accent)', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13, marginBottom: 12, color: 'var(--dc-accent)', fontWeight: 600 }}>
          <FaPlus /> Add question
        </button>

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button type="button" onClick={handleSubmit} disabled={submitting}>{editId ? 'Update' : 'Create'}</button>
          {editId && <button type="button" onClick={resetForm}>Cancel</button>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={filterYear} onChange={(e) => { setFilterYear(e.target.value); setFilterModule(''); }} style={inp}>
          <option value="">All Years</option>
          {YEARS.map((y) => <option key={y} value={y}>Year {y}</option>)}
        </select>
        <select value={filterModule} onChange={(e) => setFilterModule(e.target.value)} style={inp}>
          <option value="">All Modules</option>
          {filterModulesForBar.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
        </select>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>{['Title', 'Year', 'Module', 'Prompt', 'Questions', 'Images', 'Actions'].map((h) => (
              <th key={h}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {exams.length === 0
              ? <tr><td colSpan="7" className="admin-empty">No voice exams</td></tr>
              : exams.map((exam) => (
                <tr key={exam._id}>
                  <td style={{ padding: 8, borderBottom: '1px solid var(--dc-border)' }}>{exam.title}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid var(--dc-border)' }}>Y{exam.year}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid var(--dc-border)' }}>{exam.moduleId?.name || '—'}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid var(--dc-border)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exam.clinicalCasePrompt}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid var(--dc-border)' }}>{(exam.questions || []).length}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid var(--dc-border)' }}>{(exam.images || []).length > 0 ? `${exam.images.length} image(s)` : '—'}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid var(--dc-border)' }}>
                    <button type="button" onClick={() => startEdit(exam)} style={{ marginRight: 6 }}><FaEdit /></button>
                    <button type="button" onClick={() => setDeleteTarget(exam)}><FaTrash /></button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Voice Exam"
        message={`Delete "${deleteTarget?.title || 'this exam'}"?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmText="Delete"
        confirmDisabled={submitting}
      />
    </div>
  );
};

export default VoiceExamManagement;