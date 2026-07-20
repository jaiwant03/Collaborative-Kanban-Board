import React, { useState } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';

function JoinWorkspaceModal({ isOpen, onClose }) {
  const { joinWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) { setError('Invite code is required.'); return; }
    setIsLoading(true);
    const result = await joinWorkspace(inviteCode.trim().toUpperCase());
    setIsLoading(false);
    if (result.success) {
      toast.success(`Joined "${result.workspace.name}"!`);
      setInviteCode('');
      onClose();
    } else {
      toast.error(result.message);
    }
  };

  const handleClose = () => {
    setInviteCode('');
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Join Workspace"
      titleIcon="🔗"
    >
      <div className="modal-hint">
        <span aria-hidden="true">💡</span>{' '}
        Ask a workspace owner for their invite code to join.
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <Input
          id="invite-code"
          name="inviteCode"
          label="Invite Code"
          placeholder="e.g. ABC1234567"
          value={inviteCode}
          onChange={(e) => { setInviteCode(e.target.value); setError(''); }}
          error={error}
          required
          autoFocus
          icon="🔑"
          style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}
        />
        <div className="modal-actions">
          <div className="modal-actions__right">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Join Workspace
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default JoinWorkspaceModal;
