import React, { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import { useNavigate } from 'react-router-dom';
import { SkeletonQuizItem, SkeletonFilters } from '../components/LoadingSkeleton';
import { useToast } from '../components/Toast.jsx';
import { useTranslation } from '../context/LanguageContext';
import Pagination from '../components/Pagination';
import { shuffle } from '../utils/shuffle';
import '../styles/teal-theme.css';

const YEARS = [1, 2, 3, 4, 5, 6, 7];

const QuizPage = () => {
  const [modules, setModules]                     = useState([]);
  const [filteredModules, setFilteredModules]     = useState([]);
  const [selectedYear, setSelectedYear]           = useState('');
  const [selectedModuleId, setSelectedModuleId]   = useState('');
  const [selectedCourse, setSelectedCourse]       = useState('');
  const [moduleCourses, setModuleCourses]         = useState([]);
  const [quizzes, setQuizzes]                     = useState([]);
  const [examCount, setExamCount]                 = useState(10);
  const [examTimer, setExamTimer]                 = useState(30);
  const [studyMode, setStudyMode]                 = useState(false);
  const [selectionCriteria, setSelectionCriteria] = useState('random');
  const [loadingModules, setLoadingModules]       = useState(true);
  const [loadingQuizzes, setLoadingQuizzes]       = useState(true);
  const [modulesError, setModulesError]           = useState(null);
  const [quizzesError, setQuizzesError]           = useState(null);
  const [searchQuery, setSearchQuery]             = useState('');
  const [page, setPage]                           = useState(1);
  const [totalPages, setTotalPages]               = useState(1);
  const navigate = useNavigate();
  const notify = useToast();
  const { t } = useTranslation();

  useEffect(() => { document.title = 'QCM — QuizApp'; }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchModules(controller.signal);
    return () => controller.abort();
  }, []);
  useEffect(() => {
    setFilteredModules(selectedYear ? modules.filter((m) => m.year === Number(selectedYear)) : modules);
    setSelectedModuleId('');
    setSelectedCourse('');
  }, [selectedYear, modules]);

  useEffect(() => {
    if (!selectedModuleId) { setModuleCourses([]); setSelectedCourse(''); return; }
    const mod = modules.find((m) => m._id === selectedModuleId);
    setModuleCourses(mod?.courses || []);
    setSelectedCourse('');
  }, [selectedModuleId, modules]);

  useEffect(() => {
    fetchQuizzes(1);
  }, [selectedYear, selectedModuleId, selectedCourse]);

  const fetchModules = async (signal) => {
    setLoadingModules(true);
    setModulesError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/modules`, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!signal.aborted) setModules(await res.json());
    } catch (err) {
      if (err.name === 'AbortError') return;
      setModulesError(err.message);
    } finally {
      if (!signal?.aborted) setLoadingModules(false);
    }
  };

  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const fetchQuizzes = useCallback(async (pg) => {
    const pageNum = typeof pg === 'number' ? pg : 1;
    setLoadingQuizzes(true);
    setQuizzesError(null);
    try {
      let url = `${API_BASE_URL}/api/quizzes?page=${pageNum}&limit=50`;
      if (selectedModuleId)      url += `&moduleId=${selectedModuleId}`;
      else if (selectedYear)     url += `&year=${selectedYear}`;
      if (selectedCourse)        url += `&course=${encodeURIComponent(selectedCourse)}`;
      const res = await fetchWithAuth(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      if (!mountedRef.current) return;
      setQuizzes(d.data || (Array.isArray(d) ? d : []));
      setPage(d.page || 1);
      setTotalPages(d.pages || 1);
    } catch (err) {
      setQuizzesError(err.message);
    } finally {
      if (mountedRef.current) setLoadingQuizzes(false);
    }
  }, [selectedYear, selectedModuleId, selectedCourse]);

  const filteredQuizzes = searchQuery.trim()
    ? quizzes.filter((q) =>
        (q.question?.questionText || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (q.quizId || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : quizzes;

  const handleStart = (quiz) => {
    navigate(`/quiz/${quiz._id}`, {
      state: {
        quizId:   quiz._id,
        quizName: quiz.question?.questionText || quiz.quizId,
        question: quiz.question,
        studyMode,
        caseId:   quiz.caseId || null,
      },
    });
  };

  const distributeQuizzes = (quizzes, count, criteria) => {
    if (count <= 0) return [];
    if (criteria === 'random') return shuffle(quizzes).slice(0, count);

    const groups = {};
    for (const q of quizzes) {
      const key = criteria === 'per-module' ? (q.moduleId?._id || q.moduleId) : String(q.year);
      if (!groups[key]) groups[key] = [];
      groups[key].push(q);
    }
    const keys = Object.keys(groups);
    const perGroup = Math.ceil(count / keys.length);
    const selected = [];
    for (const key of keys) {
      const pool = shuffle(groups[key]);
      selected.push(...pool.slice(0, perGroup));
    }
    return shuffle(selected).slice(0, count);
  };

  const handleStartMockExam = async () => {
    try {
      const caseIds = [...new Set(filteredQuizzes.filter((q) => q.caseId).map((q) => q.caseId._id || q.caseId))];
      const caseMap = {};
      for (const cid of caseIds) {
        try {
          const res = await fetchWithAuth(`${API_BASE_URL}/api/cases/${cid}`);
          if (res.ok) caseMap[cid] = await res.json();
        } catch { /* skip failed case fetch */ }
      }
      const blocks = [];
      const seen = new Set();
      for (const quiz of filteredQuizzes) {
        if (quiz.caseId) {
          const cid = quiz.caseId._id || quiz.caseId;
          if (!seen.has(cid)) {
            seen.add(cid);
            const d = caseMap[cid];
            if (d && d.quizzes) blocks.push({ type: 'case', caseTitle: d.case.title, caseDescription: d.case.description, quizzes: d.quizzes.filter((q) => q.question?.questionText) });
          }
        } else {
          blocks.push({ type: 'single', quiz });
        }
      }
      const shuffled = shuffle(blocks);
      const expanded = [];
      for (const b of shuffled) {
        if (b.type === 'single') expanded.push({ ...b.quiz, _blockType: 'single' });
        else b.quizzes.forEach((cq, i) => expanded.push({ ...cq, _blockType: 'case', _caseTitle: b.caseTitle, _caseDescription: b.caseDescription, _isFirstOfCase: i === 0 }));
      }
      const count = Math.min(Math.max(examCount, 1), expanded.length);
      const selected = distributeQuizzes(expanded, count, selectionCriteria);
      navigate('/mock-exam', { state: { quizzes: selected, count: selected.length, examTimer, casesExpanded: true } });
    } catch {
      notify('Erreur lors du chargement des cas.', 'error');
    }
  };

  return (
    <div className="page-teal">
      <div className="card-teal">
        <h2>{t('quiz.title')}</h2>

        {modulesError ? (
          <div className="empty-state" style={{ color: '#e74c3c' }}>
            <p>{t('quiz.loadError')} : {modulesError}</p>
            <button type="button" className="btn-primary" onClick={fetchModules} style={{ marginTop: '12px' }}>{t('quiz.retry')}</button>
          </div>
        ) : loadingModules ? (
          <SkeletonFilters count={3} />
        ) : (
          <div className="filters-row">
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
              <option value="">{t('quiz.filters.allYears')}</option>
              {YEARS.map((y) => <option key={y} value={y}>Année {y}</option>)}
            </select>
            <select value={selectedModuleId} onChange={(e) => setSelectedModuleId(e.target.value)}>
              <option value="">{t('quiz.filters.allModules')}</option>
              {filteredModules.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
            </select>
            <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} disabled={!selectedModuleId || moduleCourses.length === 0}>
              <option value="">{t('quiz.filters.allCourses')}</option>
              {moduleCourses.map((c, i) => <option key={i} value={c}>{c}</option>)}
            </select>
            <input type="text" placeholder={`🔍 ${t('quiz.filters.search')}`} value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} style={{ flex: 1, minWidth: '180px', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-light, #ddd)', fontSize: '14px' }} />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
            <input type="checkbox" checked={studyMode} onChange={(e) => setStudyMode(e.target.checked)} />
            🔍 {t('quiz.studyMode')}
          </label>
        </div>

        {quizzesError ? (
          <div className="empty-state" style={{ color: '#e74c3c' }}>
            <p>{t('quiz.loadError')} : {quizzesError}</p>
            <button type="button" className="btn-primary" onClick={fetchQuizzes} style={{ marginTop: '12px' }}>{t('quiz.retry')}</button>
          </div>
        ) : loadingQuizzes ? (
          <SkeletonQuizItem count={5} />
        ) : (
          <>
            {filteredQuizzes.length > 0 && (
              <div className="exam-mode-section">
                <div className="exam-mode-header">🎯 {t('quiz.mockExam')}</div>
                <div className="exam-mode-controls">
                  <span>{t('quiz.questions')}</span>
                  <input type="number" className="exam-count-input" min="1" max={filteredQuizzes.length} value={examCount} onChange={(e) => setExamCount(Number(e.target.value))} />
                  <span style={{ fontSize: '13px', color: '#888' }}>({t('quiz.max')} {filteredQuizzes.length})</span>
                  <span>{t('quiz.time')}</span>
                  <input type="number" className="exam-count-input" min="1" max="180" value={examTimer} onChange={(e) => setExamTimer(Number(e.target.value))} />
                  <select value={selectionCriteria} onChange={(e) => setSelectionCriteria(e.target.value)}
                    style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--border-light, #ddd)', fontSize: '13px', background: 'var(--card-bg, #fff)' }}>
                    <option value="random">{t('quiz.criteria.random')}</option>
                    <option value="per-module">{t('quiz.criteria.perModule')}</option>
                    <option value="per-year">{t('quiz.criteria.perYear')}</option>
                  </select>
                  <button type="button" className="btn-primary exam-start-btn" onClick={handleStartMockExam}>{t('quiz.startMock')}</button>
                </div>
              </div>
            )}

            {filteredQuizzes.length === 0 ? (
              <div className="empty-state">
                <p>{t('quiz.noQuizzes')}</p>
                <p style={{ color: '#888', fontSize: '13px', marginTop: '4px' }}>{t('quiz.noQuizzesHint')}</p>
              </div>
            ) : (
              filteredQuizzes.map((quiz) => (
                <div key={quiz._id} className="quiz-card-item">
                  <div className="qid">{quiz.quizId}</div>
                  {quiz.caseId && <span style={{ display: 'inline-block', background: '#e3f2fd', color: '#0C4A4A', padding: '2px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, marginBottom: '6px' }}>📋 {t('quiz.case')}</span>}
                  <h3>{quiz.question?.questionText?.substring(0, 80) || quiz.quizId}</h3>
                  <div className="qmeta">
                    Année {quiz.year} — {quiz.moduleId?.name || ''}{quiz.course ? ` — ${quiz.course}` : ''}
                  </div>
                  {quiz.caseId ? (
                    <button type="button" className="btn-primary" onClick={() => navigate(`/case-exam/${quiz.caseId._id || quiz.caseId}`)}>
                      📋 {t('quiz.launchCase')}
                    </button>
                  ) : (
                    <button type="button" className="btn-primary" onClick={() => handleStart(quiz)}>
                      {studyMode ? t('quiz.study') : t('quiz.start')}
                    </button>
                  )}
                </div>
              ))
            )}
            {!loadingQuizzes && !quizzesError && <Pagination page={page} pages={totalPages} onPageChange={(p) => fetchQuizzes(p)} />}
          </>
        )}
      </div>
    </div>
  );
};

export default QuizPage;
