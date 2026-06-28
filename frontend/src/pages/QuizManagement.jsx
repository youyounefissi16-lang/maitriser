import React, { useState, useEffect, useCallback, useRef } from 'react';
import { authFetch } from '../config/authFetch';
import { API_BASE_URL } from '../config/api';
import { FaTrash, FaEdit, FaSave, FaPaperPlane, FaCheckDouble, FaRegCircle, FaCheckCircle } from 'react-icons/fa';
import { useToast } from '../components/Toast';
import { useSound } from '../context/SoundContext';
import ConfirmModal from '../components/ConfirmModal';
import Spinner from '../components/Spinner';
import Pagination from '../components/Pagination';
import { useTranslation } from '../context/LanguageContext';
import { logger } from '../utils/logger';
import '../styles/QuizManagement.css';

const YEARS = [1, 2, 3, 4, 5, 6, 7];
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const emptyForm = () => ({
  discipline: '', selectedYear: '', moduleId: '', course: '',
  questionText: '',
  options: ['', '', '', ''], correctIndices: [],
  explanation: '',
});

const OptionItem = ({ i, opt, onUpdate }) => {
  const [text, setText] = useState(opt);
  useEffect(() => { setText(opt); }, [opt]);

  const handleChange = (e) => {
    const v = e.target.value;
    setText(v);
    onUpdate(i, v);
  };

  return (
    <div className="option-row">
      <span className="option-letter">{LETTERS[i]}.</span>
      <input type="text" className="option-input" value={text} onChange={handleChange} placeholder={`Option ${LETTERS[i]}`} />
    </div>
  );
};

const QuizManagement = () => {
  useEffect(() => { document.title = 'Quiz Management — Admin'; }, []);
  const notify = useToast();
  const play = useSound();
  const { t } = useTranslation();
  const [modules, setModules]               = useState([]);
  const [filteredModules, setFilteredModules] = useState([]);
  const [quizzes, setQuizzes]               = useState([]);
  const [form, setForm]                     = useState(emptyForm());
  const [editId, setEditId]                 = useState(null);
  const [csvImporting, setCsvImporting]     = useState(false);
  const [filterDiscipline, setFilterDiscipline] = useState('');
  const [filterYear, setFilterYear]         = useState('');
  const [filterModule, setFilterModule]     = useState('');
  const [filterSearch, setFilterSearch]     = useState('');
  const [formKey, setFormKey]               = useState(0);
  const [moduleCourses, setModuleCourses]   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [deleteTarget, setDeleteTarget]     = useState(null);
  const [page, setPage]                     = useState(1);
  const [totalPages, setTotalPages]         = useState(1);
  const [selectedIds, setSelectedIds]       = useState(new Set());
  const [bulkDeleteTarget, setBulkDeleteTarget] = useState(null);
  const [bulkProcessing, setBulkProcessing]  = useState(false);
  const [showCaseModal, setShowCaseModal]   = useState(false);
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [creatingCase, setCreatingCase]     = useState(false);
  const [questionImage, setQuestionImage]   = useState(null);
  const [imagePreview, setImagePreview]     = useState(null);
  const [removeImage, setRemoveImage]       = useState(false);
  const emptyQuiz = () => ({ questionText: '', options: ['', '', '', ''], correctIndices: [], explanation: '' });
  const [caseForm, setCaseForm]             = useState({ year: '', moduleId: '', title: '', description: '', quizzes: [emptyQuiz(), emptyQuiz(), emptyQuiz()] });

  useEffect(() => { fetchModules(); fetchQuizzes(); }, [filterDiscipline]);

  useEffect(() => {
    setFilteredModules(modules.filter((m) => {
      if (form.selectedYear && m.year !== Number(form.selectedYear)) return false;
      if (form.discipline && m.discipline !== form.discipline) return false;
      return true;
    }));
    setForm((f) => ({ ...f, moduleId: '' }));
  }, [form.selectedYear, form.discipline, modules]);

  useEffect(() => {
    if (!form.moduleId) { setModuleCourses([]); return; }
    const mod = modules.find((m) => m._id === form.moduleId);
    if (mod) setModuleCourses(mod.courses || []);
    else {
      authFetch(`/api/modules`)
        .then((r) => r.ok ? r.json() : [])
        .then((all) => { if (Array.isArray(all)) { const found = all.find((m) => m._id === form.moduleId); if (found) setModuleCourses(found.courses || []); } })
        .catch((err) => { logger.error({ err }, 'QuizManagement moduleCourses fallback fetch failed'); });
    }
  }, [form.moduleId, modules]);

  const fetchModules = async () => {
    try {
      const res = await authFetch('/api/modules');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setModules(Array.isArray(data) ? data : []);
    } catch (e) { logger.error({ err: e }, 'QuizManagement fetchModules failed'); setModules([]); }
  };

  const fetchQuizzes = async (p) => {
    const pg = p ?? page;
    let url = `/api/admin/quizzes?page=${pg}&limit=50`;
    if (filterDiscipline) url += `&discipline=${filterDiscipline}`;
    if (filterModule) url += `&moduleId=${filterModule}`;
    else if (filterYear) url += `&year=${filterYear}`;
    if (filterSearch) url += `&search=${encodeURIComponent(filterSearch)}`;
    try {
      setLoading(true);
      const res = await authFetch(url);
      if (!res.ok) throw new Error('Failed');
      const d = await res.json();
      setQuizzes(d.data || (Array.isArray(d) ? d : []));
      setPage(d.page || 1);
      setTotalPages(d.pages || 1);
      setError('');
    } catch (e) { logger.error({ err: e }, 'QuizManagement fetchQuizzes failed'); setError('Failed to load quizzes'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchQuizzes(1); }, [filterDiscipline, filterYear, filterModule, filterSearch]);

  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const updateOption = useCallback((i, val) => {
    setForm((f) => {
      const updated = f.options.map((o, idx) => idx === i ? val : o);
      return { ...f, options: updated };
    });
  }, []);

  const toggleCorrect = useCallback((idx, wantsCorrect) => {
    setForm((f) => {
      const has = f.correctIndices.includes(idx);
      if (wantsCorrect && !has) return { ...f, correctIndices: [...f.correctIndices, idx] };
      if (!wantsCorrect && has) return { ...f, correctIndices: f.correctIndices.filter((i) => i !== idx) };
      return f;
    });
  }, []);

  const handleSubmit = async (published) => {
    play('submit');
    if (submittingRef.current) return;
    const { moduleId, course, questionText, options, correctIndices, explanation } = form;
    if (!moduleId || !questionText) return notify('Please fill all required fields.', 'warning');
    if (options.some((o) => !o.trim())) return notify('All options must have text.', 'warning');
    if (correctIndices.length === 0) return notify('Select at least one correct answer.', 'warning');

    const correctAnswers = correctIndices.map((i) => options[i]);
    const url    = editId ? `/api/edit-quiz/${editId}` : '/api/create-quiz';
    const method = editId ? 'PUT' : 'POST';
    submittingRef.current = true;
    setSubmitting(true);

    try {
      let res;
      if (questionImage || (editId && removeImage)) {
        const fd = new FormData();
        fd.append('moduleId', moduleId);
        fd.append('questionText', questionText);
        fd.append('options', JSON.stringify(options));
        fd.append('correctAnswers', JSON.stringify(correctAnswers));
        fd.append('course', course || '');
        fd.append('published', String(published));
        fd.append('explanation', explanation || '');
        if (questionImage) fd.append('questionImage', questionImage);
        if (editId && removeImage) fd.append('removeImage', 'true');
        res = await authFetch(url, { method, body: fd });
      } else {
        const body = { moduleId, course: course || '', questionText, options, correctAnswers, explanation, published };
        res = await authFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      }
      const data = res.ok ? await res.json() : null;
      if (res.ok) { fetchQuizzes(); resetForm(); notify(editId ? 'Quiz updated' : 'Quiz created', 'success'); }
      else notify(`Error: ${data?.message || 'Unknown error'}`, 'error');
    } catch (err) {
      logger.error({ err }, 'QuizManagement handleSubmit failed');
      notify('Network error', 'error');
    } finally { submittingRef.current = false; setSubmitting(false); }
  };

  const confirmDelete = async () => {
    play('delete');
    if (!deleteTarget || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await authFetch(`/api/delete-quiz/${deleteTarget._id}`, { method: 'DELETE' });
      if (res.ok) { fetchQuizzes(); notify('Quiz deleted', 'success'); }
      else notify('Failed to delete', 'error');
    } catch (err) {
      logger.error({ err }, 'QuizManagement confirmDelete failed');
      notify('Network error', 'error');
    }
    setDeleteTarget(null);
    submittingRef.current = false;
    setSubmitting(false);
  };

  const startEdit = (quiz) => {
    const opts = quiz.question?.options || ['', '', '', ''];
    const correctIndices = (quiz.question?.correctAnswers || [])
      .map((ans) => opts.findIndex((o) => o === ans))
      .filter((i) => i >= 0);
    const mod = modules.find((m) => (m._id === (quiz.moduleId?._id || quiz.moduleId)));
    if (mod) setModuleCourses(mod.courses || []);

    setEditId(quiz._id);
    setForm({
      discipline: quiz.discipline || '',
      selectedYear: String(quiz.year),
      moduleId: quiz.moduleId?._id || quiz.moduleId,
      course: quiz.course || '',
      questionText: quiz.question?.questionText || '',
      options: [...opts],
      correctIndices,
      explanation: quiz.explanation || quiz.question?.explanation || '',
    });
    if (quiz.question?.questionImage) {
      setImagePreview(`${API_BASE_URL}/api/quiz-images/${quiz.question.questionImage}`);
      setRemoveImage(false);
    } else {
      setImagePreview(null);
      setRemoveImage(false);
    }
    setQuestionImage(null);
    setFormKey((k) => k + 1);
  };

  const resetForm = () => { setForm(emptyForm()); setEditId(null); setFormKey((k) => k + 1); setQuestionImage(null); setImagePreview(null); setRemoveImage(false); };

  // ── Bulk selection ────────────────────────────────────────────────────────────
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === quizzes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(quizzes.map((q) => q._id)));
    }
  };
  const handleBulkAction = async (action) => {
    play('submit');
    if (submittingRef.current) return;
    const ids = [...selectedIds];
    if (!ids.length) return notify('Aucun quiz sélectionné.', 'warning');
    if (action === 'delete') { setBulkDeleteTarget(ids); return; }
    submittingRef.current = true;
    setSubmitting(true);
    setBulkProcessing(true);
    try {
      const url = action === 'publish' ? '/api/bulk/publish' : '/api/bulk/unpublish';
      const res = await authFetch(url, { method: 'POST', body: JSON.stringify({ ids }) });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { message: `HTTP ${res.status}: ${text.substring(0, 100)}` }; }
      if (res.ok) { notify(data.message, 'success'); setSelectedIds(new Set()); fetchQuizzes(); }
      else notify(`Erreur (${res.status}): ${data.message}`, 'error');
    } catch (e) { logger.error({ err: e }, 'QuizManagement handleBulkAction failed'); notify(`Action groupée échouée: ${e.message}`, 'error'); }
    finally { setBulkProcessing(false); submittingRef.current = false; setSubmitting(false); }
  };

  const confirmBulkDelete = async () => {
    play('delete');
    if (!bulkDeleteTarget?.length || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setBulkProcessing(true);
    try {
      const res = await authFetch('/api/bulk/delete', { method: 'POST', body: JSON.stringify({ ids: bulkDeleteTarget }) });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { message: `HTTP ${res.status}: ${text.substring(0, 100)}` }; }
      if (res.ok) { notify(data.message, 'success'); setSelectedIds(new Set()); fetchQuizzes(); }
      else notify(`Erreur (${res.status}): ${data.message}`, 'error');
    } catch (e) { logger.error({ err: e }, 'QuizManagement confirmBulkDelete failed'); notify(`Suppression groupée échouée: ${e.message}`, 'error'); }
    finally { setBulkProcessing(false); setBulkDeleteTarget(null); submittingRef.current = false; setSubmitting(false); }
  };

  const handleCSVImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      setCsvImporting(true);
      const res    = await authFetch('/api/import-quizzes-csv', { method: 'POST', body: formData });
      const result = res.ok ? await res.json() : null;
      notify(result?.message || 'Import finished', res.ok ? 'success' : 'error');
      fetchQuizzes();
    } catch (err) { logger.error({ err }, 'QuizManagement CSV import failed'); notify('CSV import failed', 'error'); }
    finally { setCsvImporting(false); e.target.value = ''; }
  };

  const handleCreateCase = async () => {
    play('submit');
    if (submittingRef.current) return;
    if (!caseForm.title || !caseForm.description || !caseForm.moduleId)
      return notify('Please fill all fields.', 'warning');
    const incomplete = caseForm.quizzes.findIndex((q) => !q.questionText || q.options.some((o) => !o) || q.correctIndices.length === 0);
    if (incomplete >= 0) return notify(`Quiz ${incomplete + 1} is incomplete — fill in question, all options, and select correct answer(s).`, 'warning');
    submittingRef.current = true;
    setSubmitting(true);
    setCreatingCase(true);
    try {
      const res = await authFetch('/api/admin/create-case-quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: caseForm.title, description: caseForm.description, moduleId: caseForm.moduleId, quizzes: caseForm.quizzes }),
      });
      const data = res.ok ? await res.json() : null;
      if (res.ok) {
        notify(data.message, 'success');
        setShowCaseModal(false);
        setCaseForm({ year: '', moduleId: '', title: '', description: '', quizzes: [emptyQuiz(), emptyQuiz(), emptyQuiz()] });
        fetchQuizzes();
      } else {
        notify(`Error: ${data.message}`, 'error');
      }
    } catch (err) {
      logger.error({ err }, 'QuizManagement handleCreateCase failed');
      notify('Failed to create case', 'error');
    } finally {
      setCreatingCase(false);
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const setCaseField = (field, value) => setCaseForm((f) => ({ ...f, [field]: value }));

  const updateQuiz = (idx, field, value) => {
    setCaseForm((f) => {
      const quizzes = [...f.quizzes];
      quizzes[idx] = { ...quizzes[idx], [field]: value };
      return { ...f, quizzes };
    });
  };

  const updateQuizOption = (qIdx, oIdx, value) => {
    setCaseForm((f) => {
      const quizzes = [...f.quizzes];
      const options = [...quizzes[qIdx].options];
      options[oIdx] = value;
      quizzes[qIdx] = { ...quizzes[qIdx], options };
      return { ...f, quizzes };
    });
  };

  const toggleQuizCorrect = (qIdx, oIdx) => {
    setCaseForm((f) => {
      const quizzes = [...f.quizzes];
      const idx = quizzes[qIdx].correctIndices.indexOf(oIdx);
      quizzes[qIdx] = {
        ...quizzes[qIdx],
        correctIndices: idx >= 0
          ? quizzes[qIdx].correctIndices.filter((i) => i !== oIdx)
          : [...quizzes[qIdx].correctIndices, oIdx],
      };
      return { ...f, quizzes };
    });
  };

  const handleQuizCountChange = (n) => {
    const count = Math.max(1, Math.min(50, n || 1));
    setCaseForm((f) => {
      const existing = f.quizzes;
      return {
        ...f,
        quizzes: Array.from({ length: count }, (_, i) => existing[i] || emptyQuiz()),
      };
    });
  };

  const caseFilteredModules = caseForm.year
    ? modules.filter((m) => m.year === Number(caseForm.year))
    : modules;

  const filterModulesForBar = modules.filter((m) => {
    if (filterYear && m.year !== Number(filterYear)) return false;
    if (filterDiscipline && m.discipline !== filterDiscipline) return false;
    return true;
  });

  return (
    <div className="quiz-management">
      {error && <div className="error-banner">{error}<button onClick={() => setError('')}>&times;</button></div>}

      <div className="qm-header">
        <h1 className="qm-logo">MAITRISEZ <span className="qm-logo-light">| Admin Dashboard</span></h1>
        <span className="qm-user">Admin</span>
      </div>

      <div className="qm-breadcrumb">{t('admin.dashboard.title')} / {t('admin.quiz.title')} / {t('admin.quiz.addNew')}</div>

      <div className="qm-csv-import">
        <strong>{t('admin.quiz.importCSV')}</strong>
        <input type="file" accept=".csv" onChange={handleCSVImport} disabled={csvImporting} />
        {csvImporting && <span className="qm-spinner">{t('admin.quiz.csvImporting')}</span>}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button type="button" className="btn-publish" style={{ padding: '10px 22px', border: 'none', borderRadius: 'var(--dc-radius-sm)', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }} onClick={() => setShowCaseModal(true)}>➕ {t('admin.quiz.newCase')}</button>
      </div>

      <div className="qm-form" key={formKey}>
        <h2 className="qm-form-title">{editId ? t('admin.quiz.edit') : t('admin.quiz.addNew')}</h2>

        <div className="qm-filters">
          <select value={form.discipline} onChange={(e) => { setField('discipline', e.target.value); setField('selectedYear', ''); }}>
            <option value="">Choose Discipline</option>
            <option value="medicine">Medicine</option>
            <option value="pharmacy">Pharmacy</option>
          </select>
          <select value={form.selectedYear} onChange={(e) => setField('selectedYear', e.target.value)}>
            <option value="">Choose Year</option>
            {YEARS.map((y) => <option key={y} value={y}>Year {y}</option>)}
          </select>
          <select value={form.moduleId} onChange={(e) => setField('moduleId', e.target.value)} disabled={!form.selectedYear}>
            <option value="">Choose Module</option>
            {filteredModules.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
          </select>
          <select className="qm-input-sm" value={form.course} onChange={(e) => setField('course', e.target.value)} disabled={!form.moduleId || moduleCourses.length === 0}>
            <option value="">{t('admin.quiz.course')}</option>
            {moduleCourses.map((c, i) => <option key={i} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="qm-section">
          <label className="qm-label">{t('admin.quiz.questionText')}</label>
          <textarea className="qm-textarea" value={form.questionText} onChange={(e) => setField('questionText', e.target.value)} placeholder="Write the question here..." rows={4} />
        </div>

        <div className="qm-section">
          <label className="qm-label">Question Image (optional)</label>
          {imagePreview && (
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
              <img src={imagePreview} alt="Preview" style={{ maxWidth: 200, borderRadius: 6, border: '1px solid #ccc' }} />
              <button type="button" onClick={() => { setImagePreview(null); setQuestionImage(null); setRemoveImage(true); }} style={{ position: 'absolute', top: 4, right: 4, background: 'red', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 12, lineHeight: '22px', textAlign: 'center' }}>&times;</button>
            </div>
          )}
          {!imagePreview && (
            <input type="file" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) { setQuestionImage(file); setImagePreview(URL.createObjectURL(file)); setRemoveImage(false); }
            }} />
          )}
        </div>

        <div className="qm-section">
          <label className="qm-label">{t('admin.quiz.options')}</label>
          <div className="qm-options-header">
            <span className="col-letter">Letter</span>
            <span className="col-text">Option</span>
          </div>
          <div key={formKey}>
            {form.options.map((opt, i) => (<OptionItem key={i} i={i} opt={opt} onUpdate={updateOption} />))}
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
            <label style={{ fontWeight: 600 }}>Number of options:</label>
            <select value={form.options.length} onChange={(e) => {
              const n = Number(e.target.value);
              setForm((f) => {
                const curr = f.options.length;
                if (n > curr) return { ...f, options: [...f.options, ...Array(n - curr).fill('')] };
                return { ...f, options: f.options.slice(0, n), correctIndices: f.correctIndices.filter((i) => i < n) };
              });
            }} style={{ padding: '4px 8px' }}>
              {[2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n} options</option>)}
            </select>
          </div>
        </div>

        <div className="qm-section">
          <label className="qm-label">{t('admin.quiz.correctAnswers')}</label>
          <div className="qm-answer-letters">
            {LETTERS.slice(0, form.options.length).map((l, i) => (
              <button key={i} type="button" className={`letter-btn ${form.correctIndices.includes(i) ? 'selected' : ''}`}
                onClick={() => toggleCorrect(i, !form.correctIndices.includes(i))}>{l}</button>
            ))}
          </div>
        </div>

        <div className="qm-section">
          <label className="qm-label">{t('admin.quiz.explanation')}</label>
          <textarea className="qm-textarea" value={form.explanation} onChange={(e) => setField('explanation', e.target.value)} placeholder="Write explanation here..." rows={3} />
        </div>

        <div className="qm-actions">
          <button type="button" className="btn-draft" onClick={() => handleSubmit(false)} disabled={submitting}><FaSave /> {t('admin.quiz.saveDraft')}</button>
          <button type="button" className="btn-publish" onClick={() => handleSubmit(true)} disabled={submitting}><FaPaperPlane /> {t('admin.quiz.publish')}</button>
          {editId && <button type="button" className="btn-cancel" onClick={resetForm}>{t('admin.quiz.cancel')}</button>}
        </div>
      </div>

      <div className="qm-list-filters">
        <select value={filterDiscipline} onChange={(e) => { setFilterDiscipline(e.target.value); setFilterModule(''); }}>
          <option value="">All Disciplines</option>
          <option value="medicine">Medicine</option>
          <option value="pharmacy">Pharmacy</option>
        </select>
        <select value={filterYear} onChange={(e) => { setFilterYear(e.target.value); setFilterModule(''); }}>
          <option value="">{t('admin.quiz.allYears')}</option>
          {YEARS.map((y) => <option key={y} value={y}>Year {y}</option>)}
        </select>
        <select value={filterModule} onChange={(e) => setFilterModule(e.target.value)}>
          <option value="">{t('admin.quiz.allModules')}</option>
          {filterModulesForBar.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
        </select>
        <input type="text" placeholder={`🔍 ${t('admin.quiz.search')}`} value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          style={{ flex: 1, minWidth: '150px', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--dc-border)', fontSize: '13px' }} />
      </div>

      <div className="qm-bulk-bar" style={{
        display: selectedIds.size > 0 ? 'flex' : 'none',
        alignItems: 'center', gap: '10px', padding: '10px 14px',
        background: 'var(--dc-accent-light, #e0f2f1)', borderRadius: '8px',
        marginBottom: '12px', fontSize: '0.85rem', fontWeight: 600,
        flexWrap: 'wrap',
      }}>
        <span>{t('admin.quiz.selected', { count: selectedIds.size })}</span>
        <button type="button" className="btn-publish" style={{ padding: '6px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}
          onClick={() => handleBulkAction('publish')} disabled={bulkProcessing}>
          {t('admin.quiz.bulkPublish')}
        </button>
        <button type="button" style={{ padding: '6px 16px', border: '1px solid var(--dc-border)', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', background: 'var(--dc-white)' }}
          onClick={() => handleBulkAction('unpublish')} disabled={bulkProcessing}>
          {t('admin.quiz.bulkUnpublish')}
        </button>
        <button type="button" style={{ padding: '6px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', background: 'var(--dc-highlight)', color: 'var(--dc-white)' }}
          onClick={() => handleBulkAction('delete')} disabled={bulkProcessing}>
          <FaTrash /> {t('admin.quiz.bulkDelete')}
        </button>
        <button type="button" style={{ marginLeft: 'auto', padding: '4px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', background: 'transparent', color: 'var(--dc-text-muted)' }}
          onClick={() => setSelectedIds(new Set())}>
          {t('admin.quiz.bulkCancel')}
        </button>
      </div>

      {loading ? <Spinner /> : (
        <div className="qm-table-wrapper">
        <table className="qm-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input type="checkbox" checked={quizzes.length > 0 && selectedIds.size === quizzes.length}
                  onChange={toggleSelectAll} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
              </th>
              {[t('admin.quiz.quizId'), t('admin.quiz.year'), t('admin.quiz.module'), t('admin.quiz.course'), 'Discipline', t('admin.quiz.published'), 'Case', t('admin.quiz.questionText'), t('admin.quiz.options'), t('admin.quiz.correctAnswers'), 'Actions'].map((h) => (<th key={h}>{h}</th>))}
            </tr>
          </thead>
          <tbody>
            {quizzes.length === 0
                ? <tr><td colSpan="12" className="qm-empty">{t('admin.quiz.noQuizzes')}</td></tr>
                : quizzes.map((quiz) => (
                  <tr key={quiz._id} style={{ background: selectedIds.has(quiz._id) ? 'var(--dc-cream-light)' : undefined }}>
                    <td>
                      <input type="checkbox" checked={selectedIds.has(quiz._id)}
                        onChange={() => toggleSelect(quiz._id)} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                    </td>
                    <td>{quiz.quizId}</td>
                    <td>Y{quiz.year}</td>
                    <td>{quiz.moduleId?.name || '—'}</td>
                    <td>{quiz.course || '—'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{quiz.discipline || '—'}</td>
                    <td>{quiz.published
                      ? <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>{t('admin.quiz.published')}</span>
                      : <span style={{ color: 'var(--dc-text-muted)' }}>{t('admin.quiz.draft')}</span>}</td>
                    <td>{quiz.caseId ? <span style={{ background: 'var(--dc-cream-light)', color: 'var(--dc-accent)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>📋 {quiz.caseId?.title || 'Case'}</span> : '—'}</td>
                    <td className="qm-cell-text">{quiz.question?.questionText}</td>
                    <td>{quiz.question?.options?.join(', ')}</td>
                    <td>{quiz.question?.correctAnswers?.join(', ')}</td>
                    <td className="qm-cell-actions">
                      <button onClick={() => startEdit(quiz)}><FaEdit /></button>
                      <button onClick={() => setDeleteTarget(quiz)}><FaTrash /></button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        </div>
      )}
      {!loading && <Pagination page={page} pages={totalPages} onPageChange={(p) => fetchQuizzes(p)} />}

      {showCaseModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.5)', zIndex: 2000,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px 0',
        }} onClick={() => !creatingCase && setShowCaseModal(false)}>
          <div style={{
            background: 'var(--dc-white, #fff)', borderRadius: 'var(--dc-radius, 12px)',
            padding: '28px', width: '90%', maxWidth: '680px', marginTop: '20px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 20px', fontSize: '1.2rem', color: 'var(--dc-dark)' }}>📋 {t('admin.quiz.newCase')}</h2>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <select value={caseForm.year} onChange={(e) => { setCaseField('year', e.target.value); setCaseField('moduleId', ''); }} style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--dc-border)', borderRadius: '6px', fontSize: '0.85rem' }}>
            <option value="">{t('admin.quiz.year')}</option>
                {YEARS.map((y) => <option key={y} value={y}>Year {y}</option>)}
              </select>
              <select value={caseForm.moduleId} onChange={(e) => setCaseField('moduleId', e.target.value)} disabled={!caseForm.year} style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--dc-border)', borderRadius: '6px', fontSize: '0.85rem' }}>
            <option value="">{t('admin.quiz.module')}</option>
                {caseFilteredModules.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--dc-text)' }}>Case Title</label>
              <input type="text" value={caseForm.title} onChange={(e) => setCaseField('title', e.target.value)} placeholder="e.g. Hypertension & Renal" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--dc-border)', borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--dc-text)' }}>Case Description</label>
              <textarea value={caseForm.description} onChange={(e) => setCaseField('description', e.target.value)} placeholder="Describe the clinical scenario..." rows={4} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--dc-border)', borderRadius: '6px', fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--dc-text)' }}>Number of Quizzes:</label>
              <input type="number" min="1" max="50" value={caseForm.quizzes.length} onChange={(e) => handleQuizCountChange(Number(e.target.value))} style={{ width: '80px', padding: '8px 10px', border: '1px solid var(--dc-border)', borderRadius: '6px', fontSize: '0.9rem' }} />
            </div>

            <div style={{ maxHeight: '50vh', overflowY: 'auto', marginBottom: '20px' }}>
              {caseForm.quizzes.map((quiz, qIdx) => (
                <div key={qIdx} style={{
                  border: '1px solid var(--dc-border)', borderRadius: '8px', padding: '16px', marginBottom: '12px',
                  background: qIdx % 2 === 0 ? 'var(--dc-cream)' : 'var(--dc-white)',
                }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--dc-accent)', marginBottom: '10px' }}>Quiz {qIdx + 1}</div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '4px', color: 'var(--dc-text)' }}>Question</label>
                    <textarea value={quiz.questionText} onChange={(e) => updateQuiz(qIdx, 'questionText', e.target.value)} placeholder="Write the question..." rows={2} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--dc-border)', borderRadius: '6px', fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '4px', color: 'var(--dc-text)' }}>Options</label>
                    {LETTERS.slice(0, quiz.options.length).map((l, oIdx) => (
                      <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--dc-accent)', width: '20px' }}>{l}</span>
                        <input type="text" value={quiz.options[oIdx]} onChange={(e) => updateQuizOption(qIdx, oIdx, e.target.value)} placeholder={`Option ${l}`} style={{ flex: 1, padding: '6px 8px', border: '1px solid var(--dc-border)', borderRadius: '4px', fontSize: '0.85rem' }} />
                        <input type="checkbox" checked={quiz.correctIndices.includes(oIdx)} onChange={() => toggleQuizCorrect(qIdx, oIdx)} title="Correct answer" style={{ cursor: 'pointer' }} />
                      </div>
                    ))}
                    <div style={{ fontSize: '0.75rem', color: 'var(--dc-text-light)', marginTop: '2px' }}>Check the box for correct answer(s)</div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '4px', color: 'var(--dc-text)' }}>Explanation (optional)</label>
                    <input type="text" value={quiz.explanation} onChange={(e) => updateQuiz(qIdx, 'explanation', e.target.value)} placeholder="Explain the correct answer..." style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--dc-border)', borderRadius: '4px', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--dc-border)', paddingTop: '16px' }}>
              <button type="button" onClick={() => setShowCaseModal(false)} disabled={creatingCase} style={{ padding: '10px 22px', border: '1px solid var(--dc-border)', borderRadius: '6px', background: 'var(--dc-cream-light, #f5f3f7)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button type="button" onClick={handleCreateCase} disabled={creatingCase} style={{ padding: '10px 22px', border: 'none', borderRadius: '6px', background: 'linear-gradient(135deg, var(--dc-dark), var(--dc-accent))', color: 'var(--dc-white)', cursor: 'pointer', fontWeight: 700 }}>{creatingCase ? 'Creating...' : 'Create Case'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title={t('admin.quiz.deleteConfirm')}
        message={t('admin.quiz.deleteConfirmMsg', { id: deleteTarget?.quizId || '' })}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmText={t('admin.quiz.delete')}
        confirmDisabled={submitting}
      />

      <ConfirmModal
        open={!!bulkDeleteTarget}
        title={t('admin.quiz.deleteConfirm')}
        message={t('admin.quiz.deleteConfirmMsg', { id: `${bulkDeleteTarget?.length || 0} selected` })}
        onConfirm={confirmBulkDelete}
        onCancel={() => setBulkDeleteTarget(null)}
        confirmText={t('admin.quiz.delete')}
        cancelText={t('admin.quiz.cancel')}
        confirmDisabled={submitting}
      />
    </div>
  );
};

export default QuizManagement;
