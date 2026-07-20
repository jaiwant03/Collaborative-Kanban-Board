import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import workspaceService from '../services/workspaceService';
import { useSocket } from './SocketContext';

const WorkspaceContext = createContext(null);

const initialState = {
  workspaces: [],
  activeWorkspace: null,
  isLoading: false,
  error: null,
};

const WS_ACTIONS = {
  SET_LOADING:      'SET_LOADING',
  SET_WORKSPACES:   'SET_WORKSPACES',
  ADD_WORKSPACE:    'ADD_WORKSPACE',
  SET_ACTIVE:       'SET_ACTIVE',
  UPDATE_WORKSPACE: 'UPDATE_WORKSPACE',   // patch a single workspace in-place
  REMOVE_WORKSPACE: 'REMOVE_WORKSPACE',
  SET_ERROR:        'SET_ERROR',
  CLEAR_ERROR:      'CLEAR_ERROR',
};

function workspaceReducer(state, action) {
  switch (action.type) {
    case WS_ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case WS_ACTIONS.SET_WORKSPACES: {
      const workspaces = action.payload;
      // Preserve active workspace or default to first
      const active =
        state.activeWorkspace &&
        workspaces.find((w) => w._id === state.activeWorkspace._id)
          ? state.activeWorkspace
          : workspaces[0] || null;
      return { ...state, workspaces, activeWorkspace: active, isLoading: false };
    }
    case WS_ACTIONS.ADD_WORKSPACE:
      return {
        ...state,
        workspaces: [action.payload, ...state.workspaces],
        activeWorkspace: action.payload,
        isLoading: false,
      };
    case WS_ACTIONS.SET_ACTIVE:
      return { ...state, activeWorkspace: action.payload };
    case WS_ACTIONS.UPDATE_WORKSPACE: {
      // Replace the matching workspace in the list and update activeWorkspace if needed
      const updated = action.payload;
      const workspaces = state.workspaces.map((w) =>
        w._id === updated._id ? updated : w
      );
      const activeWorkspace =
        state.activeWorkspace?._id === updated._id
          ? updated
          : state.activeWorkspace;
      return { ...state, workspaces, activeWorkspace };
    }
    case WS_ACTIONS.REMOVE_WORKSPACE: {
      const remaining = state.workspaces.filter((w) => w._id !== action.payload);
      return {
        ...state,
        workspaces: remaining,
        activeWorkspace:
          state.activeWorkspace?._id === action.payload
            ? remaining[0] || null
            : state.activeWorkspace,
      };
    }
    case WS_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false };
    case WS_ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };
    default:
      return state;
  }
}

export function WorkspaceProvider({ children }) {
  const [state, dispatch] = useReducer(workspaceReducer, initialState);
  const { subscribe }     = useSocket();

  // ── Live member count updates ────────────────────────────────────────────────
  // When someone accepts an invitation the backend broadcasts workspace:member_joined
  // to the workspace room. We update the workspace in state so member counts
  // and member lists reflect the change immediately for all connected users.
  const onMemberJoined = useCallback(({ workspace }) => {
    if (!workspace) return;
    dispatch({ type: WS_ACTIONS.UPDATE_WORKSPACE, payload: workspace });
  }, []);

  useEffect(() => {
    return subscribe('workspace:member_joined', onMemberJoined);
  }, [subscribe, onMemberJoined]);

  const fetchWorkspaces = useCallback(async () => {
    dispatch({ type: WS_ACTIONS.SET_LOADING, payload: true });
    try {
      const res = await workspaceService.getWorkspaces();
      dispatch({ type: WS_ACTIONS.SET_WORKSPACES, payload: res.data.workspaces });
    } catch (err) {
      dispatch({
        type: WS_ACTIONS.SET_ERROR,
        payload: err.response?.data?.message || 'Failed to load workspaces.',
      });
    }
  }, []);

  const createWorkspace = useCallback(async (data) => {
    dispatch({ type: WS_ACTIONS.SET_LOADING, payload: true });
    try {
      const res = await workspaceService.createWorkspace(data);
      dispatch({ type: WS_ACTIONS.ADD_WORKSPACE, payload: res.data.workspace });
      return { success: true, workspace: res.data.workspace };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create workspace.';
      dispatch({ type: WS_ACTIONS.SET_ERROR, payload: message });
      return { success: false, message };
    }
  }, []);

  const joinWorkspace = useCallback(async (inviteCode) => {
    dispatch({ type: WS_ACTIONS.SET_LOADING, payload: true });
    try {
      const res = await workspaceService.joinWorkspace(inviteCode);
      dispatch({ type: WS_ACTIONS.ADD_WORKSPACE, payload: res.data.workspace });
      return { success: true, workspace: res.data.workspace };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to join workspace.';
      dispatch({ type: WS_ACTIONS.SET_ERROR, payload: message });
      return { success: false, message };
    }
  }, []);

  const leaveWorkspace = useCallback(async (workspaceId) => {
    try {
      await workspaceService.leaveWorkspace(workspaceId);
      dispatch({ type: WS_ACTIONS.REMOVE_WORKSPACE, payload: workspaceId });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to leave workspace.';
      dispatch({ type: WS_ACTIONS.SET_ERROR, payload: message });
      return { success: false, message };
    }
  }, []);

  const setActiveWorkspace = useCallback((workspace) => {
    dispatch({ type: WS_ACTIONS.SET_ACTIVE, payload: workspace });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: WS_ACTIONS.CLEAR_ERROR });
  }, []);

  /**
   * Returns the current user's role in the active workspace.
   * Requires the userId to be passed in (from AuthContext).
   */
  const getMemberRole = useCallback(
    (userId) => {
      if (!state.activeWorkspace || !userId) return null;
      const m = state.activeWorkspace.members?.find(
        (mem) => (mem.user?._id || mem.user)?.toString() === userId?.toString()
      );
      return m?.role ?? null;
    },
    [state.activeWorkspace]
  );

  return (
    <WorkspaceContext.Provider
      value={{
        ...state,
        fetchWorkspaces,
        createWorkspace,
        joinWorkspace,
        leaveWorkspace,
        setActiveWorkspace,
        getMemberRole,
        clearError,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return context;
}

export default WorkspaceContext;
