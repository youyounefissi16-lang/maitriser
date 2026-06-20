import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL, authHeaders } from '../config/api';
import VoiceExam from '../components/VoiceExam.jsx';
import { SkeletonCard, SkeletonFilters } from '../components/LoadingSkeleton';
import '../styles/teal-theme.css';

const YEARS = [1, 2, 3, 4, 5, 6, 7];

const VoiceExamPage = () => {
  const [modules, setModules]                     = useState([]);
  const [filteredModules, setFilteredModules]     = useState([]);
  const [selectedYear, setSelectedYear]           = useState('');
  const [selectedModuleId, setSelectedModuleId]   = useState('');
  const [exams, setExams]                         = useState([]);
  const [activeExam, setActiveExam]               = useState(null);
  const [loadingModules, setLoadingModules]       = useState(true);
  const [loadingExams, setLoadingExams]           = useState(true);
  const [modulesError, setModulesError]           = useState(null);
  const [examsError, setExamsError]               = useState(null);

  useEffect(() => { fetchModules(); }, []);
  useEffect(() => {
    setFilteredModules(selectedYear ? modules.filter((m) => m.year === Number(selectedYear)) : modules);
    setSelectedModuleId('');
  }, [selectedYear, modules]);
  useEffect(() => { fetchExams(); }, [selectedYear, selectedModuleId]);

  const fetchModules = async () => {
    setLoadingModules(true);
    setModulesError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/modules`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setModules(await res.json());
    } catch (err) {
      setModulesError(err.message);
    } finally {
      setLoadingModules(false);
    }
  };

  const fetchExams = useCallback(async () => {
    setLoadingExams(true);
    setExamsError(null);
    try {
      let url = `${API_BASE_URL}/api/voice-exams?`;
      if (selectedModuleId)  url += `moduleId=${selectedModuleId}`;
      else if (selectedYear) url += `year=${selectedYear}`;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setExams(await res.json());
    } catch (err) {
      setExamsError(err.message);
    } finally {
      setLoadingExams(false);
    }
  }, [selectedYear, selectedModuleId]);

  if (activeExam) {
    return (
      <div className="page-teal">
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <VoiceExam exam={activeExam} onBack={() => setActiveExam(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="page-teal">
      <div className="card-teal">
        <h2>🎙️ Examens Oraux</h2>

        {modulesError ? (
          <div className="empty-state" style={{ color: '#e74c3c' }}>
            <p>Erreur lors du chargement : {modulesError}</p>
            <button type="button" className="btn-primary" onClick={fetchModules} style={{ marginTop: '12px' }}>Réessayer</button>
          </div>
        ) : loadingModules ? (
          <SkeletonFilters count={2} />
        ) : (
          <div className="filters-row">
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
              <option value="">Toutes les Années</option>
              {YEARS.map((y) => <option key={y} value={y}>Année {y}</option>)}
            </select>
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
        ) : exams.length === 0 ? (
          <div className="empty-state">
            <p>Aucun examen oral pour cette sélection.</p>
            <p style={{ color: '#888', fontSize: '13px', marginTop: '4px' }}>Essayez de modifier les filtres ou de sélectionner d'autres critères.</p>
          </div>
        ) : (
          <div className="grid-cards">
            {exams.map((exam) => (
              <div key={exam._id} className="card-item" onClick={() => setActiveExam(exam)}>
                <p style={{ fontSize: '11px', color: '#f97316', fontWeight: 'bold', margin: '0 0 4px' }}>EXAMEN ORAL</p>
                <div className="card-title" style={{ marginBottom: '4px' }}>{exam.title}</div>
                <div className="card-meta">Année {exam.year} — {exam.moduleId?.name || ''}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceExamPage;
