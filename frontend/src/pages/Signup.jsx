import React from 'react';
import { SignUp } from "@clerk/react";
import { useTranslation } from '../context/LanguageContext';
import '../styles/pagesStyle/login.css';
import '../styles/teal-theme.css';

const Signup = () => {
  const { t } = useTranslation();
  return (
    <div className="page-teal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div className="login-container">
        <div className="login-form">
          <SignUp fallbackRedirectUrl="/" signInUrl="/login"
            appearance={{
              elements: {
                card: { boxShadow: 'none', width: '100%' },
                headerTitle: { display: 'none' },
                headerSubtitle: { display: 'none' },
                socialButtonsBlockButton: { borderRadius: 6 },
                formButtonPrimary: { background: 'rgb(56, 56, 232)', borderRadius: 6 },
                footerActionLink: { color: 'rgb(56, 56, 232)' },
              },
            }}
          />
        </div>
        <div className="vertical-line"></div>
        <div className="description">
          <h2>{t('signup.title')}</h2>
          <p>{t('signup.subtitle')}</p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
