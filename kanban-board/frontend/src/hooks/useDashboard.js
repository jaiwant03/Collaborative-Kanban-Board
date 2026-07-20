import { useState, useCallback, useEffect, useRef } from 'react';
import dashboardService from '../services/dashboardService';
import { useToast } from '../context/ToastContext';
import { useDashboardContext } from '../context/DashboardContext';

// How often (ms) the dashboard silently re-checks for fresh data while open.
// Acts as a safety net in case the mutation signal is ever missed.
const POLL_INTERVAL_MS = 30_000;

/**
 * Fetches dashboard statistics for the given workspace.
 *
 * Re-fetches automatically whenever:
 *   1. The workspace changes.
 *   2. mutationCount from DashboardContext increments (any task was
 *      created, updated, or deleted on the Board).
 *   3. The 30-second poll fires (safety net).
 *   4. refetch() is called manually (the Refresh button).
 */
function useDashboard(workspaceId) {
  const [stats, setStats]       = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast }               = useToast();
  const { mutationCount }       = useDashboardContext();

  // Keep toast in a ref so fetchStats is never recreated due to toast changes.
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; });

  // workspaceId ref — lets the poll callback always use the latest value
  // without needing it as a dep (avoids tearing down/recreating the interval).
  const workspaceIdRef = useRef(workspaceId);
  useEffect(() => { workspaceIdRef.current = workspaceId; }, [workspaceId]);

  const fetchStats = useCallback(async () => {
    const wsId = workspaceIdRef.current;
    if (!wsId) return;
    setIsLoading(true);
    try {
      const res = await dashboardService.getStats(wsId);
      // api.js interceptor unwraps response.data (the full JSON envelope):
      // res = { success, message, data: { totalTasks, tasksByStatus, … } }
      setStats(res.data);
    } catch (err) {
      toastRef.current.error(
        err.response?.data?.message || 'Failed to load dashboard.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []); // truly stable — no deps change its identity

  // ── 1. Initial load whenever the workspace changes ────────────────────────
  useEffect(() => {
    if (!workspaceId) return;
    fetchStats();
  }, [workspaceId, fetchStats]);

  // ── 2. Re-fetch on every task mutation (create / update / delete) ─────────
  useEffect(() => {
    if (mutationCount === 0) return; // skip mount
    fetchStats();
  }, [mutationCount, fetchStats]);

  // ── 3. Polling safety net — re-fetch every 30 s while page is open ────────
  useEffect(() => {
    if (!workspaceId) return;
    const id = setInterval(fetchStats, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [workspaceId, fetchStats]);

  return { stats, isLoading, refetch: fetchStats };
}

export default useDashboard;
