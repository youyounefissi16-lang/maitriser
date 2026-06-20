import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { ClerkProvider, useAuth } from "@clerk/react";
import Home from './pages/Home';
import Header from './components/Header';
import Header2 from './components/Header2';
import FooterPage from './components/Footer.jsx';
import ProtectedRoute from './components/protectedRoute';
import { ToastProvider } from './components/Toast.jsx';
import { LanguageProvider, useTranslation } from './context/LanguageContext';
import axios from 'axios';
import { setToken, setTokenGetter } from './utils/tokenStore';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Help = lazy(() => import('./pages/Help'));
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
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));

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
        getTokenRef.current().then((t) => { if (t) setToken(t); }).catch(() => {});
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
      getTokenRef.current().then((token) => { if (token) setToken(token); }).catch(() => {});
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

const AppContent = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const { isSignedIn } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('darkMode', isDarkMode);
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  const appPaths = ['/quizPage', '/resultPage', '/quiz/', '/mock-exam', '/case-exam', '/bookmarks', '/review', '/voice-exams', '/books'];
  const isAppPath = appPaths.some((p) => location.pathname.startsWith(p));

  return (
    <LanguageProvider>
    <ToastProvider>
    <div style={isHome ? {} : { background: 'linear-gradient(135deg, var(--teal-dark, #0C4A4A) 0%, var(--teal-deeper, #0B3D3D) 100%)', minHeight: '100vh' }}>
      {isHome ? null : isSignedIn ? <Header2 toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} /> : <Header toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />}

      <Suspense fallback={<Fallback />}>
      <Routes>
        <Route path="/"         element={<Home toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />} />
        <Route path="/about"    element={<About />} />
        <Route path="/help"     element={<Help />} />
        <Route path="/contact"  element={<Contact />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/signup"   element={<Signup />} />

        <Route element={<ProtectedRoute />}>
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
    </LanguageProvider>
  );
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) { return { error }; }
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
