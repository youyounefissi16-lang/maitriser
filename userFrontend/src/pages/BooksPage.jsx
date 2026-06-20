import React, { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import { refreshToken } from '../utils/tokenStore';
import { SkeletonCard, SkeletonFilters } from '../components/LoadingSkeleton';
import { useToast } from '../components/Toast';
import '../styles/teal-theme.css';

const YEARS = [1, 2, 3, 4, 5, 6, 7];

const BooksPage = () => {
  const notify = useToast();
  const [modules, setModules]                   = useState([]);
  const [filteredModules, setFilteredModules]   = useState([]);
  const [selectedYear, setSelectedYear]         = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [searchQuery, setSearchQuery]           = useState('');
  const [debouncedSearch, setDebouncedSearch]   = useState('');
  const searchTimer = useRef(null);

  useEffect(() => {
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, []);
  const [books, setBooks]                       = useState([]);
  const [openBook, setOpenBook]                 = useState(null);
  const [loadingModules, setLoadingModules]     = useState(true);
  const [loadingBooks, setLoadingBooks]         = useState(true);
  const [modulesError, setModulesError]         = useState(null);
  const [booksError, setBooksError]             = useState(null);

  useEffect(() => { fetchModules(); }, []);
  useEffect(() => {
    setFilteredModules(selectedYear ? modules.filter((m) => m.year === Number(selectedYear)) : modules);
    setSelectedModuleId('');
  }, [selectedYear, modules]);

  useEffect(() => { fetchBooks(); }, [selectedModuleId, debouncedSearch]);

  const fetchModules = async () => {
    setLoadingModules(true);
    setModulesError(null);
    try {
      const res  = await fetchWithAuth(`${API_BASE_URL}/api/modules`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setModules(await res.json());
    } catch (err) {
      setModulesError(err.message);
    } finally {
      setLoadingModules(false);
    }
  };

  const fetchBooks = useCallback(async () => {
    setLoadingBooks(true);
    setBooksError(null);
    try {
      let url = `${API_BASE_URL}/api/books?`;
      if (selectedModuleId)  url += `moduleId=${selectedModuleId}&`;
      if (debouncedSearch.trim()) url += `search=${encodeURIComponent(debouncedSearch.trim())}&`;
      const res  = await fetchWithAuth(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setBooks(await res.json());
    } catch (err) {
      setBooksError(err.message);
    } finally {
      setLoadingBooks(false);
    }
  }, [selectedModuleId, debouncedSearch]);

  const handleDownload = async (book) => {
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
      notify('Échec du téléchargement.', 'error');
    }
  };

  return (
    <div className="page-teal">
      <div className="card-teal">
        <h2>📚 Bibliothèque</h2>

        {modulesError ? (
          <div className="empty-state" style={{ color: '#e74c3c' }}>
            <p>Erreur lors du chargement : {modulesError}</p>
            <button type="button" className="btn-primary" onClick={fetchModules} style={{ marginTop: '12px' }}>Réessayer</button>
          </div>
        ) : loadingModules ? (
          <SkeletonFilters count={3} />
        ) : (
          <div className="filters-row">
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
              <option value="">Toutes les Années</option>
              {YEARS.map((y) => <option key={y} value={y}>Année {y}</option>)}
            </select>
            <select value={selectedModuleId} onChange={(e) => setSelectedModuleId(e.target.value)}>
              <option value="">Toutes les Spécialités</option>
              {filteredModules.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
            </select>
            <input type="text" placeholder="Rechercher un livre…" value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); clearTimeout(searchTimer.current); searchTimer.current = setTimeout(() => setDebouncedSearch(e.target.value), 300); }} style={{ flex: 1, minWidth: '200px' }} />
          </div>
        )}

        {booksError ? (
          <div className="empty-state" style={{ color: '#e74c3c' }}>
            <p>Erreur lors du chargement des livres : {booksError}</p>
            <button type="button" className="btn-primary" onClick={fetchBooks} style={{ marginTop: '12px' }}>Réessayer</button>
          </div>
        ) : loadingBooks ? (
          <div className="grid-cards"><SkeletonCard count={6} /></div>
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
                    onClick={(e) => { e.stopPropagation(); handleDownload(book); }}>⬇</button>
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
          <div style={{ background: '#fff', width: '90%', height: '90%', borderRadius: '14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 24px', borderBottom: '1px solid #eee', background: '#f8f8f8',
            }}>
              <span style={{ fontWeight: 'bold', color: '#111' }}>📖 {openBook.title}</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn-dark" style={{ padding: '6px 16px', fontSize: '12px' }}
                  onClick={() => handleDownload(openBook)}>⬇ Télécharger</button>
                <button type="button" className="btn-primary" style={{ padding: '6px 16px', fontSize: '12px', background: '#e74c3c' }}
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
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; if (src) URL.revokeObjectURL(src); };
  }, [bookId]);
  if (error) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e74c3c' }}>Échec du chargement du fichier</div>;
  if (!src) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Chargement…</div>;
  return <iframe src={src} title={title} style={{ flex: 1, border: 'none', width: '100%' }} />;
};

export default BooksPage;
