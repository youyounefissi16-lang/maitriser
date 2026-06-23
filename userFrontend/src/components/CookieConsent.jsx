import React, { useState, useEffect } from 'react';
import '../styles/teal-theme.css';

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-consent" role="alert" aria-live="polite">
      <p className="cookie-consent-text">
        Ce site utilise des cookies essentiels à son fonctionnement. En continuant, vous acceptez leur utilisation.
      </p>
      <button className="btn-primary cookie-consent-btn" onClick={accept}>Accepter</button>
    </div>
  );
};

export default CookieConsent;
