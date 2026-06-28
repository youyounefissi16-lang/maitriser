import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/modal.css';

const PremiumGateModal = ({ open, onClose }) => {
  const navigate = useNavigate();
  if (!open) return null;

  return (
    <div className="premium-gate-overlay" onClick={onClose}>
      <div className="premium-gate-card" onClick={(e) => e.stopPropagation()}>
        <div className="premium-gate-icon">&#128274;</div>
        <h3 className="premium-gate-title">Premium Content</h3>
        <p className="premium-gate-desc">
          This content requires an active subscription matching your discipline and year.
          Subscribe to get full access to all quizzes, oral exams and books.
        </p>
        <button
          className="premium-gate-btn"
          onClick={() => { navigate('/pricing'); }}
        >
          View Plans
        </button>
        <button className="premium-gate-cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default PremiumGateModal;
