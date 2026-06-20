import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from "@clerk/react";

const ProtectedRoute = () => {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return <div className="page-teal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px' }}>Loading...</div>;
  return isSignedIn ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;
