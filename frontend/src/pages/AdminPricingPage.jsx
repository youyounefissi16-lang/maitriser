import React, { useState, useEffect, useRef } from 'react';
import { authFetch } from '../config/authFetch';
import { useToast } from '../components/Toast';
import { useSound } from '../context/SoundContext';
import ConfirmModal from '../components/ConfirmModal';
import Spinner from '../components/Spinner';
import { logger } from '../utils/logger';
import '../styles/adminPricing.css';

const YEARS = [1, 2, 3, 4, 5, 6, 7];

const emptyPlan = () => ({
  name: '', discipline: 'medicine', year: 1,
  included: { quizzes: true, voiceExams: false, books: true },
  interval: 'month', isActive: true, sortOrder: 0,
});

const AdminPricingPage = () => {
  const notify = useToast();
  const play = useSound();
  const [tab, setTab] = useState('plans');
  const [plans, setPlans] = useState([]);
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [planForm, setPlanForm] = useState(emptyPlan());
  const [editPlanId, setEditPlanId] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genPlanId, setGenPlanId] = useState('');
  const [genCount, setGenCount] = useState(5);
  const [genExpiry, setGenExpiry] = useState('');
  const [genNotes, setGenNotes] = useState('');
  const [genResult, setGenResult] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [dailyCount, setDailyCount] = useState(5);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailySaving, setDailySaving] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', onConfirm: null });

  useEffect(() => { document.title = 'Pricing — Admin'; fetchPlans(); }, []);

  const genTimer = useRef(null);
  useEffect(() => {
    if (genPlanId && genCount >= 1 && showGenModal) {
      if (genTimer.current) clearTimeout(genTimer.current);
      genTimer.current = setTimeout(() => autoGenerate(), 400);
    }
    return () => { if (genTimer.current) clearTimeout(genTimer.current); };
  }, [genPlanId, genCount, showGenModal]);

  const autoGenerate = async () => {
    setGenerating(true);
    try {
      const res = await authFetch('/api/admin/subscription-codes/generate', {
        method: 'POST',
        body: JSON.stringify({ planId: genPlanId, count: genCount, expiresAt: genExpiry || null, notes: genNotes }),
      });
      if (res.ok) {
        const data = await res.json();
        setGenResult(data.codes || []);
        fetchCodes();
      } else { const d = await res.json(); notify(d.message || 'Error', 'error'); }
    } catch { notify('Network error', 'error'); }
    finally { setGenerating(false); }
  };

  const fetchPlans = async () => {
    try {
      const res = await authFetch('/api/admin/plans');
      if (res.ok) setPlans(await res.json());
    } catch { notify('Failed to load plans', 'error'); }
    setLoading(false);
  };

  const fetchCodes = async () => {
    try {
      const res = await authFetch('/api/admin/subscription-codes');
      if (res.ok) setCodes(await res.json());
    } catch { notify('Failed to load codes', 'error'); }
  };

  useEffect(() => { if (tab === 'codes') fetchCodes(); }, [tab]);
  useEffect(() => { if (tab === 'daily') { setDailyLoading(true); fetchDailyConfig(); } }, [tab]);

  const fetchDailyConfig = async () => {
    try {
      const res = await authFetch('/api/admin/daily-config');
      if (res.ok) { const data = await res.json(); setDailyCount(Number(data.value) || 5); }
    } catch { notify('Failed to load daily config', 'error'); }
    finally { setDailyLoading(false); }
  };

  const handleSaveDailyConfig = async () => {
    setDailySaving(true);
    play('submit');
    try {
      const res = await authFetch('/api/admin/daily-config', { method: 'PUT', body: JSON.stringify({ value: dailyCount }) });
      if (res.ok) { notify('Daily quiz count updated', 'success'); }
      else { const d = await res.json(); notify(d.message || 'Error', 'error'); }
    } catch { notify('Network error', 'error'); }
    finally { setDailySaving(false); }
  };

  const openEditPlan = (plan) => {
    setEditPlanId(plan._id);
    setPlanForm({
      name: plan.name || '',
      discipline: plan.discipline || 'medicine',
      year: plan.year || 1,
      included: { ...{ quizzes: true, voiceExams: false, books: true }, ...plan.included },
      interval: plan.interval || 'month',
      isActive: plan.isActive !== false,
      sortOrder: plan.sortOrder || 0,
    });
    setShowPlanModal(true);
  };

  const handleSavePlan = async () => {
    if (!planForm.name.trim()) return notify('Name is required', 'warning');
    setSaving(true);
    play('submit');
    try {
      const url = editPlanId ? `/api/admin/plans/${editPlanId}` : '/api/admin/plans';
      const method = editPlanId ? 'PUT' : 'POST';
      const res = await authFetch(url, { method, body: JSON.stringify(planForm) });
      if (res.ok) { notify(editPlanId ? 'Plan updated' : 'Plan created', 'success'); setShowPlanModal(false); fetchPlans(); }
      else { const d = await res.json(); notify(d.message || 'Error', 'error'); }
    } catch { notify('Network error', 'error'); }
    finally { setSaving(false); }
  };

  const handleDeletePlan = async (id) => {
    setConfirm({ open: true, title: 'Delete Plan', message: 'Delete this plan?', onConfirm: async () => {
      setConfirm(c => ({ ...c, open: false }));
      play('delete');
      try {
        const res = await authFetch(`/api/admin/plans/${id}`, { method: 'DELETE' });
        if (res.ok) { notify('Plan deleted', 'success'); fetchPlans(); }
        else notify('Failed to delete', 'error');
      } catch { notify('Network error', 'error'); }
    }});
  };

  const handleRevokeCode = async (id) => {
    setConfirm({ open: true, title: 'Revoke Code', message: 'Revoke this code?', onConfirm: async () => {
      setConfirm(c => ({ ...c, open: false }));
      play('delete');
      try {
        const res = await authFetch(`/api/admin/subscription-codes/${id}`, { method: 'DELETE' });
        if (res.ok) { notify('Code revoked', 'success'); fetchCodes(); }
        else notify('Failed to revoke', 'error');
      } catch { notify('Network error', 'error'); }
    }});
  };

  const copyCode = (code) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard?.writeText(code);
      notify('Copied!', 'success');
    }
  };

  return (
    <div className="admin-page">
      <h2>Pricing Management</h2>

      <div className="admin-tabs">
        <button className={`admin-tab ${tab === 'plans' ? 'active' : ''}`} onClick={() => setTab('plans')}>Plans</button>
        <button className={`admin-tab ${tab === 'codes' ? 'active' : ''}`} onClick={() => setTab('codes')}>Subscription Codes</button>
        <button className={`admin-tab ${tab === 'daily' ? 'active' : ''}`} onClick={() => setTab('daily')}>Daily Quiz Config</button>
      </div>

      {tab === 'plans' && (
        <>
          <button className="btn-primary" style={{ marginBottom: 16 }} onClick={() => { setEditPlanId(null); setPlanForm(emptyPlan()); setShowPlanModal(true); }}>
            + Create Plan
          </button>

          {loading ? <Spinner text="Loading plans..." /> : plans.length === 0 ? (
            <div className="admin-empty">No plans yet.</div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Discipline</th>
                    <th>Year</th>
                    <th>Included</th>
                    <th>Interval</th>
                    <th>Active</th>
                    <th>Sort</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p) => (
                    <tr key={p._id}>
                      <td>{p.name}</td>
                      <td style={{ textTransform: 'capitalize' }}>{p.discipline}</td>
                      <td>Y{p.year}</td>
                      <td style={{ fontSize: '0.78rem' }}>
                        Q:{p.included?.quizzes ? '&#10003;' : '&#8212;'} V:{p.included?.voiceExams ? '&#10003;' : '&#8212;'} B:{p.included?.books ? '&#10003;' : '&#8212;'}
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{p.interval}</td>
                      <td>{p.isActive ? '&#10003;' : '&#8212;'}</td>
                      <td>{p.sortOrder}</td>
                      <td>
                        <button onClick={() => openEditPlan(p)} style={{ marginRight: 6 }}>&#9998;</button>
                        <button onClick={() => handleDeletePlan(p._id)}>&#128465;</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {showPlanModal && (
            <div className="modal-overlay" onClick={() => !saving && setShowPlanModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
                <h3>{editPlanId ? 'Edit Plan' : 'Create Plan'}</h3>

                <label>Name</label>
                <input type="text" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} disabled={saving} />

                <label>Discipline</label>
                <select value={planForm.discipline} onChange={(e) => setPlanForm({ ...planForm, discipline: e.target.value })} disabled={saving}>
                  <option value="medicine">Medicine</option>
                  <option value="pharmacy">Pharmacy</option>
                </select>

                <label>Year</label>
                <select value={planForm.year} onChange={(e) => setPlanForm({ ...planForm, year: Number(e.target.value) })} disabled={saving}>
                  {YEARS.map((y) => <option key={y} value={y}>Year {y}</option>)}
                </select>

                <label style={{ marginTop: 12, display: 'block', fontWeight: 600, fontSize: '0.85rem' }}>Included Content</label>
                <div style={{ display: 'flex', gap: 16, margin: '6px 0 12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={planForm.included.quizzes} onChange={(e) => setPlanForm({ ...planForm, included: { ...planForm.included, quizzes: e.target.checked } })} disabled={saving} />
                    Quizzes
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={planForm.included.voiceExams} onChange={(e) => setPlanForm({ ...planForm, included: { ...planForm.included, voiceExams: e.target.checked } })} disabled={saving} />
                    Oral Exams
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={planForm.included.books} onChange={(e) => setPlanForm({ ...planForm, included: { ...planForm.included, books: e.target.checked } })} disabled={saving} />
                    Books
                  </label>
                </div>

                <label>Interval</label>
                <select value={planForm.interval} onChange={(e) => setPlanForm({ ...planForm, interval: e.target.value })} disabled={saving}>
                  <option value="month">Monthly</option>
                  <option value="year">Yearly</option>
                </select>

                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label>Sort Order</label>
                    <input type="number" value={planForm.sortOrder} onChange={(e) => setPlanForm({ ...planForm, sortOrder: Number(e.target.value) })} disabled={saving} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', paddingBottom: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input type="checkbox" checked={planForm.isActive} onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })} disabled={saving} />
                      Active
                    </label>
                  </div>
                </div>

                <div className="modal-buttons">
                  <button onClick={() => setShowPlanModal(false)} disabled={saving}>Cancel</button>
                  <button onClick={handleSavePlan} disabled={saving}>{saving ? 'Saving...' : (editPlanId ? 'Update' : 'Create')}</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'codes' && (
        <>
          <button className="btn-primary" style={{ marginBottom: 16 }} onClick={() => { setGenPlanId(''); setGenCount(5); setGenExpiry(''); setGenNotes(''); setGenResult(null); setShowGenModal(true); }}>
            + Generate Codes
          </button>

          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Used By</th>
                  <th>Used At</th>
                  <th>Expires</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {codes.length === 0 ? (
                  <tr><td colSpan="7" className="admin-empty">No codes yet.</td></tr>
                ) : codes.map((c) => (
                  <tr key={c._id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, letterSpacing: '0.5px' }}>{c.code}</td>
                    <td>{c.planId?.name || '—'}</td>
                    <td>
                      <span className={`code-status code-status-${c.status}`}>{c.status}</span>
                    </td>
                    <td>{c.usedBy?.name || c.usedBy?.email || '—'}</td>
                    <td>{c.usedAt ? new Date(c.usedAt).toLocaleDateString() : '—'}</td>
                    <td>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '—'}</td>
                    <td>
                      {c.status === 'active' && <button onClick={() => handleRevokeCode(c._id)}>&#128465;</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showGenModal && (
            <div className="modal-overlay" onClick={() => !generating && setShowGenModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
                <h3>Generate Subscription Codes</h3>
                <label>Plan</label>
                <select value={genPlanId} onChange={(e) => { setGenPlanId(e.target.value); setGenResult(null); }} disabled={generating}>
                  <option value="">— Select Plan —</option>
                  {plans.map((p) => <option key={p._id} value={p._id}>{p.name} — {p.discipline} Y{p.year}</option>)}
                </select>
                <label>Number of Codes</label>
                <input type="number" min="1" max="100" value={genCount} onChange={(e) => { setGenCount(Number(e.target.value)); setGenResult(null); }} disabled={generating} />
                <label>Expires (optional)</label>
                <input type="date" value={genExpiry} onChange={(e) => setGenExpiry(e.target.value)} disabled={generating} />
                <label>Notes (optional)</label>
                <input type="text" value={genNotes} onChange={(e) => setGenNotes(e.target.value)} placeholder="Internal notes" disabled={generating} />

                {generating && <p style={{ textAlign: 'center', color: '#888', margin: '12px 0' }}>Generating codes...</p>}

                {genResult && genResult.length > 0 && (
                  <>
                    <div style={{ maxHeight: 300, overflowY: 'auto', margin: '12px 0' }}>
                      {genResult.map((code, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#f8f8f8', borderRadius: 6, marginBottom: 4, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          <span>&#128196; {code}</span>
                          <button onClick={() => copyCode(code)} style={{ padding: '4px 10px', border: '1px solid #ccc', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: '0.75rem' }}>Copy</button>
      <ConfirmModal
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm(c => ({ ...c, open: false }))}
      />
    </div>
                      ))}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#888', textAlign: 'center' }}>Codes auto-generated. Change plan or count to regenerate.</p>
                  </>
                )}

                <div className="modal-buttons">
                  <button onClick={() => setShowGenModal(false)} disabled={generating}>Close</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'daily' && (
        <div className="admin-card" style={{ maxWidth: 500, marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Daily Quiz Configuration</h3>
          {dailyLoading ? (
            <Spinner text="Loading config..." />
          ) : (
            <>
              <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: 12 }}>
                Set the number of quiz questions shown to each user in their daily quiz.
              </p>
              <label>Questions per day</label>
              <input
                type="number" min="1" max="50"
                value={dailyCount}
                onChange={(e) => setDailyCount(Math.max(1, Number(e.target.value)))}
                disabled={dailySaving}
                style={{ marginBottom: 12 }}
              />
              <button className="btn-primary" onClick={handleSaveDailyConfig} disabled={dailySaving}>
                {dailySaving ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPricingPage;
