import React, { useState, useRef, useEffect, Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { ClerkProvider, useAuth } from "@clerk/react";
import AdminHeader from "./components/adminHeader";
import Sidebar from "./components/adminSidebar";
import AdminProtectedRoute from "./components/AdminProtectedRoute.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { ToastProvider } from "./components/Toast";
import axios from "axios";
import { setToken } from "./utils/tokenStore";
import "./styles/adminTheme.css";
import "./styles/adminStyles.css";
import "./styles/sharedAdmin.css";

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const Dashboard = lazy(() => import("./pages/Dashboard"));
const QuizManagement = lazy(() => import("./pages/QuizManagement.jsx"));
const UserManagement = lazy(() => import("./pages/userManagement"));
const ModuleManagement = lazy(() => import("./pages/ModuleManagement.jsx"));
const AdminProfile = lazy(() => import('./pages/profile.jsx'));
const BookManagement = lazy(() => import("./pages/BookManagement.jsx"));
const VoiceExamManagement = lazy(() => import("./pages/VoiceExamManagement.jsx"));
const Reports = lazy(() => import("./pages/Reports.jsx"));
const AdminLogin = lazy(() => import("./pages/adminLogin.jsx"));
const AdminSignup = lazy(() => import("./pages/AdminSignup.jsx"));
const AdminSetup = lazy(() => import("./pages/AdminSetup.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));

const ClerkAxiosSetup = () => {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [ready, setReady] = useState(false);
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  useEffect(() => {
    if (!isLoaded) return;
    let aborted = false;
    (async () => {
      let token = await getTokenRef.current();
      if (!token && isSignedIn) {
        for (let i = 0; i < 10; i++) {
          await new Promise((r) => setTimeout(r, 300));
          if (aborted) return;
          token = await getTokenRef.current();
          if (token) break;
        }
      }
      if (aborted) return;
      if (token) setToken(token);
      setReady(true);
    })();
    const interceptor = axios.interceptors.request.use(async (config) => {
      const token = await getTokenRef.current();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        setToken(token);
      }
      return config;
    });
    return () => {
      aborted = true;
      axios.interceptors.request.eject(interceptor);
    };
  }, [isLoaded, isSignedIn]);
  if (!ready) return null;
  return null;
};

const AppContent = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  return (
    <ThemeProvider>
      <ToastProvider>
        <ClerkAxiosSetup />
        <div className="admin-app">
          <Suspense fallback={<div className="admin-page" style={{ padding: 60, textAlign: 'center' }}>Chargement…</div>}>
          <Routes>
            {/* Public routes — no header/sidebar */}
            <Route path="/logging" element={<AdminLogin />} />
            <Route path="/Signup"  element={<AdminSignup />} />
            <Route path="/admin-setup" element={<AdminSetup />} />

            {/* Protected admin routes — verified by Clerk + role check */}
            <Route element={<AdminProtectedRoute />}>
              <Route
                path="/*"
                element={
                  <>
                    <AdminHeader toggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
                    <div className="main-content">
                      <Sidebar sidebarOpen={sidebarOpen} />
                      <div className="page-content" style={{ marginLeft: sidebarOpen ? 230 : 60, transition: 'margin-left 0.3s ease' }}>
                        <Routes>
                          <Route path="/dashboard"             element={<Dashboard />} />
                          <Route path="/module-management"     element={<ModuleManagement />} />
                          <Route path="/quiz-management"       element={<QuizManagement />} />
                          <Route path="/user-management"       element={<UserManagement />} />
                          <Route path="/reports"               element={<Reports />} />
                          <Route path="/book-management"       element={<BookManagement />} />
                          <Route path="/voice-exam-management" element={<VoiceExamManagement />} />
                          <Route path="/profile"               element={<AdminProfile />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </div>
                    </div>
                  </>
                }
              />
            </Route>
          </Routes>
          </Suspense>
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
};

const App = () => {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <AppContent />
    </ClerkProvider>
  );
};

export default App;
