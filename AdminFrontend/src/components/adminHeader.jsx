import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useClerk } from "@clerk/react";
import { FaBars, FaMoon, FaSun } from "react-icons/fa";
import { useTheme } from "../context/ThemeContext.jsx";
import { useSound } from '../context/SoundContext';
import "../styles/adminHeader.css";

const AdminHeader = ({ toggleSidebar, sidebarOpen }) => {
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const { darkMode, toggleDarkMode } = useTheme();
  const play = useSound();
  const handleLogout = () => {
    signOut();
    try { localStorage.removeItem('adminRole'); } catch { /* ignore */ }
    navigate('/logging');
  };
  return (
    <header className="admin-header">
      <div className="header-left">
        <button className="hamburger-btn" onClick={toggleSidebar} aria-label="Toggle sidebar">
          <FaBars />
        </button>
        <div className="logo">MAITRISEZ Admin</div>
      </div>
      <nav className="nav-links">
        <NavLink to="/profile" className="profile-link" onClick={() => play('navigate')}>Profile</NavLink>
        <button onClick={() => { play('click'); toggleDarkMode(); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1.2rem' }}
          aria-label="Toggle dark mode">
          {darkMode ? <FaSun /> : <FaMoon />}
        </button>
        <button id="logout" onClick={() => { play('click'); handleLogout(); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
          Logout
        </button>
      </nav>
    </header>
  );
};
export default AdminHeader;
