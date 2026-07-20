import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import chatService from '../../services/chatService';
import Spinner from '../common/Spinner';

/**
 * ChatPanel — real-time workspace chat over Socket.IO.
 * Messages are persisted to MongoDB and loaded on open.
 *
 * Props:
 *   workspaceId  string   — active workspace _id
 *   isOpen       boolean  — whether the panel is visible
 *   onClose      fn       — called when the × button is clicked
 */
function ChatPanel({ workspaceId, isOpen, onClose }) {
  const { subscribe, sendMessage, connected } = useSocket();
  const { user } = useAuth();

  const [messages,    setMessages]    = useState([]);
  const [text,        setText]        = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  // Track IDs that came in from history so live duplicates are ignored
  const seenIdsRef = useRef(new Set());

  // ── Load history from MongoDB when panel opens ──────────────────────────
  useEffect(() => {
    if (!isOpen || !workspaceId) return;

    let cancelled = false;
    setHistoryLoading(true);
    seenIdsRef.current.clear();

    chatService.getMessages(workspaceId, { limit: 50 })
      .then((res) => {
        if (cancelled) return;
        const history = res.data.messages || [];
        // Normalise: history rows have sender as populated object
        const normalised = history.map((m) => ({
          id:          m._id,
          _id:         m._id,
          workspaceId: m.workspace || workspaceId,
          text:        m.text,
          sender: {
            _id:   m.sender._id || m.sender,
            name:  m.sender.name  || '',
            email: m.sender.email || '',
          },
          createdAt: m.createdAt,
        }));
        normalised.forEach((m) => seenIdsRef.current.add(m._id));
        setMessages(normalised);
      })
      .catch(() => {
        // Non-fatal — user can still send new messages
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => { cancelled = true; };
  }, [isOpen, workspaceId]);

  // ── Subscribe to live messages ──────────────────────────────────────────
  useEffect(() => {
    const unsub = subscribe('chat:message', (msg) => {
      if (msg.workspaceId !== workspaceId) return;
      // Deduplicate: ignore if this _id already came in from history
      if (seenIdsRef.current.has(msg._id || msg.id)) return;
      seenIdsRef.current.add(msg._id || msg.id);
      setMessages((prev) => [...prev, msg]);
    });
    return unsub;
  }, [subscribe, workspaceId]);

  // ── Clear state when workspace changes ─────────────────────────────────
  useEffect(() => {
    setMessages([]);
    seenIdsRef.current.clear();
  }, [workspaceId]);

  // ── Scroll to bottom on new message ────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Focus input when panel opens ───────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [isOpen]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || !workspaceId) return;
    sendMessage(workspaceId, trimmed);
    setText('');
  }, [text, workspaceId, sendMessage]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Avatar initials helper
  const initials = (name = '') =>
    name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  // Format timestamp
  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <aside className="chat-panel" aria-label="Workspace chat">
      {/* Header */}
      <div className="chat-panel__header">
        <div className="chat-panel__header-left">
          <span className="chat-panel__icon">💬</span>
          <div>
            <h3 className="chat-panel__title">Team Chat</h3>
            <span className={`chat-panel__status ${connected ? 'chat-panel__status--online' : 'chat-panel__status--offline'}`}>
              {connected ? 'Connected' : 'Reconnecting…'}
            </span>
          </div>
        </div>
        <button
          className="chat-panel__close"
          onClick={onClose}
          aria-label="Close chat"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="chat-panel__messages" role="log" aria-live="polite">
        {historyLoading ? (
          <div className="chat-panel__empty">
            <Spinner size="small" />
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-panel__empty">
            <span className="chat-panel__empty-icon">👋</span>
            <p>No messages yet.</p>
            <p>Say hello to your team!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const senderId = msg.sender?._id?.toString?.() || msg.sender?._id;
            const isOwn    = senderId === user?._id?.toString?.() || senderId === user?._id;
            return (
              <div
                key={msg._id || msg.id}
                className={`chat-msg ${isOwn ? 'chat-msg--own' : 'chat-msg--other'}`}
              >
                {!isOwn && (
                  <div
                    className="chat-msg__avatar"
                    aria-hidden="true"
                    title={msg.sender.name}
                  >
                    {initials(msg.sender.name)}
                  </div>
                )}
                <div className="chat-msg__body">
                  {!isOwn && (
                    <span className="chat-msg__sender">{msg.sender.name}</span>
                  )}
                  <div className="chat-msg__bubble">
                    <p className="chat-msg__text">{msg.text}</p>
                    <span className="chat-msg__time">{formatTime(msg.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-panel__input-row">
        <textarea
          ref={inputRef}
          className="chat-panel__input"
          placeholder="Type a message… (Enter to send)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          maxLength={1000}
          aria-label="Chat message input"
          disabled={!connected}
        />
        <button
          className="chat-panel__send"
          onClick={handleSend}
          disabled={!text.trim() || !connected}
          aria-label="Send message"
        >
          ➤
        </button>
      </div>
    </aside>
  );
}

export default ChatPanel;
