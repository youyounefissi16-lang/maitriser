import React, { useState } from 'react';
import axiosAdmin from '../config/axiosAdmin';
import { logger } from '../utils/logger';
import '../styles/modal.css';

const AddUserModal = ({ setShowModal, fetchUsers }) => {
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    role: 'user',
  });
  const [tempPassword, setTempPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // POST /api/add-user — backend generates a temp password and returns it once
      const response = await axiosAdmin.post('/add-user', userData);
      const { tempPassword: tp, userId: genUid } = response.data;

      if (tp) {
        setTempPassword(tp);
        if (genUid) { try { localStorage.setItem('lastGenUserId', genUid); } catch {} }
      } else {
        fetchUsers();
        setShowModal(false);
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Error adding user.';
      logger.error({ err: error }, `AddUserModal failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  // After showing the temp password, close and refresh
  if (tempPassword) {
    const genUid = (() => { try { return localStorage.getItem('lastGenUserId'); } catch { return null; } })();
    return (
      <div className="modal-overlay" onClick={() => { try { localStorage.removeItem('lastGenUserId'); } catch {} fetchUsers(); setShowModal(false); }}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h3>User Created</h3>
          {genUid && <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>User ID: {genUid}</p>}
          <p>Share this temporary password with the user. It will not be shown again.</p>
          <code style={{ display: 'block', padding: '12px', background: 'var(--dc-cream)', borderRadius: '4px', fontSize: '16px', margin: '12px 0' }}>
            {tempPassword}
          </code>
          <button onClick={() => { try { localStorage.removeItem('lastGenUserId'); } catch {} fetchUsers(); setShowModal(false); }}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={() => !loading && setShowModal(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Add New User</h3>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="name">Name</label>
            <input type="text" id="name" name="name" value={userData.name} onChange={handleChange} required />
          </div>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" name="email" value={userData.email} onChange={handleChange} required />
          </div>
          <div className="input-group">
            <label htmlFor="role">Role</label>
            <select id="role" name="role" value={userData.role} onChange={handleChange}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" disabled={loading}>{loading ? 'Adding…' : 'Add User'}</button>
        </form>
        <button className="close-btn" onClick={() => setShowModal(false)}>Cancel</button>
      </div>
    </div>
  );
};

export default AddUserModal;
