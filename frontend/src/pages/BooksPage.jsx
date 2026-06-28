import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import { refreshToken } from '../utils/tokenStore';
import { SkeletonCard, SkeletonFilters } from '../components/LoadingSkeleton';
import { useToast } from '../components/Toast';
import { logger } from '../utils/logger';
import '../styles/teal-theme.css';

const BooksPage = () => {
  const notify = useToast();
  const navigate = useNavigate();
  const [subscription, setSubscription]         = useState(null);
  const [modules, setModules]                   = useState([]);
  const [filteredModules, setFilteredModules]   = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [searchQuery, setSearchQuery]           = useState('');
  const [debouncedSearch, setDebouncedSearch]   = useState('');
  const searchTimer = useRef(null);

  useEffect(() => {
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, []);
  const [books, setBooks]                       = useState([]);
  const [openBook, setOpenBook]                 = useState(null);
  const [downloading, setDownloading]           = useState(null);
  const [loadingModules, setLoadingModules]     = useState(true);
  const [loadingBooks, setLoadingBooks]         = useState(true);
  const [modulesError, setModulesError]         = useState(null);
  const [booksError, setBooksError]             = useState(null);

  useEffect(() => { fetchModules(); }, []);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/payments/subscription`);
        if (res.ok) { const d = await res.json(); setSubscription(d.subscription); }
      } catch { /* ignore */ }
    })();
  }, []);
  useEffect(() => {
    const userYear = localStorage.getItem('userYear') || '';
    setFilteredModules(userYear ? modules.filter((m) => m.year === Number(userYear)) : modules);
    setSelectedModuleId('');
  }, [modules]);

  useEffect(() => {
    const controller = new AbortController();
    fetchBooks(controller.signal);
    return () => controller.abort();
  }, [selectedModuleId, debouncedSearch]);

  const fetchModules = async () => {
    setLoadingModules(true);
    setModulesError(null);
    try {
      const discipline = localStorage.getItem('userDiscipline') || '';
      const url = discipline ? `${API_BASE_URL}/api/modules?discipline=${discipline}` : `${API_BASE_URL}/api/modules`;
      const res  = await fetchWithAuth(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setModules(await res.json());
    } catch (err) {
      logger.error({ err }, 'BooksPage fetchModules failed');
      setModulesError(err.message);
    } finally {
      setLoadingModules(false);
    }
  };

  const fetchBooks = useCallback(async (signal) => {
    setLoadingBooks(true);
    setBooksError(null);
    try {
      const discipline = localStorage.getItem('userDiscipline') || '';
      const params = new URLSearchParams();
      if (discipline) params.set('discipline', discipline);
      if (selectedModuleId)   params.set('moduleId', selectedModuleId);
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      let url = `${API_BASE_URL}/api/books?${params.toString()}`;
      const res  = await fetchWithAuth(url, signal ? { signal } : undefined);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBooks(data.data || (Array.isArray(data) ? data : []));
    } catch (err) {
      if (err.name === 'AbortError') return;
      logger.error({ err }, 'BooksPage fetchBooks failed');
      setBooksError(err.message);
    } finally {
      setLoadingBooks(false);
    }
  }, [selectedModuleId, debouncedSearch]);

  const handleDownload = async (book) => {
    if (downloading) return;
    setDownloading(book._id);
    try {
      const token = await refreshToken();
      const res = await fetch(`${API_BASE_URL}/api/books/download/${book._id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = book.originalName || `${book.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      logger.error({ err, bookId: book._id }, 'BooksPage download failed');
      notify('Échec du téléchargement.', 'error');
    } finally { setDownloading(null); }
  };

  return (
    <div className="page-teal">
      <div className="card-teal">
        <h2>📚 Bibliothèque</h2>

        {modulesError ? (
          <div className="empty-state" style={{ color: 'var(--color-danger)' }}>
            <p>Erreur lors du chargement : {modulesError}</p>
            <button type="button" className="btn-primary" onClick={fetchModules} style={{ marginTop: '12px' }}>Réessayer</button>
          </div>
        ) : loadingModules ? (
          <SkeletonFilters count={3} />
        ) : (
          <div className="filters-row">
            <select value={selectedModuleId} onChange={(e) => setSelectedModuleId(e.target.value)}>
              <option value="">Toutes les Spécialités</option>
              {filteredModules.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
            </select>
            <input type="text" placeholder="Rechercher un livre…" value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); clearTimeout(searchTimer.current); searchTimer.current = setTimeout(() => setDebouncedSearch(e.target.value), 300); }} style={{ flex: 1, minWidth: '200px' }} />
          </div>
        )}

        {subscription && subscription.status !== 'active' ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: '#fff3cd', borderRadius: 12, marginBottom: 16 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>&#128274;</div>
            <h3 style={{ color: '#856404', margin: '0 0 8px' }}>Subscription Required</h3>
            <p style={{ color: '#856404', fontSize: '0.9rem', margin: '0 0 16px' }}>
              A subscription is required to access books. Subscribe to unlock all content for your discipline and year.
            </p>
            <button className="btn-primary" onClick={() => navigate('/pricing')}>View Plans</button>
          </div>
        ) : booksError ? (
          <div className="empty-state" style={{ color: 'var(--color-danger)' }}>
            <p>Erreur lors du chargement des livres : {booksError}</p>
            <button type="button" className="btn-primary" onClick={fetchBooks} style={{ marginTop: '12px' }}>Réessayer</button>
          </div>
        ) : loadingBooks ? (
          <SkeletonCard count={6} />
        ) : books.length === 0 ? (
          <div className="empty-state">Aucun livre disponible pour cette sélection.</div>
        ) : (
          <div className="grid-cards">
            {books.map((book) => (
              <div key={book._id} className="card-item" onClick={() => setOpenBook(book)}>
                <div className="card-icon">📕</div>
                <div className="card-title">{book.title}</div>
                <div className="card-meta">
                  {book.moduleIds?.map((m) => `Y${m.year} ${m.name}`).join(', ')}
                </div>
                <div className="card-actions">
                  <button type="button" className="btn-primary" style={{ padding: '6px 16px', fontSize: '12px' }}
                    onClick={(e) => { e.stopPropagation(); setOpenBook(book); }}>Lire</button>
                  <button type="button" className="btn-icon" style={{ width: '30px', height: '30px', fontSize: '12px' }}
                    onClick={(e) => { e.stopPropagation(); handleDownload(book); }} disabled={downloading === book._id}>{downloading === book._id ? '...' : '⬇'}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {openBook && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.7)', zIndex: 1000,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ background: 'var(--card-bg)', width: '90%', height: '90%', borderRadius: '14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 24px', borderBottom: '1px solid var(--border-light)', background: 'var(--color-bg)',
            }}>
              <span style={{ fontWeight: 'bold', color: 'var(--text-dark)' }}>📖 {openBook.title}</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn-dark" style={{ padding: '6px 16px', fontSize: '12px' }}
                  onClick={() => handleDownload(openBook)} disabled={downloading === openBook._id}>{downloading === openBook._id ? 'Téléchargement...' : '⬇ Télécharger'}</button>
                <button type="button" className="btn-primary" style={{ padding: '6px 16px', fontSize: '12px', background: 'var(--color-danger)' }}
                  onClick={() => setOpenBook(null)}>✕ Fermer</button>
              </div>
            </div>
            <BookPreview bookId={openBook._id} title={openBook.title} />
          </div>
        </div>
      )}
    </div>
  );
};

const BookPreview = ({ bookId, title }) => {
  const [src, setSrc] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await refreshToken();
        const res = await fetch(`${API_BASE_URL}/api/books/file/${bookId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('Load failed');
        const blob = await res.blob();
        if (!cancelled) setSrc(URL.createObjectURL(blob));
      } catch (err) {
        logger.error({ err, bookId }, 'BookPreview load failed');
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; if (src) URL.revokeObjectURL(src); };
  }, [bookId]);
  if (error) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-danger)' }}>Échec du chargement du fichier</div>;
  if (!src) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Chargement…</div>;
  return <iframe src={src} title={title} style={{ flex: 1, border: 'none', width: '100%' }} />;
};

export default BooksPage;
