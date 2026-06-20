import React from 'react';
import { SignUp } from "@clerk/react";
import '../styles/adminLogin.css';

const AdminSignup = () => {
  return (
    <div className="form-container">
      <div className="form">
        <h2 style={{ textAlign: 'center', marginBottom: 20 }}>Admin Signup</h2>
        <SignUp signInUrl="/logging" fallbackRedirectUrl="/admin-setup"
          appearance={{
            elements: {
              card: { boxShadow: 'none', width: '100%' },
              headerTitle: { display: 'none' },
              headerSubtitle: { display: 'none' },
              socialButtonsBlockButton: { borderRadius: 6 },
              formButtonPrimary: { background: '#0C4A4A', borderRadius: 6, '&:hover': { background: '#14a3a8' } },
              footerActionLink: { color: '#0C4A4A' },
            },
          }}
        />
      </div>
    </div>
  );
};

export default AdminSignup;
