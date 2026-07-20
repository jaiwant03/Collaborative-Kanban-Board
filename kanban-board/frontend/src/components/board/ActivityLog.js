import React, { useState, useEffect, useCallback } from 'react';
import activityService from '../../services/activityService';
import Spinner from '../common/Spinner';
import { useWorkspace } from '../../context/WorkspaceContext';

const ACTION_ICONS = {
  task_created:       '✅',
  task_updated:       '✏️',
  task_deleted:       '🗑️',
  task_moved:         '↔️',
  assignee_changed:   '👤',
  due_date_changed:   '📅',
  priority_changed:   '🚨',
  labels_updated:     '🏷️',
  comment_added:      '💬',
  comment_edited:     '✏️',
  comment_deleted:    '🗑️',
  attachment_uploaded:'📎',
  attachment_deleted: '🗑️',
  member_invited:     '📧',
  member_joined:      '🎉',
  member_removed:     '👋',
  role_changed:       '🔑',
};

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

function ActivityLog({ taskId }) {
  const { activeWorkspace } = useWorkspace();
  const [logs, setLogs]       = useState([]);
  const [isLoading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const workspaceId = activeWorkspace?._id;

  const fetchLogs = useCallback(async () => {
    if (!taskId || !workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await activityService.getTaskActivity(taskId, workspaceId);
      setLogs(res.data.logs || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load activity.');
    } finally {
      setLoading(false);
    }
  }, [taskId, workspaceId]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  if (isLoading) return (
    <div className="activity-log__loading">
      <Spinner size="small" />
    </div>
  );

  if (error) return (
    <div className="alert alert--error" style={{ marginTop: '1rem' }}>{error}</div>
  );

  if (!logs.length) return (
    <div className="activity-log__empty">No activity yet.</div>
  );

  return (
    <div className="activity-log">
      {logs.map((log) => (
        <div key={log._id} className="activity-log__item">
          <div className="activity-log__icon" aria-hidden="true">
            {ACTION_ICONS[log.action] ?? '•'}
          </div>
          <div className="activity-log__content">
            <span className="activity-log__user">{log.user?.name ?? 'Someone'}</span>
            {' '}
            <span className="activity-log__description">{log.description}</span>
          </div>
          <time className="activity-log__time" dateTime={log.createdAt} title={new Date(log.createdAt).toLocaleString()}>
            {timeAgo(log.createdAt)}
          </time>
        </div>
      ))}
    </div>
  );
}

export default ActivityLog;
