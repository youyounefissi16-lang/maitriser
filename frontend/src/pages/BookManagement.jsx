import React, { useState, useEffect, useRef } from 'react';
import { authFetch } from '../config/authFetch';
import { API_BASE_URL } from '../config/api';
import { FaTrash, FaBook } from 'react-icons/fa';
import { useToast } from '../components/Toast';
import { useSound } from '../context/SoundContext';
import ConfirmModal from '../components/ConfirmModal';
import Spinner from '../components/Spinner';
import { logger } from '../utils/logger';
import '../styles/sharedAdmin.css';

const YEARS = [1, 2, 3, 4, 5, 6, 7];

const BookManagement = () => {
  useEffect(() => { document.title = 'Book Management — Admin'; }, []);
  const notify = useToast();
  const play = useSound();
  const [modules, setModules]           = useState([]);
  const [filterYear, setFilterYear]     = useState('');
  const [books, setBooks]               = useState([]);
  const [title, setTitle]               = useState('');
  const [selectedModuleIds, setSelectedModuleIds] = useState([]);
  const [file, setFile]                 = useState(null);
  const [uploading, setUploading]       = useState(false);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting]     = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => { fetchModules(); fetchBooks(); }, []);

  const fetchModules = async () => {
    try {
      const res  = await authFetch('/api/modules');
      if (!res.ok) { setError('Failed to load modules'); return; }
      const data = await res.json();
      setModules(data);
    } catch (err) { logger.error({ err }, 'BookManagement fetchModules failed'); setError('Failed to load modules'); }
  };

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const res  = await authFetch('/api/books');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setBooks(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) { logger.error({ err }, 'BookManagement fetchBooks failed'); setError('Failed to load books'); }
    finally { setLoading(false); }
  };

  const toggleModule = (id) => {
    setSelectedModuleIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleUpload = async () => {
    play('submit');
    if (submittingRef.current) return;
    if (!title || !file || selectedModuleIds.length === 0)
      return notify('Please enter a title, select at least one module, and choose a PDF.', 'warning');

    const formData = new FormData();
    formData.append('title', title);
    formData.append('moduleIds', JSON.stringify(selectedModuleIds));
    formData.append('file', file);

    submittingRef.current = true;
    try {
      setUploading(true);
      const res = await authFetch('/api/books/upload', { method: 'POST', body: formData });
      if (res.ok) {
        notify('Book uploaded successfully', 'success');
        setTitle(''); setFile(null); setSelectedModuleIds([]);
        document.getElementById('book-file-input').value = '';
        fetchBooks();
      } else {
        const err = await res.json();
        notify(`Upload failed: ${err.message}`, 'error');
      }
    } catch (err) { logger.error({ err }, 'BookManagement upload failed'); notify('Upload failed', 'error'); }
    finally { setUploading(false); submittingRef.current = false; }
  };

  const confirmDelete = async () => {
    play('delete');
    if (!deleteTarget || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await authFetch(`/api/books/${deleteTarget._id}`, { method: 'DELETE' });
      if (res.ok) { fetchBooks(); notify('Book deleted', 'success'); }
      else notify('Failed to delete book', 'error');
    } catch (err) {
      logger.error({ err }, 'BookManagement confirmDelete failed');
      notify('Network error', 'error');
    } finally {
      setDeleteTarget(null);
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const visibleModules = filterYear
    ? modules.filter((m) => m.year === Number(filterYear))
    : modules;

  if (loading) return <div className="admin-page"><h2>Book Management</h2><Spinner /></div>;

  return (
    <div className="admin-page">
      <h2>Book Management</h2>

      {error && <div className="error-banner">{error}<button onClick={() => setError('')}>&times;</button></div>}

      <div className="admin-form-card" style={{ maxWidth: 500 }}>
        <h3>Upload a Book (PDF)</h3>
        <input
          type="text"
          placeholder="Book title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: '100%', marginBottom: 10, boxSizing: 'border-box' }}
        />

        <p style={{ fontWeight: 'bold', marginBottom: 4 }}>Assign to Modules:</p>
        <div style={{ marginBottom: 8 }}>
          <label style={{ marginRight: 8 }}>Filter by Year:</label>
          <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
            <option value="">All</option>
            {YEARS.map((y) => <option key={y} value={y}>Year {y}</option>)}
          </select>
        </div>
        <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--dc-border)', borderRadius: 8, padding: 8, marginBottom: 10 }}>
          {visibleModules.map((m) => (
            <label key={m._id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={selectedModuleIds.includes(m._id)} onChange={() => toggleModule(m._id)} />
              <span>Year {m.year} — {m.name}</span>
            </label>
          ))}
          {visibleModules.length === 0 && <p style={{ color: 'var(--dc-text-muted)', fontSize: 13 }}>No modules for this year.</p>}
        </div>

        <input id="book-file-input" type="file" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} />
        <button type="button" onClick={handleUpload} disabled={uploading} style={{ marginTop: 10 }}>
          {uploading ? 'Uploading\u2026' : 'Upload Book'}
        </button>
      </div>

      <h3>All Books</h3>
      {books.length === 0 ? (
        <p style={{ color: 'var(--dc-text-muted)' }}>No books uploaded yet.</p>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>{['ID', 'Title', 'Modules', 'Uploaded', 'Actions'].map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {books.map((book) => (
                <tr key={book._id}>
                  <td style={{ padding: 8, borderBottom: '1px solid var(--dc-border)' }}>{book.bookId || '—'}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid var(--dc-border)' }}><FaBook style={{ color: 'var(--dc-highlight)', marginRight: 6 }} />{book.title}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid var(--dc-border)' }}>
                    {book.moduleIds?.map((m) => (
                      <span key={m._id} className="module-tag">Y{m.year} {m.name}</span>
                    ))}
                  </td>
                  <td style={{ padding: 8, borderBottom: '1px solid var(--dc-border)' }}>{new Date(book.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid var(--dc-border)' }}>
                    <button type="button" onClick={() => setDeleteTarget(book)}><FaTrash /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Book"
        message={`Delete "${deleteTarget?.title || 'this book'}"?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmText="Delete"
        confirmDisabled={submitting}
      />
    </div>
  );
};

export default BookManagement;
