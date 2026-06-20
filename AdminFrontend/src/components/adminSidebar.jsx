import React from "react";
import { NavLink } from "react-router-dom";
import { FaHome, FaClipboardList, FaUsers, FaLayerGroup, FaChartLine, FaBook, FaMicrophone } from "react-icons/fa";
import "../styles/sidebar.css";

const Sidebar = ({ sidebarOpen }) => (
  <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
    <nav>
      <NavLink to="/dashboard"             className={({ isActive }) => isActive ? 'active' : ''}>
        <FaHome className="sidebar-icon" /><span className="sidebar-text">Dashboard</span>
      </NavLink>
      <NavLink to="/module-management"     className={({ isActive }) => isActive ? 'active' : ''}>
        <FaLayerGroup className="sidebar-icon" /><span className="sidebar-text">Modules</span>
      </NavLink>
      <NavLink to="/quiz-management"       className={({ isActive }) => isActive ? 'active' : ''}>
        <FaClipboardList className="sidebar-icon" /><span className="sidebar-text">Quizzes</span>
      </NavLink>
      <NavLink to="/user-management"       className={({ isActive }) => isActive ? 'active' : ''}>
        <FaUsers className="sidebar-icon" /><span className="sidebar-text">Users</span>
      </NavLink>
      <NavLink to="/reports"               className={({ isActive }) => isActive ? 'active' : ''}>
        <FaChartLine className="sidebar-icon" /><span className="sidebar-text">Reports</span>
      </NavLink>
      <NavLink to="/book-management"       className={({ isActive }) => isActive ? 'active' : ''}>
        <FaBook className="sidebar-icon" /><span className="sidebar-text">Books</span>
      </NavLink>
      <NavLink to="/voice-exam-management" className={({ isActive }) => isActive ? 'active' : ''}>
        <FaMicrophone className="sidebar-icon" /><span className="sidebar-text">Voice Exams</span>
      </NavLink>
    </nav>
  </aside>
);

export default Sidebar;
