import React, { useState } from 'react';
import { useAuth } from '@clerk/react';
import FeedbackModal from './FeedbackModal';

const btnStyle = {
  position: 'fixed',
  bottom: 24,
  right: 24,
  width: 52,
  height: 52,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #04484F, #03383E)',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  fontSize: 22,
  zIndex: 9998,
  boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'transform 0.2s',
};

const FeedbackButton = () => {
  const { isSignedIn } = useAuth();
  const [open, setOpen] = useState(false);

  if (!isSignedIn) return null;

  return (
    <>
      <button
        style={btnStyle}
        onClick={() => setOpen(true)}
        title="Send feedback"
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
      {open && <FeedbackModal onClose={() => setOpen(false)} />}
    </>
  );
};

export default FeedbackButton;
