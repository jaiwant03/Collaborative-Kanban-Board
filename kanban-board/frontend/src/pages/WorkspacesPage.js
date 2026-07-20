import React, { useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/common/Layout';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import Button from '../components/common/Button';
import WorkspaceCard from '../components/workspace/WorkspaceCard';
import CreateWorkspaceModal from '../components/workspace/CreateWorkspaceModal';
import JoinWorkspaceModal from '../components/workspace/JoinWorkspaceModal';
import useModal from '../hooks/useModal';

function WorkspacesPage() {
  const { workspaces, isLoading, fetchWorkspaces } = useWorkspace();
  const { user } = useAuth();
  const createModal = useModal();
  const joinModal = useModal();

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  return (
    <Layout>
      <div className="page">
        {/* Page header */}
        <div className="page__header">
          <div>
            <h1 className="page__title">Workspaces</h1>
            <p className="page__subtitle">
              Welcome back, <strong>{user?.name}</strong>. Manage your team workspaces below.
            </p>
          </div>
          <div className="page__header-actions">
            <Button variant="ghost" onClick={joinModal.open}>
              Join Workspace
            </Button>
            <Button variant="primary" onClick={createModal.open}>
              + New Workspace
            </Button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="page__loading">
            <Spinner size="large" />
          </div>
        ) : workspaces.length === 0 ? (
          <EmptyState
            icon="🏢"
            title="No workspaces yet"
            description="Create a new workspace to get started, or join one with an invite code."
            actionLabel="Create Workspace"
            onAction={createModal.open}
          />
        ) : (
          <div className="workspace-grid">
            {workspaces.map((ws) => (
              <WorkspaceCard key={ws._id} workspace={ws} />
            ))}
          </div>
        )}

        {/* Modals */}
        <CreateWorkspaceModal isOpen={createModal.isOpen} onClose={createModal.close} />
        <JoinWorkspaceModal isOpen={joinModal.isOpen} onClose={joinModal.close} />
      </div>
    </Layout>
  );
}

export default WorkspacesPage;
