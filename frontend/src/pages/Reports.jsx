import React, { useState, useEffect } from 'react';
import { authFetch } from '../config/authFetch';
import Spinner from '../components/Spinner';
import { logger } from '../utils/logger';
import '../styles/Reports.css';

const Reports = () => {
  useEffect(() => { document.title = 'Reports — Admin'; }, []);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await authFetch('/api/dashboard-stats');
        if (!res.ok) throw new Error('Failed to fetch stats');
        const data = await res.json();
        setStats(data);
      } catch (err) {
        logger.error({ err }, 'Reports fetchStats failed');
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="reports"><h2>Reports</h2><Spinner /></div>;

  return (
    <div className="reports">
      <h2>Reports</h2>
      {error && <div className="error-banner">{error}</div>}
      {!error && <div className="report-section">
        <div className="report-card">
          <h3>Total Users</h3>
          <p>{stats?.users ?? 0}</p>
        </div>
        <div className="report-card">
          <h3>Total Quizzes</h3>
          <p>{stats?.quizzes ?? 0}</p>
        </div>
        <div className="report-card">
          <h3>Total Attempts</h3>
          <p>{stats?.attempts ?? 0}</p>
        </div>
        <div className="report-card">
          <h3>Pass Rate</h3>
          <p>{stats?.passRate ?? 0}%</p>
        </div>
      </div>}
    </div>
  );
};

export default Reports;
