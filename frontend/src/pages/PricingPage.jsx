import React, { useState, useEffect } from 'react';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import { useToast } from '../components/Toast';
import { useNavigate } from 'react-router-dom';
import '../styles/pricing.css';
import '../styles/teal-theme.css';

const PricingPage = () => {
  const notify = useToast();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState('');
  const [subscription, setSubscription] = useState(null);

  const userDiscipline = (() => { try { return localStorage.getItem('userDiscipline') || ''; } catch { return ''; } })();
  const userYear = (() => { try { return localStorage.getItem('userYear') || ''; } catch { return ''; } })();

  useEffect(() => {
    document.title = 'Pricing — MAITRISEZ';
    fetchPlans();
    fetchSubscription();
  }, []);

  const fetchPlans = async () => {
    try {
      let url = `${API_BASE_URL}/api/plans`;
      const params = new URLSearchParams();
      if (userDiscipline) params.set('discipline', userDiscipline);
      if (userYear) params.set('year', userYear);
      const qs = params.toString();
      if (qs) url += `?${qs}`;
      const res = await fetch(url);
      if (res.ok) setPlans(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  const fetchSubscription = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/payments/subscription`);
      if (res.ok) {
        const data = await res.json();
        setSubscription(data.subscription);
      }
    } catch { /* ignore */ }
  };

  const handleRedeem = async () => {
    if (!redeemCode.trim()) return;
    setRedeeming(true);
    setRedeemError('');
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/payments/redeem-code`, {
        method: 'POST',
        body: JSON.stringify({ code: redeemCode.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        notify(`Subscription activated! Welcome to ${data.planName}`, 'success');
        setRedeemCode('');
        fetchSubscription();
      } else {
        setRedeemError(data.message || 'Invalid code');
      }
    } catch {
      setRedeemError('Network error');
    } finally {
      setRedeeming(false);
    }
  };

  const hasActiveSub = subscription?.status === 'active' && new Date(subscription.endDate) > new Date();

  return (
    <div className="page-teal">
      <div className="pricing-page">
        {hasActiveSub && (
          <div style={{ textAlign: 'center', padding: '16px', background: '#dcfce7', borderRadius: 12, marginBottom: 24, color: '#166534', fontWeight: 600, fontSize: '0.9rem' }}>
            &#10003; You have an active subscription: {subscription.planName} (expires {new Date(subscription.endDate).toLocaleDateString()})
          </div>
        )}

        <div className="pricing-redeem-section">
          <div className="pricing-redeem-icon">&#127934;</div>
          <h2 className="pricing-redeem-title">Have a subscription code?</h2>
          <p className="pricing-redeem-desc">Enter your code below to activate your plan instantly.</p>
          <div className="pricing-redeem-input-row">
            <input
              type="text"
              className="pricing-redeem-input"
              placeholder="Enter code (e.g. MED3-A7F3K2)"
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
              disabled={redeeming}
            />
            <button className="pricing-redeem-btn" onClick={handleRedeem} disabled={redeeming || !redeemCode.trim()}>
              {redeeming ? '...' : 'Activate'}
            </button>
          </div>
          {redeemError && <p className="pricing-redeem-error">{redeemError}</p>}
        </div>

        <div className="pricing-divider">&#8212; or browse available plans &#8212;</div>

        {!userDiscipline || !userYear ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#888', fontSize: '0.9rem' }}>
            Set your discipline and year in your profile to see available plans.
            <br />
            <button className="btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/profile')}>Go to Profile</button>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#888' }}>Loading plans...</div>
        ) : plans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#888', fontSize: '0.9rem' }}>
            No plans available for your discipline and year yet.
            <br />
            <span style={{ fontSize: '0.8rem' }}>Contact the administrator for more information.</span>
          </div>
        ) : (
          <div className="pricing-grid">
            {plans.map((plan) => (
              <div key={plan._id} className="pricing-card">
                <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>&#11088;</div>
                <h3 className="pricing-card-name">{plan.name}</h3>
                <p className="pricing-card-meta">
                  {plan.discipline === 'medicine' ? 'Medicine' : 'Pharmacy'} Year {plan.year} &mdash; {plan.interval === 'year' ? 'Yearly' : 'Monthly'}
                </p>

                <ul className="pricing-card-features">
                  <li className={`pricing-card-feature ${plan.included?.quizzes ? 'included' : 'excluded'}`}>
                    {plan.included?.quizzes ? '&#10003;' : '&#8212;'} Quizzes
                  </li>
                  <li className={`pricing-card-feature ${plan.included?.voiceExams ? 'included' : 'excluded'}`}>
                    {plan.included?.voiceExams ? '&#10003;' : '&#8212;'} Oral Exams
                  </li>
                  <li className={`pricing-card-feature ${plan.included?.books ? 'included' : 'excluded'}`}>
                    {plan.included?.books ? '&#10003;' : '&#8212;'} Books
                  </li>
                </ul>

                <button
                  className="pricing-card-btn"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      const subject = encodeURIComponent(`Subscription request: ${plan.name}`);
                      window.open(`/contact?subject=${subject}`, '_self');
                    }
                  }}
                >
                  Contact Admin
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PricingPage;
