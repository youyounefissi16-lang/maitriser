import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('adminDarkMode') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('adminDarkMode', darkMode);
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(prev => !prev);
  const value = useMemo(() => ({ darkMode, toggleDarkMode }), [darkMode, toggleDarkMode]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
