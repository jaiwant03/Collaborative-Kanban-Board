import { useState, useCallback, useEffect, useRef } from 'react';
import taskService from '../services/taskService';
import { useToast } from '../context/ToastContext';
import { useDashboardContext } from '../context/DashboardContext';

/**
 * Hook for fetching, creating, updating, and deleting tasks
 * within a given workspace, with filter/search/sort support.
 *
 * After every successful mutation (create / update / delete) it calls
 * notifyTaskMutation() so the Dashboard re-fetches automatically.
 */
function useTasks(workspaceId) {
  const [tasks, setTasks]         = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading]   = useState(false);
  const [filters, setFilters]       = useState({
    search: '',
    status: '',
    priority: '',
    assignee: '',
    sortBy: 'createdAt',
    order: 'desc',
  });

  const { toast }               = useToast();
  const { notifyTaskMutation }  = useDashboardContext();
  const abortRef                = useRef(null);

  // Keep toast in a ref so it never appears in useCallback dep arrays.
  // The raw toast object is recreated on every ToastProvider render, which
  // would cause fetchTasks to be a new function every render — triggering
  // the fetch effect on every keystroke / state update.
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; });

  // Also keep filters in a ref so mutation callbacks can always read the
  // latest value without needing it as a dep.
  const filtersRef = useRef(filters);
  useEffect(() => { filtersRef.current = filters; }, [filters]);

  const fetchTasks = useCallback(
    async (overrideFilters = {}) => {
      if (!workspaceId) return;

      // Cancel in-flight request
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      setIsLoading(true);
      try {
        const params = {
          workspaceId,
          ...filtersRef.current,
          ...overrideFilters,
        };
        // Strip empty strings
        Object.keys(params).forEach((k) => {
          if (params[k] === '') delete params[k];
        });

        const res = await taskService.getTasks(params);
        setTasks(res.data.tasks);
        setPagination(res.pagination);
      } catch (err) {
        if (err.name !== 'CanceledError') {
          toastRef.current.error(
            err.response?.data?.message || 'Failed to fetch tasks.'
          );
        }
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId] // only recreate when workspace changes
  );

  // Re-fetch whenever workspaceId changes or filters change
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks, filters]); // filters triggers re-fetch when they change

  const createTask = useCallback(
    async (data) => {
      try {
        await taskService.createTask({ ...data, workspaceId });
        // Do NOT add the task to local state here.
        // The backend broadcasts a `task:created` socket event to the whole
        // workspace room (including the sender), so BoardPage's socket handler
        // is the single place the task enters the list — no duplicates.
        toastRef.current.success('Task created.');
        notifyTaskMutation();
        return { success: true };
      } catch (err) {
        const message = err.response?.data?.message || 'Failed to create task.';
        toastRef.current.error(message);
        return { success: false, message };
      }
    },
    [workspaceId, notifyTaskMutation]
  );

  const updateTask = useCallback(
    async (id, data) => {
      try {
        const res = await taskService.updateTask(id, data);
        setTasks((prev) =>
          prev.map((t) => (t._id === id ? res.data.task : t))
        );
        toastRef.current.success('Task updated.');
        notifyTaskMutation(); // ← triggers dashboard re-fetch
        return { success: true, task: res.data.task };
      } catch (err) {
        const message = err.response?.data?.message || 'Failed to update task.';
        toastRef.current.error(message);
        return { success: false, message };
      }
    },
    [notifyTaskMutation]
  );

  const deleteTask = useCallback(
    async (id) => {
      try {
        await taskService.deleteTask(id);
        setTasks((prev) => prev.filter((t) => t._id !== id));
        toastRef.current.success('Task deleted.');
        notifyTaskMutation(); // ← triggers dashboard re-fetch
        return { success: true };
      } catch (err) {
        const message = err.response?.data?.message || 'Failed to delete task.';
        toastRef.current.error(message);
        return { success: false, message };
      }
    },
    [notifyTaskMutation]
  );

  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      search: '',
      status: '',
      priority: '',
      assignee: '',
      sortBy: 'createdAt',
      order: 'desc',
    });
  }, []);

  /**
   * Directly update the local tasks state — used by BoardPage for
   * optimistic drag-and-drop updates and WebSocket-pushed changes.
   */
  const setTasksLocally = useCallback((updater) => {
    setTasks(updater);
  }, []);

  return {
    tasks,
    pagination,
    isLoading,
    filters,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    updateFilters,
    resetFilters,
    setTasksLocally,
  };
}

export default useTasks;
