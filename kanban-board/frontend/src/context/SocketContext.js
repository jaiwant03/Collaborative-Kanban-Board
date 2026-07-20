import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const SOCKET_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export function SocketProvider({ children }) {
  const { isAuthenticated, token } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  /** Set of workspaceId strings the socket has joined */
  const joinedRoomsRef = useRef(new Set());

  // Initialise/tear-down socket connection based on auth state
  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
        joinedRoomsRef.current.clear();
      }
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socket.on('connect', () => {
      setConnected(true);
      // Re-join any rooms that were joined before reconnect
      joinedRoomsRef.current.forEach((wsId) => {
        socket.emit('join:workspace', { workspaceId: wsId });
      });
    });

    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => {
      console.warn('[Socket] connect error:', err.message);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [isAuthenticated, token]);

  /** Join a workspace room to receive scoped events */
  const joinWorkspace = useCallback((workspaceId) => {
    if (!workspaceId) return;
    joinedRoomsRef.current.add(workspaceId);
    if (socketRef.current?.connected) {
      socketRef.current.emit('join:workspace', { workspaceId });
    }
  }, []);

  /** Leave a workspace room */
  const leaveWorkspace = useCallback((workspaceId) => {
    if (!workspaceId) return;
    joinedRoomsRef.current.delete(workspaceId);
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave:workspace', { workspaceId });
    }
  }, []);

  /**
   * Subscribe to a socket event.
   * Returns an unsubscribe function — call it in a useEffect cleanup.
   *
   * Safe under React StrictMode: removes any existing listener for the same
   * event+handler before adding, so double-invocation never duplicates it.
   *
   * Usage:
   *   useEffect(() => subscribe('task:updated', handler), [subscribe]);
   */
  const subscribe = useCallback((event, handler) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    // Remove first to guarantee exactly one registration even if StrictMode
    // mounts this effect twice before the first cleanup runs.
    socket.off(event, handler);
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, []);

  /**
   * Emit a chat message to a workspace room.
   * Payload: { workspaceId: string, text: string }
   */
  const sendMessage = useCallback((workspaceId, text) => {
    if (!workspaceId || !text?.trim()) return;
    socketRef.current?.emit('chat:message', { workspaceId, text: text.trim() });
  }, []);

  return (
    <SocketContext.Provider
      value={{ connected, joinWorkspace, leaveWorkspace, subscribe, sendMessage, socket: socketRef }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}

export default SocketContext;
