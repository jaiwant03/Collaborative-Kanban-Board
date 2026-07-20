import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

const STORAGE_KEY = 'kanban_theme';

/**
 * Detect the OS-level colour scheme preference.
 */
const getSystemTheme = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

/**
 * Read the persisted preference.
 * Returns 'dark' | 'light' | 'system'
 */
const loadPreference = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'system';
  } catch {
    return 'system';
  }
};

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(loadPreference);
  // resolved = the actual theme applied ('dark' or 'light')
  const [resolved, setResolved] = useState(() => {
    const pref = loadPreference();
    return pref === 'system' ? getSystemTheme() : pref;
  });

  // Listen for OS theme changes when preference is 'system'
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      if (preference === 'system') {
        setResolved(e.matches ? 'dark' : 'light');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [preference]);

  // Apply data-theme attribute to <html> and persist
  useEffect(() => {
    const theme = preference === 'system' ? getSystemTheme() : preference;
    setResolved(theme);
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {}
  }, [preference]);

  const setTheme = useCallback((value) => {
    // value: 'dark' | 'light' | 'system'
    setPreference(value);
  }, []);

  const toggleTheme = useCallback(() => {
    setPreference((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'light';
      // system → flip to opposite of current resolved
      return resolved === 'dark' ? 'light' : 'dark';
    });
  }, [resolved]);

  return (
    <ThemeContext.Provider value={{ preference, resolved, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export default ThemeContext;
