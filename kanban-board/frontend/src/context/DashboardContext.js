import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * DashboardContext
 *
 * Provides a lightweight pub/sub bridge between task mutations (useTasks) and
 * the dashboard data fetcher (useDashboard).
 *
 * Pattern:
 *   - Any code that mutates tasks calls notifyTaskMutation().
 *   - useDashboard listens to mutationCount and re-fetches whenever it changes.
 *   - No polling, no prop-drilling, no duplicate API calls.
 */
const DashboardContext = createContext(null);

export function DashboardProvider({ children }) {
  // Incrementing this counter is the sole signal that task data has changed.
  const [mutationCount, setMutationCount] = useState(0);

  const notifyTaskMutation = useCallback(() => {
    setMutationCount((prev) => prev + 1);
  }, []);

  return (
    <DashboardContext.Provider value={{ mutationCount, notifyTaskMutation }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardContext() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboardContext must be used within DashboardProvider');
  return ctx;
}

export default DashboardContext;
