import React, { useState, useEffect, useCallback, useRef } from 'react';
import commentService from '../../services/commentService';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { getInitials } from '../../utils/formatters';
import Spinner from '../common/Spinner';
import Button from '../common/Button';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

function CommentSection({ taskId }) {
  const { user }               = useAuth();
  const { activeWorkspace }    = useWorkspace();
  const workspaceId            = activeWorkspace?._id;

  const [comments, setComments] = useState([]);
  const [isLoading, setLoading] = useState(false);
  const [newText,   setNewText] = useState('');
  const [saving,    setSaving]  = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText,  setEditText]  = useState('');
  const textareaRef = useRef(null);

  const fetchComments = useCallback(async () => {
    if (!taskId || !workspaceId) return;
    setLoading(true);
    try {
      const res = await commentService.getComments(taskId, workspaceId);
      setComments(res.data.comments || []);
    } catch (_) {}
    finally { setLoading(false); }
  }, [taskId, workspaceId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const handleAdd = async () => {
    if (!newText.trim()) return;
    setSaving(true);
    try {
      const res = await commentService.addComment(taskId, workspaceId, newText.trim());
      setComments((prev) => [...prev, res.data.comment]);
      setNewText('');
    } catch (_) {}
    finally { setSaving(false); }
  };

  const startEdit = (comment) => {
    setEditingId(comment._id);
    setEditText(comment.content);
  };

  const cancelEdit = () => { setEditingId(null); setEditText(''); };

  const saveEdit = async (id) => {
    if (!editText.trim()) return;
    try {
      const res = await commentService.editComment(id, workspaceId, editText.trim());
      setComments((prev) => prev.map((c) => c._id === id ? res.data.comment : c));
      cancelEdit();
    } catch (_) {}
  };

  const handleDelete = async (id) => {
    try {
      await commentService.deleteComment(id, workspaceId);
      setComments((prev) => prev.filter((c) => c._id !== id));
    } catch (_) {}
  };

  return (
    <div className="comment-section">
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '1rem' }}><Spinner size="small" /></div>
      ) : comments.length === 0 ? (
        <p className="comment-section__empty">No comments yet. Be the first!</p>
      ) : (
        <div className="comment-list">
          {comments.map((c) => (
            <div key={c._id} className="comment-item">
              <div className="comment-item__avatar" aria-hidden="true">
                {getInitials(c.author?.name ?? '')}
              </div>
              <div className="comment-item__body">
                <div className="comment-item__header">
                  <strong className="comment-item__author">{c.author?.name ?? 'Unknown'}</strong>
                  <time className="comment-item__time">{timeAgo(c.createdAt)}</time>
                  {c.isEdited && <span className="comment-item__edited">(edited)</span>}
                </div>

                {editingId === c._id ? (
                  <div className="comment-item__edit">
                    <textarea
                      className="form-input form-textarea"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      autoFocus
                    />
                    <div className="comment-item__edit-actions">
                      <Button variant="primary" size="small" onClick={() => saveEdit(c._id)}>Save</Button>
                      <Button variant="ghost"   size="small" onClick={cancelEdit}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <p className="comment-item__text">{c.content}</p>
                )}

                {/* Actions — only show for own comments */}
                {c.author?._id === user?._id && editingId !== c._id && (
                  <div className="comment-item__actions">
                    <button className="comment-item__action-btn" onClick={() => startEdit(c)}>Edit</button>
                    <button
                      className="comment-item__action-btn comment-item__action-btn--danger"
                      onClick={() => handleDelete(c._id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New comment input */}
      <div className="comment-compose">
        <div className="comment-compose__avatar" aria-hidden="true">
          {getInitials(user?.name ?? '')}
        </div>
        <div className="comment-compose__input-wrap">
          <textarea
            ref={textareaRef}
            className="form-input form-textarea comment-compose__textarea"
            placeholder="Add a comment…"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAdd();
            }}
            rows={2}
          />
          <div className="comment-compose__footer">
            <span className="comment-compose__hint">Ctrl+Enter to send</span>
            <Button
              variant="primary"
              size="small"
              onClick={handleAdd}
              isLoading={saving}
              disabled={!newText.trim()}
            >
              Comment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommentSection;
