import React, { useState } from 'react';
import axiosAdmin from '../config/axiosAdmin';
import '../styles/modal.css';

const AddUserModal = ({ setShowModal, fetchUsers }) => {
  const [userData, setUserData] = useState({
    userId: '',
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
      const { tempPassword: tp } = response.data;

      if (tp) {
        setTempPassword(tp);
      } else {
        fetchUsers();
        setShowModal(false);
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Error adding user.';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  // After showing the temp password, close and refresh
  if (tempPassword) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h3>User Created</h3>
          <p>Share this temporary password with the user. It will not be shown again.</p>
          <code style={{ display: 'block', padding: '12px', background: '#f5f5f5', borderRadius: '4px', fontSize: '16px', margin: '12px 0' }}>
            {tempPassword}
          </code>
          <button onClick={() => { fetchUsers(); setShowModal(false); }}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Add New User</h3>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="userId">User ID</label>
            <input type="text" id="userId" name="userId" value={userData.userId} onChange={handleChange} required />
          </div>
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
