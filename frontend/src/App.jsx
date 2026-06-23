import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Routes, Route, useLocation, Navigate, Outlet } from 'react-router-dom';
import { ClerkProvider, useAuth } from "@clerk/react";
import Home from './pages/Home';
import Header from './components/Header';
import Header2 from './components/Header2';
import FooterPage from './components/Footer.jsx';
import ProtectedRoute from './components/protectedRoute';
import AdminHeader from './components/adminHeader';
import Sidebar from './components/adminSidebar';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import { ToastProvider } from './components/Toast.jsx';
import { LanguageProvider, useTranslation } from './context/LanguageContext';
import { SoundProvider } from './context/SoundContext';
import { ThemeProvider } from './context/ThemeContext';
import CookieConsent from './components/CookieConsent';
import axios from 'axios';
import { setToken, setTokenGetter } from './utils/tokenStore';
import { logger } from './utils/logger';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Help = lazy(() => import('./pages/Help'));
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const QuizPage = lazy(() => import('./pages/quizPage.jsx'));
const MockExam = lazy(() => import('./pages/MockExam.jsx'));
const CaseExam = lazy(() => import('./pages/CaseExam.jsx'));
const ResultPage = lazy(() => import('./pages/resultPage.jsx'));
const BooksPage = lazy(() => import('./pages/BooksPage.jsx'));
const VoiceExamPage = lazy(() => import('./pages/VoiceExamPage.jsx'));
const QuizCard = lazy(() => import('./components/quizCard'));
const BookmarksPage = lazy(() => import('./pages/BookmarksPage.jsx'));
const ReviewPage = lazy(() => import('./pages/ReviewPage.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));
const Login = lazy(() => import('./pages/login'));
const Signup = lazy(() => import('./pages/Signup'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const AdminDashboard = lazy(() => import('./pages/Dashboard'));
const QuizManagement = lazy(() => import('./pages/QuizManagement'));
const UserManagement = lazy(() => import('./pages/userManagement'));
const ModuleManagement = lazy(() => import('./pages/ModuleManagement'));
const AdminProfile = lazy(() => import('./pages/profile'));
const BookManagement = lazy(() => import('./pages/BookManagement'));
const VoiceExamManagement = lazy(() => import('./pages/VoiceExamManagement'));
const Reports = lazy(() => import('./pages/Reports'));
const AdminSetup = lazy(() => import('./pages/AdminSetup'));

const ClerkAxiosSetup = ({ children }) => {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const [ready, setReady] = useState(false);
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  useEffect(() => {
    if (!isLoaded) return;
    setTokenGetter(() => getTokenRef.current());
    let aborted = false;
    (async () => {
      let token = await getTokenRef.current();
      if (!token && isSignedIn) {
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 500));
          if (aborted) return;
          token = await getTokenRef.current();
          if (token) break;
        }
      }
      if (aborted) return;
      if (token) {
        setToken(token);
        getTokenRef.current().then((t) => { if (t) setToken(t); }).catch((err) => { logger.error({ err }, 'App initial token refresh failed'); });
        setReady(true);
      } else if (!isSignedIn) {
        setReady(true);
      } else {
        setTimeout(() => setReady(true), 100);
      }
    })();
    const interceptor = axios.interceptors.request.use(async (config) => {
      const token = await getTokenRef.current();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        setToken(token);
      }
      return config;
    });
    const refreshInterval = setInterval(async () => {
      if (aborted) return;
      getTokenRef.current().then((token) => { if (token) setToken(token); }).catch((err) => { logger.error({ err }, 'App refreshInterval token refresh failed'); });
    }, 30 * 1000);
    return () => {
      aborted = true;
      axios.interceptors.request.eject(interceptor);
      clearInterval(refreshInterval);
    };
  }, [isLoaded, isSignedIn]);

  if (!ready) return <div className="page-teal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><div className="card-teal" style={{ textAlign: 'center', padding: 40 }}>Chargement…</div></div>;
  return children;
};

const Fallback = () => {
  const { t } = useTranslation();
  return <div className="page-teal"><div className="card-teal" style={{ textAlign: 'center', padding: 40 }}>{t('loading')}</div></div>;
};

const UserLayout = ({ isDarkMode, toggleDarkMode }) => {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const { isSignedIn } = useAuth();

  const appPaths = ['/quizPage', '/resultPage', '/quiz/', '/mock-exam', '/case-exam', '/bookmarks', '/review', '/voice-exams', '/books'];
  const isAppPath = appPaths.some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    try { localStorage.setItem('darkMode', isDarkMode); } catch { /* ignore */ }
  }, [isDarkMode]);

  return (
    <LanguageProvider>
    <SoundProvider>
    <ToastProvider>
      <div style={isHome ? {} : { background: 'linear-gradient(135deg, var(--teal-dark, #0C4A4A) 0%, var(--teal-deeper, #0B3D3D) 100%)', minHeight: '100vh' }}>
        <CookieConsent />
        {isHome ? null : isSignedIn ? <Header2 toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} /> : <Header toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />}

      <Suspense fallback={<Fallback />}>
      <Routes>
        <Route path="/"         element={isSignedIn ? <Navigate to="/dashboard" replace /> : <Home toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />} />
        <Route path="/about"    element={<About />} />
        <Route path="/help"     element={<Help />} />
        <Route path="/contact"  element={<Contact />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/signup"   element={<Signup />} />
        <Route path="/terms"    element={<Terms />} />
        <Route path="/privacy"  element={<Privacy />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard"   element={<DashboardPage />} />
          <Route path="/quizPage"    element={<QuizPage />} />
          <Route path="/mock-exam"   element={<MockExam />} />
          <Route path="/case-exam/:caseId" element={<CaseExam />} />
          <Route path="/resultPage"  element={<ResultPage />} />
          <Route path="/voice-exams" element={<VoiceExamPage />} />
          <Route path="/bookmarks"   element={<BookmarksPage />} />
          <Route path="/review"      element={<ReviewPage />} />
          <Route path="/profile"     element={<ProfilePage />} />
          <Route path="/quiz/:id"    element={<QuizCard />} />
          <Route path="/books"       element={<BooksPage />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>

      {!isAppPath && !isHome && <FooterPage />}
    </div>
    </ToastProvider>
    </SoundProvider>
    </LanguageProvider>
  );
};

import './styles/adminTheme.css';
import './styles/adminStyles.css';
import './styles/sharedAdmin.css';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  return (
    <SoundProvider>
    <ToastProvider>
    <ThemeProvider>
      <div className="admin-app">
        <AdminHeader toggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
        <div className="main-content">
          <Sidebar sidebarOpen={sidebarOpen} />
          <div className="page-content" style={{ marginLeft: sidebarOpen ? 230 : 60, transition: 'margin-left 0.3s ease' }}>
            <Outlet />
          </div>
        </div>
      </div>
    </ThemeProvider>
    </ToastProvider>
    </SoundProvider>
  );
};

const AppContent = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname === '/admin/setup';
  const [isDarkMode, setIsDarkMode] = useState(() => { try { return localStorage.getItem('darkMode') === 'true'; } catch { return false; } });
  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  if (isAdminRoute) {
    return (
      <Routes>
        <Route path="/admin/setup" element={<AdminSetup />} />
        <Route element={<AdminProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/module-management" element={<ModuleManagement />} />
            <Route path="/admin/quiz-management" element={<QuizManagement />} />
            <Route path="/admin/user-management" element={<UserManagement />} />
            <Route path="/admin/reports" element={<Reports />} />
            <Route path="/admin/book-management" element={<BookManagement />} />
            <Route path="/admin/voice-exam-management" element={<VoiceExamManagement />} />
            <Route path="/admin/profile" element={<AdminProfile />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    );
  }

  return <UserLayout isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />;
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    logger.error({ err: error, info }, 'ErrorBoundary caught');
  }
  render() {
    if (this.state.error) {
      return (
        <div className="page-teal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div className="card-teal" style={{ textAlign: 'center', padding: 40 }}>
            <h2>Une erreur est survenue</h2>
            <p style={{ color: '#e74c3c', margin: '12px 0' }}>{this.state.error.message}</p>
            <button className="btn-primary" onClick={() => window.location.reload()}>Recharger la page</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <ErrorBoundary>
        <ClerkAxiosSetup>
          <AppContent />
        </ClerkAxiosSetup>
      </ErrorBoundary>
    </ClerkProvider>
  );
};

export default App;
