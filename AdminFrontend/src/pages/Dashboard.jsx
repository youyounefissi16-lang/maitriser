import React, { useState, useEffect } from "react";
import { authFetch } from '../config/authFetch';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import Spinner from '../components/Spinner';
import '../styles/Dashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const StatCard = ({ label, value, color }) => (
  <div className="stat-card">
    <h3>{label}</h3>
    <p>{value}</p>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboardStats = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await authFetch('/api/dashboard-stats');
      if (!response.ok) throw new Error("Failed to fetch dashboard stats");
      setStats(await response.json());
    } catch (error) {
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboardStats(); }, []);

  if (loading) return <div className="dashboard"><Spinner text="Loading dashboard..." /></div>;

  if (error) return (
    <div className="dashboard" style={{ textAlign: 'center', paddingTop: 60 }}>
      <p style={{ color: '#e74c3c', marginBottom: 16 }}>{error}</p>
      <button className="btn-primary" onClick={fetchDashboardStats}
        style={{ padding: '10px 24px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
        Réessayer
      </button>
    </div>
  );

  const barData = {
    labels: ['Users', 'Quizzes', 'Modules', 'Cases', 'Voice Exams', 'Books', 'Contacts'],
    datasets: [{
      label: 'Count',
      data: [stats.users, stats.quizzes, stats.modules, stats.cases, stats.voiceExams, stats.books, stats.contacts],
      backgroundColor: [
        'rgba(0, 123, 255, 0.6)', 'rgba(40, 167, 69, 0.6)', 'rgba(255, 193, 7, 0.6)',
        'rgba(111, 66, 193, 0.6)', 'rgba(23, 162, 184, 0.6)', 'rgba(253, 126, 20, 0.6)',
        'rgba(108, 117, 125, 0.6)',
      ],
      borderColor: [
        'rgba(0, 123, 255, 1)', 'rgba(40, 167, 69, 1)', 'rgba(255, 193, 7, 1)',
        'rgba(111, 66, 193, 1)', 'rgba(23, 162, 184, 1)', 'rgba(253, 126, 20, 1)',
        'rgba(108, 117, 125, 1)',
      ],
      borderWidth: 1,
    }],
  };

  const passData = {
    labels: ['Pass Rate'],
    datasets: [{
      label: '%',
      data: [stats.passRate],
      backgroundColor: ['rgba(0, 123, 255, 0.6)'],
      borderColor: ['rgba(0, 123, 255, 1)'],
      borderWidth: 1,
    }],
  };

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>

      <h3 style={{ margin: '20px 0 10px', fontSize: 14, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Utilisateurs & Examens</h3>
      <div className="stats-container">
        <StatCard label="Users" value={stats.users} />
        <StatCard label="Quiz Attempts" value={stats.attempts} />
        <StatCard label="Voice Results" value={stats.voiceResults} />
        <StatCard label="Pass Rate" value={`${stats.passRate}%`} />
      </div>

      <h3 style={{ margin: '20px 0 10px', fontSize: 14, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Contenu</h3>
      <div className="stats-container">
        <StatCard label="Quizzes" value={stats.quizzes} />
        <StatCard label="Drafts" value={stats.drafts} />
        <StatCard label="Published" value={stats.published} />
        <StatCard label="Modules" value={stats.modules} />
        <StatCard label="Cases" value={stats.cases} />
        <StatCard label="Voice Exams" value={stats.voiceExams} />
        <StatCard label="Books" value={stats.books} />
        <StatCard label="Messages" value={stats.contacts} />
      </div>

      <div className="chart-section">
        <div className="chart">
          <h3>Platform Content</h3>
          <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
        </div>
        <div className="chart">
          <h3>Pass Rate</h3>
          <Bar data={passData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { max: 100 } } }} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;