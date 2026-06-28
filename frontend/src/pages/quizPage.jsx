import React, { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import { useNavigate } from 'react-router-dom';
import { SkeletonQuizItem, SkeletonFilters } from '../components/LoadingSkeleton';
import { useToast } from '../components/Toast.jsx';
import { useTranslation } from '../context/LanguageContext';
import Pagination from '../components/Pagination';
import { shuffle } from '../utils/shuffle';
import { useSound } from '../context/SoundContext';
import '../styles/teal-theme.css';

const QuizPage = () => {
  const [modules, setModules]                     = useState([]);
  const [filteredModules, setFilteredModules]     = useState([]);
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
  const [starting, setStarting]                   = useState(false);
  const [subscription, setSubscription]           = useState(null);
  const navigate = useNavigate();
  const notify = useToast();
  const { t } = useTranslation();
  const play = useSound();

  useEffect(() => { document.title = 'QCM — MAITRISEZ'; }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchModules(controller.signal);
    return () => controller.abort();
  }, []);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/payments/subscription`);
        if (res.ok) { const d = await res.json(); setSubscription(d.subscription); }
      } catch { /* ignore */ }
    })();
  }, []);
  useEffect(() => {
    const userYear = localStorage.getItem('userYear') || '';
    setFilteredModules(userYear ? modules.filter((m) => m.year === Number(userYear)) : modules);
    setSelectedModuleId('');
    setSelectedCourse('');
  }, [modules]);

  useEffect(() => {
    if (!selectedModuleId) { setModuleCourses([]); setSelectedCourse(''); return; }
    const mod = modules.find((m) => m._id === selectedModuleId);
    setModuleCourses(mod?.courses || []);
    setSelectedCourse('');
  }, [selectedModuleId, modules]);

  useEffect(() => {
    fetchQuizzes(1);
  }, [selectedModuleId, selectedCourse]);

  const fetchModules = async (signal) => {
    setLoadingModules(true);
    setModulesError(null);
    try {
      const discipline = localStorage.getItem('userDiscipline') || '';
      const url = discipline ? `${API_BASE_URL}/api/modules?discipline=${discipline}` : `${API_BASE_URL}/api/modules`;
      const res = await fetchWithAuth(url, { signal });
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
      const discipline = localStorage.getItem('userDiscipline') || '';
      const year = localStorage.getItem('userYear') || '';
      let url = `${API_BASE_URL}/api/quizzes?page=${pageNum}&limit=50`;
      if (discipline)    url += `&discipline=${discipline}`;
      if (year)          url += `&year=${year}`;
      if (selectedModuleId)      url += `&moduleId=${selectedModuleId}`;
      if (selectedCourse)        url += `&course=${encodeURIComponent(selectedCourse)}`;
      if (searchQuery.trim())    url += `&search=${encodeURIComponent(searchQuery.trim())}`;
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
  }, [selectedModuleId, selectedCourse, searchQuery]);

  const filteredQuizzes = quizzes;

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
    if (starting) return;
    setStarting(true);
    try {
      const caseIds = [...new Set(filteredQuizzes.filter((q) => q.caseId).map((q) => q.caseId._id || q.caseId))];
      const caseMap = {};
      const caseResults = await Promise.allSettled(
        caseIds.map((cid) =>
          fetchWithAuth(`${API_BASE_URL}/api/cases/${cid}`).then((res) =>
            res.ok ? res.json().then((d) => ({ cid, d })) : null
          )
        )
      );
      caseResults.forEach((r) => { if (r.status === 'fulfilled' && r.value) caseMap[r.value.cid] = r.value.d; });
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
      play('start');
      navigate('/mock-exam', { state: { quizzes: selected, count: selected.length, examTimer, casesExpanded: true } });
    } catch {
      notify('Erreur lors du chargement des cas.', 'error');
    } finally { setStarting(false); }
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

        {subscription && subscription.status !== 'active' && (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: '#fff3cd', borderRadius: 12, marginBottom: 16 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>&#128274;</div>
            <h3 style={{ color: '#856404', margin: '0 0 8px' }}>Subscription Required</h3>
            <p style={{ color: '#856404', fontSize: '0.9rem', margin: '0 0 16px' }}>
              A subscription is required to access quizzes. Subscribe to unlock all content for your discipline and year.
            </p>
            <button className="btn-primary" onClick={() => navigate('/pricing')}>View Plans</button>
          </div>
        )}

        {subscription && subscription.status === 'active' && (
        <>
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
                    <button type="button" className="btn-primary exam-start-btn" onClick={handleStartMockExam} disabled={starting}>{starting ? t('quiz.starting', 'Démarrage...') : t('quiz.startMock')}</button>
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
                    {quiz.caseId && <span style={{ display: 'inline-block', background: '#e3f2fd', color: '#04484F', padding: '2px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, marginBottom: '6px' }}>📋 {t('quiz.case')}</span>}
                    <h3>{quiz.question?.questionText?.substring(0, 80) || quiz.quizId}</h3>
                    {quiz.question?.questionImage && (
                      <img src={`${API_BASE_URL}/api/quiz-images/${quiz.question.questionImage}`} alt="Question" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 6, marginTop: 8, marginBottom: 8 }} />
                    )}
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
        </>
        )}
      </div>
    </div>
  );
};

export default QuizPage;
