import React, { useState, useEffect, useRef } from 'react';
import { authFetch } from '../config/authFetch';
import { FaTrash, FaEdit } from 'react-icons/fa';
import { useToast } from '../components/Toast';
import { useSound } from '../context/SoundContext';
import ConfirmModal from '../components/ConfirmModal';
import Spinner from '../components/Spinner';
import { logger } from '../utils/logger';
import '../styles/sharedAdmin.css';

const YEARS = [1, 2, 3, 4, 5, 6, 7];

const ModuleManagement = () => {
  const notify = useToast();
  const play = useSound();
  const [modules, setModules]       = useState([]);
  const [filterYear, setFilterYear] = useState('');
  const [name, setName]             = useState('');
  const [year, setYear]             = useState('');
  const [courses, setCourses]       = useState([]);
  const [editId, setEditId]         = useState(null);
  const [showCourseInput, setShowCourseInput] = useState(false);
  const [newCourse, setNewCourse]   = useState('');
  const [csvImporting, setCsvImporting] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchModules = async () => {
    const url = filterYear ? `/api/modules?year=${filterYear}` : '/api/modules';
    try {
      setLoading(true);
      const res  = await authFetch(url);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (Array.isArray(data)) setModules(data);
      else setModules([]);
      setError('');
    } catch (e) { logger.error({ err: e }, 'ModuleManagement fetchModules failed'); setModules([]); setError('Failed to load modules'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchModules(); }, [filterYear]);

  const removeCourse = (idx) => setCourses((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    play('submit');
    if (submittingRef.current) return;
    if (!name || !year) return notify('Name and year are required', 'warning');
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const method = editId ? 'PUT' : 'POST';
      const url    = editId ? `/api/modules/${editId}` : '/api/modules';
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, year: Number(year), courses }),
      });
      if (res.ok) { fetchModules(); resetForm(); notify(editId ? 'Module updated' : 'Module created', 'success'); }
      else notify('Operation failed', 'error');
    } catch (err) {
      logger.error({ err }, 'ModuleManagement handleSubmit failed');
      notify('Network error', 'error');
    } finally { submittingRef.current = false; setSubmitting(false); }
  };

  const confirmDelete = async () => {
    play('delete');
    if (!deleteTarget || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await authFetch(`/api/modules/${deleteTarget._id}`, { method: 'DELETE' });
      if (res.ok) { fetchModules(); notify('Module deleted', 'success'); }
      else notify('Failed to delete', 'error');
    } catch (err) {
      logger.error({ err }, 'ModuleManagement confirmDelete failed');
      notify('Network error', 'error');
    }
    setDeleteTarget(null);
    submittingRef.current = false;
    setSubmitting(false);
  };

  const startEdit = (mod) => {
    setEditId(mod._id);
    setName(mod.name);
    setYear(String(mod.year));
    setCourses(mod.courses || []);
    setShowCourseInput(false);
    setNewCourse('');
  };

  const resetForm = () => { setName(''); setYear(''); setCourses([]); setNewCourse(''); setShowCourseInput(false); setEditId(null); };

  const handleCSVImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      setCsvImporting(true);
      const res    = await authFetch('/api/import-modules-csv', { method: 'POST', body: formData });
      const result = res.ok ? await res.json() : null;
      notify(result?.message || 'Import finished', res.ok ? 'success' : 'error');
      fetchModules();
    } catch (err) { logger.error({ err }, 'ModuleManagement CSV import failed'); notify('Failed to import CSV', 'error'); }
    finally { setCsvImporting(false); e.target.value = ''; }
  };

  const grouped = YEARS.reduce((acc, y) => { acc[y] = modules.filter((m) => m.year === y); return acc; }, {});

  if (loading) return <div className="admin-page"><h2>Module Management</h2><Spinner /></div>;

  return (
    <div className="admin-page">
      <h2>Module Management</h2>

      {error && <div className="error-banner">{error}<button onClick={() => setError('')}>&times;</button></div>}

      <div className="csv-import-bar">
        <strong>Import CSV</strong>
        <input type="file" accept=".csv" onChange={handleCSVImport} disabled={csvImporting} />
        {csvImporting && <span style={{ color: 'var(--dc-accent)', fontStyle: 'italic' }}>Importing...</span>}
      </div>

      <div className="admin-form-card">
        <h3>{editId ? 'Edit Module' : 'Add Module'}</h3>
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input type="text" placeholder="Module name (e.g. Anatomy)" value={name} onChange={(e) => setName(e.target.value)} />
          <select value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="">-- Select Year --</option>
            {YEARS.map((y) => <option key={y} value={y}>Year {y}</option>)}
          </select>

          <div>
            <label style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: 4 }}>Courses</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              {courses.map((c, i) => (
                <span key={i} className="year-tag">
                  {c}
                  <button type="button" onClick={() => removeCourse(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dc-highlight)', fontSize: '0.8rem', padding: 0 }}>&times;</button>
                </span>
              ))}
              {courses.length === 0 && !showCourseInput && <span style={{ color: 'var(--dc-text-muted)', fontSize: '0.85rem' }}>No courses added yet.</span>}
              {showCourseInput ? (
                <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                  <input type="text" value={newCourse} onChange={(e) => setNewCourse(e.target.value)} placeholder="Course name" style={{ width: 120 }} onKeyDown={(e) => { if (e.key === 'Escape') { setShowCourseInput(false); setNewCourse(''); } }} />
                  <button type="button" onClick={() => { const c = newCourse.trim(); if (!c) return; if (courses.includes(c)) notify('Course already added', 'warning'); else { setCourses((prev) => [...prev, c]); setNewCourse(''); setShowCourseInput(false); } }} style={{ padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer' }}>OK</button>
                  <button type="button" onClick={() => { setShowCourseInput(false); setNewCourse(''); }} style={{ padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer', background: 'none', border: 'none', color: '#888' }}>X</button>
                </span>
              ) : (
                <button type="button" onClick={() => setShowCourseInput(true)} style={{ padding: '4px 10px', fontSize: '0.8rem', cursor: 'pointer', border: '1px dashed var(--dc-accent-light)', borderRadius: 14, background: 'transparent', color: 'var(--dc-accent)' }}>+ Add</button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={submitting}>{editId ? 'Update' : 'Add Module'}</button>
            {editId && <button type="button" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ marginRight: 8, fontWeight: 'bold', color: 'var(--dc-dark)' }}>Filter by Year:</label>
        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
          <option value="">All Years</option>
          {YEARS.map((y) => <option key={y} value={y}>Year {y}</option>)}
        </select>
      </div>

      {YEARS.filter((y) => !filterYear || Number(filterYear) === y).map((y) =>
        grouped[y].length > 0 ? (
          <div key={y} style={{ marginBottom: 20 }}>
            <h4 style={{ borderBottom: '2px solid var(--dc-accent)', paddingBottom: 4, color: 'var(--dc-accent)' }}>Year {y}</h4>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Module Name</th>
                    <th>Courses</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped[y].map((mod) => (
                    <tr key={mod._id}>
                      <td style={{ padding: 8, borderBottom: '1px solid var(--dc-border)' }}>{mod.name}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid var(--dc-border)' }}>
                        {(mod.courses || []).length > 0 ? mod.courses.join(', ') : '—'}
                      </td>
                      <td style={{ padding: 8, borderBottom: '1px solid var(--dc-border)' }}>
                        <button onClick={() => startEdit(mod)} style={{ marginRight: 8 }}><FaEdit /></button>
                        <button onClick={() => setDeleteTarget(mod)}><FaTrash /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null
      )}
      {modules.length === 0 && !loading && <p style={{ color: 'var(--dc-text-muted)' }}>No modules yet.</p>}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Module"
        message={`Delete ${deleteTarget?.name || 'this module'}?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmText="Delete"
        confirmDisabled={submitting}
      />
    </div>
  );
};

export default ModuleManagement;
