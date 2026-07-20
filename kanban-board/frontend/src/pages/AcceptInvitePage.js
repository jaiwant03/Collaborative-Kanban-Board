import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import invitationService from '../services/invitationService';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import Spinner from '../components/common/Spinner';
import Button from '../components/common/Button';

/**
 * Handles the /invite/accept?token=<TOKEN> route.
 *
 * Flow:
 *  1. If the user is not authenticated → redirect to /login (with returnUrl)
 *  2. If authenticated → call POST /invitations/accept with the token
 *  3. On success → add workspace to context and navigate to /board
 *  4. On error → show error card with link to home
 */
function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token          = searchParams.get('token');

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { fetchWorkspaces, setActiveWorkspace }      = useWorkspace();
  const navigate = useNavigate();

  const [status,  setStatus]  = useState('idle');   // idle | loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate(`/login?returnUrl=${encodeURIComponent(`/invite/accept?token=${token}`)}`);
      return;
    }

    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing invitation token.');
      return;
    }

    const accept = async () => {
      setStatus('loading');
      try {
        const res = await invitationService.acceptInvitation(token);
        const workspace = res.data.workspace;

        // Refresh workspace list and set the joined one as active
        await fetchWorkspaces();
        setActiveWorkspace(workspace);

        setStatus('success');
        setMessage(res.message || 'You have joined the workspace!');

        // Navigate to board after a short delay so the user sees the success message
        setTimeout(() => navigate('/board'), 1800);
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Failed to accept invitation.');
      }
    };

    accept();
    // Run once on mount after auth is resolved
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

  return (
    <div className="accept-invite-page">
      <div className="accept-invite-card">
        {status === 'idle' || status === 'loading' ? (
          <>
            <div className="accept-invite-card__icon">🎉</div>
            <h1 className="accept-invite-card__title">Joining workspace…</h1>
            <p className="accept-invite-card__subtitle">Please wait while we process your invitation.</p>
            <Spinner size="medium" />
          </>
        ) : status === 'success' ? (
          <>
            <div className="accept-invite-card__icon">✅</div>
            <h1 className="accept-invite-card__title">Welcome aboard!</h1>
            <p className="accept-invite-card__subtitle">{message}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>Redirecting to your board…</p>
          </>
        ) : (
          <>
            <div className="accept-invite-card__icon">❌</div>
            <h1 className="accept-invite-card__title">Invitation Error</h1>
            <p className="accept-invite-card__subtitle">{message}</p>
            <Button variant="primary" onClick={() => navigate('/workspaces')}>
              Go to Workspaces
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default AcceptInvitePage;
