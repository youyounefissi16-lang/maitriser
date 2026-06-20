import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from "@clerk/react";
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const AdminProtectedRoute = () => {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [synced, setSynced] = useState(false);
  const [role, setRole] = useState(localStorage.getItem('adminRole'));

  useEffect(() => {
    if (!isSignedIn || !isLoaded || synced) return;
    let aborted = false;
    const sync = async () => {
      try {
        let token = await getToken();
        if (!token) {
          for (let i = 0; i < 10; i++) {
            await new Promise((r) => setTimeout(r, 300));
            if (aborted) return;
            token = await getToken();
            if (token) break;
          }
        }
        if (!token) throw new Error('No token');
        if (aborted) return;
        const res = await axios.post(`${API_BASE_URL}/api/auth/clerk-sync`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (aborted) return;
        localStorage.setItem('adminRole', res.data.role);
        setRole(res.data.role);
      } catch {}
      if (!aborted) setSynced(true);
    };
    sync();
    return () => { aborted = true; };
  }, [isSignedIn, isLoaded, getToken]);

  if (!isLoaded) return <div style={{ padding: 24 }}>Vérification…</div>;
  if (!isSignedIn) return <Navigate to="/logging" replace />;
  if (!synced) return <div style={{ padding: 24 }}>Syncing account…</div>;
  if (role !== 'admin') return <Navigate to="/admin-setup" replace />;
  return <Outlet />;
};

export default AdminProtectedRoute;
