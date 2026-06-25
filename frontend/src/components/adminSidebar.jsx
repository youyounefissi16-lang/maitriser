import React from "react";
import { NavLink } from "react-router-dom";
import { FaHome, FaClipboardList, FaUsers, FaLayerGroup, FaChartLine, FaBook, FaMicrophone, FaComment } from "react-icons/fa";
import { useSound } from '../context/SoundContext';
import "../styles/sidebar.css";

const Sidebar = ({ sidebarOpen }) => {
  const play = useSound();

  return (
    <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
      <nav>
        <NavLink to="/admin/dashboard" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => play('navigate')}>
          <FaHome className="sidebar-icon" /><span className="sidebar-text">Dashboard</span>
        </NavLink>
        <NavLink to="/admin/module-management" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => play('navigate')}>
          <FaLayerGroup className="sidebar-icon" /><span className="sidebar-text">Modules</span>
        </NavLink>
        <NavLink to="/admin/quiz-management" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => play('navigate')}>
          <FaClipboardList className="sidebar-icon" /><span className="sidebar-text">Quizzes</span>
        </NavLink>
        <NavLink to="/admin/user-management" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => play('navigate')}>
          <FaUsers className="sidebar-icon" /><span className="sidebar-text">Users</span>
        </NavLink>
        <NavLink to="/admin/reports" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => play('navigate')}>
          <FaChartLine className="sidebar-icon" /><span className="sidebar-text">Reports</span>
        </NavLink>
        <NavLink to="/admin/book-management" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => play('navigate')}>
          <FaBook className="sidebar-icon" /><span className="sidebar-text">Books</span>
        </NavLink>
        <NavLink to="/admin/voice-exam-management" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => play('navigate')}>
          <FaMicrophone className="sidebar-icon" /><span className="sidebar-text">Voice Exams</span>
        </NavLink>
        <NavLink to="/admin/feedback" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => play('navigate')}>
          <FaComment className="sidebar-icon" /><span className="sidebar-text">Feedback</span>
        </NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar;
