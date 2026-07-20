import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatDate, getInitials } from '../../utils/formatters';
import Button from '../common/Button';

function WorkspaceCard({ workspace }) {
  const { setActiveWorkspace, leaveWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const isOwner = workspace.owner?._id === user?._id;
  const memberCount = workspace.memberCount ?? workspace.members?.length ?? 0;

  const handleOpen = () => {
    setActiveWorkspace(workspace);
    navigate('/board');
  };

  const handleLeave = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Leave workspace "${workspace.name}"?`)) return;
    const result = await leaveWorkspace(workspace._id);
    if (result.success) toast.success('Left workspace.');
    else toast.error(result.message);
  };

  const handleCopyCode = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(workspace.inviteCode).then(() => {
      toast.success('Invite code copied!');
    });
  };

  return (
    <article
      className="workspace-card"
      aria-label={`Workspace: ${workspace.name}`}
    >
      <div className="workspace-card__header">
        <div className="workspace-card__avatar" aria-hidden="true">
          {getInitials(workspace.name)}
        </div>
        <div className="workspace-card__info">
          <h3 className="workspace-card__name">{workspace.name}</h3>
          {isOwner && (
            <span className="workspace-card__owner-badge">
              <span aria-hidden="true">★</span> Owner
            </span>
          )}
        </div>
      </div>

      {workspace.description && (
        <p className="workspace-card__description">{workspace.description}</p>
      )}

      <div className="workspace-card__meta">
        <span className="workspace-card__meta-item">
          <span aria-hidden="true">👥</span>
          {memberCount} member{memberCount !== 1 ? 's' : ''}
        </span>
        <span className="workspace-card__meta-item">
          <span aria-hidden="true">📅</span>
          {formatDate(workspace.createdAt)}
        </span>
      </div>

      {isOwner && (
        <div className="workspace-card__invite">
          <span className="workspace-card__invite-label">Invite</span>
          <code className="workspace-card__invite-code">{workspace.inviteCode}</code>
          <button
            className="workspace-card__invite-copy"
            onClick={handleCopyCode}
            aria-label="Copy invite code"
            title="Copy invite code"
          >
            📋
          </button>
        </div>
      )}

      <div className="workspace-card__actions">
        <Button variant="primary" size="small" onClick={handleOpen}>
          Open Board →
        </Button>
        {!isOwner && (
          <Button variant="danger" size="small" onClick={handleLeave}>
            Leave
          </Button>
        )}
      </div>
    </article>
  );
}

export default WorkspaceCard;
