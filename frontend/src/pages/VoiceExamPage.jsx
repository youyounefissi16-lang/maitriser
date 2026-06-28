import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import VoiceExam from '../components/VoiceExam.jsx';
import PremiumBadge from '../components/PremiumBadge';
import PremiumGateModal from '../components/PremiumGateModal';
import { SkeletonCard, SkeletonFilters } from '../components/LoadingSkeleton';
import { logger } from '../utils/logger';
import '../styles/teal-theme.css';

const VoiceExamPage = () => {
  const navigate = useNavigate();
  const notify = useToast();
  const [modules, setModules]                     = useState([]);
  const [filteredModules, setFilteredModules]     = useState([]);
  const [selectedModuleId, setSelectedModuleId]   = useState('');
  const [exams, setExams]                         = useState([]);
  const [activeExam, setActiveExam]               = useState(null);
  const [loadingModules, setLoadingModules]       = useState(true);
  const [loadingExams, setLoadingExams]           = useState(true);
  const [modulesError, setModulesError]           = useState(null);
  const [examsError, setExamsError]               = useState(null);
  const [freeTrialUsed, setFreeTrialUsed]         = useState(null);
  const [trialStarting, setTrialStarting]         = useState(false);
  const [showPremiumGate, setShowPremiumGate]     = useState(false);
  const [subscription, setSubscription]           = useState(null);

  useEffect(() => { fetchModules(); }, []);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/users/profile`);
        if (res.ok) { const d = await res.json(); setFreeTrialUsed(d.user?.freeTrialUsed ?? null); }
      } catch { /* ignore */ }
    })();
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
  }, [modules]);
  useEffect(() => {
    const controller = new AbortController();
    fetchExams(controller.signal);
    return () => controller.abort();
  }, [selectedModuleId]);

  const fetchModules = async () => {
    setLoadingModules(true);
    setModulesError(null);
    try {
      const discipline = localStorage.getItem('userDiscipline') || 'medicine';
      const url = `${API_BASE_URL}/api/modules?discipline=${discipline}`;
      const res = await fetchWithAuth(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setModules(await res.json());
    } catch (err) {
      logger.error({ err }, 'VoiceExamPage fetchModules failed');
      setModulesError(err.message);
    } finally {
      setLoadingModules(false);
    }
  };

  const fetchExams = useCallback(async (signal) => {
    setLoadingExams(true);
    setExamsError(null);
    try {
      const year = localStorage.getItem('userYear') || '';
      const params = new URLSearchParams();
      if (year)  params.set('year', year);
      if (selectedModuleId)   params.set('moduleId', selectedModuleId);
      let url = `${API_BASE_URL}/api/voice-exams?${params.toString()}`;
      const res = await fetchWithAuth(url, signal ? { signal } : undefined);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setExams(await res.json());
    } catch (err) {
      if (err.name === 'AbortError') return;
      logger.error({ err }, 'VoiceExamPage fetchExams failed');
      setExamsError(err.message);
    } finally {
      setLoadingExams(false);
    }
  }, [selectedModuleId]);

  const handleExamClick = async (exam) => {
    if (!exam.premium) { setActiveExam(exam); return; }
    // Check subscription
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/payments/subscription`);
      if (res.ok) {
        const d = await res.json();
        if (d.subscription?.status === 'active' && new Date(d.subscription.endDate) > new Date()) {
          setActiveExam(exam);
          return;
        }
      }
    } catch { /* ignore */ }
    // No subscription — check free trial
    if (!freeTrialUsed) {
      const confirmed = window.confirm('🎁 Start your free premium oral exam?\n\nYou have one free trial. After this, subscribe to access premium oral exams.');
      if (!confirmed) return;
      setTrialStarting(true);
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/voice-exams/start-free-trial`, { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          setFreeTrialUsed(true);
          setActiveExam(data.exam || exam);
        } else {
          const d = await res.json();
          notify(d.message || 'Failed to start trial', 'error');
        }
      } catch { notify('Network error', 'error'); }
      finally { setTrialStarting(false); }
    } else {
      setShowPremiumGate(true);
    }
  };

  const handleStartFreeTrial = async () => {
    setTrialStarting(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/voice-exams/start-free-trial`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setFreeTrialUsed(true);
        setActiveExam(data.exam);
      } else {
        const d = await res.json();
        notify(d.message || 'No premium exams available', 'error');
      }
    } catch { notify('Network error', 'error'); }
    finally { setTrialStarting(false); }
  };

  if (activeExam) {
    return (
      <div className="page-teal">
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <VoiceExam exam={activeExam} onBack={() => setActiveExam(null)} />
        </div>
      </div>
    );
  }

  const hasPremiumExams = exams.some((e) => e.premium);

  // When list is empty due to subscription gate, still show trial hero
  const showTrialHero = freeTrialUsed === false && (hasPremiumExams || (exams.length === 0 && !loadingExams && !examsError));
  const hasAnyExams = hasPremiumExams || exams.length > 0;

  return (
    <div className="page-teal">
      <div className="card-teal">
        <h2>🎙️ Examens Oraux</h2>

        {showTrialHero && (
          <div className="voice-trial-hero">
            <div className="voice-trial-content">
              <span className="voice-trial-icon">🎁</span>
              <div>
                <h3 className="voice-trial-title">Try a Premium Oral Exam — Free</h3>
                <p className="voice-trial-desc">
                  Get one free premium oral exam. No subscription needed.
                </p>
              </div>
            </div>
            <button className="voice-trial-btn" onClick={handleStartFreeTrial} disabled={trialStarting}>
              {trialStarting ? 'Starting...' : 'Start Free Trial'}
            </button>
          </div>
        )}

        {modulesError ? (
          <div className="empty-state" style={{ color: '#e74c3c' }}>
            <p>Erreur lors du chargement : {modulesError}</p>
            <button type="button" className="btn-primary" onClick={fetchModules} style={{ marginTop: '12px' }}>Réessayer</button>
          </div>
        ) : loadingModules ? (
          <SkeletonFilters count={2} />
        ) : (
          <div className="filters-row">
            <select value={selectedModuleId} onChange={(e) => setSelectedModuleId(e.target.value)}>
              <option value="">Toutes les Spécialités</option>
              {filteredModules.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
            </select>
          </div>
        )}

        {examsError ? (
          <div className="empty-state" style={{ color: '#e74c3c' }}>
            <p>Erreur lors du chargement des examens : {examsError}</p>
            <button type="button" className="btn-primary" onClick={fetchExams} style={{ marginTop: '12px' }}>Réessayer</button>
          </div>
        ) : loadingExams ? (
          <div className="grid-cards"><SkeletonCard count={6} /></div>
        ) : exams.length === 0 && subscription?.status === 'active' ? (
          <div className="empty-state">
            <p>Aucun examen oral pour cette sélection.</p>
            <p style={{ color: '#888', fontSize: '13px', marginTop: '4px' }}>Essayez de modifier les filtres ou de sélectionner d'autres critères.</p>
          </div>
        ) : exams.length === 0 && freeTrialUsed !== null && subscription?.status !== 'active' ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: '#fff3cd', borderRadius: 12, marginBottom: 16 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>&#128274;</div>
            <h3 style={{ color: '#856404', margin: '0 0 8px' }}>Subscription Required</h3>
            <p style={{ color: '#856404', fontSize: '0.9rem', margin: '0 0 16px' }}>
              A subscription is required to access oral exams. Subscribe to unlock all content for your discipline and year.
            </p>
            <button className="btn-primary" onClick={() => navigate('/pricing')}>View Plans</button>
          </div>
        ) : (
          <div className="grid-cards">
            {exams.map((exam) => (
              <div key={exam._id} className="card-item" onClick={() => handleExamClick(exam)}>
                <p style={{ fontSize: '11px', color: '#f97316', fontWeight: 'bold', margin: '0 0 4px' }}>EXAMEN ORAL</p>
                <div className="card-title" style={{ marginBottom: '4px' }}>{exam.title}</div>
                <div className="card-meta">Année {exam.year} — {exam.moduleId?.name || ''}</div>
                {exam.premium && <PremiumBadge />}
              </div>
            ))}
          </div>
        )}
      </div>
      <PremiumGateModal open={showPremiumGate} onClose={() => setShowPremiumGate(false)} />
    </div>
  );
};

export default VoiceExamPage;
