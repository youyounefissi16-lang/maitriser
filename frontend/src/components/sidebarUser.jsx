import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FaHome, FaClipboardList, FaMicrophone, FaBook, FaSync, FaUser, FaBars, FaSun, FaMoon, FaGlobe, FaSignOutAlt, FaShieldAlt } from "react-icons/fa";
import { useClerk } from "@clerk/react";
import { useSound } from '../context/SoundContext';
import { useTranslation } from '../context/LanguageContext';
import "../styles/sidebarUser.css";

const SidebarUser = ({ sidebarOpen, toggleSidebar, isDarkMode, toggleDarkMode }) => {
  const play = useSound();
  const { t, changeLanguage } = useTranslation();
  const clerk = useClerk();
  const navigate = useNavigate();

  const handleLogout = () => {
    clerk.signOut();
    try { localStorage.removeItem('userId'); } catch {}
    navigate('/login');
  };

  const toggleLang = () => {
    const next = t('_locale') === 'fr' ? 'en' : 'fr';
    changeLanguage?.(next);
  };

  return (
    <aside className={`sidebar-user ${sidebarOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-user-toggle">
        <button onClick={() => { play('navigate'); toggleSidebar(); }} className="sidebar-toggle-btn">
          <FaBars className="sidebar-icon" />
        </button>
      </div>

      <nav>
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => play('navigate')}>
          <FaHome className="sidebar-icon" /><span className="sidebar-text">Dashboard</span>
        </NavLink>
        <NavLink to="/quizPage" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => play('navigate')}>
          <FaClipboardList className="sidebar-icon" /><span className="sidebar-text">QCM</span>
        </NavLink>
        {localStorage.getItem('userDiscipline') === 'medicine' && ['4','5','6'].includes(localStorage.getItem('userYear')) && (
          <NavLink to="/voice-exams" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => play('navigate')}>
            <FaMicrophone className="sidebar-icon" /><span className="sidebar-text">Examens Oraux</span>
          </NavLink>
        )}
        <NavLink to="/books" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => play('navigate')}>
          <FaBook className="sidebar-icon" /><span className="sidebar-text">Bibliothèque</span>
        </NavLink>
        <NavLink to="/review" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => play('navigate')}>
          <FaSync className="sidebar-icon" /><span className="sidebar-text">Révision</span>
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => play('navigate')}>
          <FaUser className="sidebar-icon" /><span className="sidebar-text">Profil</span>
        </NavLink>

        {localStorage.getItem('userRole') === 'admin' && (
          <NavLink to="/admin/dashboard" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => play('navigate')}>
            <FaShieldAlt className="sidebar-icon" /><span className="sidebar-text">Panneau Admin</span>
          </NavLink>
        )}
      </nav>

      <div className="sidebar-user-actions">
        <button onClick={toggleDarkMode} className="sidebar-action-btn" title={isDarkMode ? 'Mode clair' : 'Mode sombre'}>
          {isDarkMode ? <FaSun className="sidebar-icon" /> : <FaMoon className="sidebar-icon" />}
          <span className="sidebar-text">{isDarkMode ? 'Clair' : 'Sombre'}</span>
        </button>

        <button onClick={toggleLang} className="sidebar-action-btn" title="Langue">
          <FaGlobe className="sidebar-icon" />
          <span className="sidebar-text">{t('_locale') === 'fr' ? 'EN' : 'FR'}</span>
        </button>

        <button onClick={handleLogout} className="sidebar-action-btn" title="Déconnexion">
          <FaSignOutAlt className="sidebar-icon" />
          <span className="sidebar-text">Quitter</span>
        </button>
      </div>
    </aside>
  );
};

export default SidebarUser;
