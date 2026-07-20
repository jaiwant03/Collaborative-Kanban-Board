import api from './api';

const invitationService = {
  /**
   * Send an invitation.
   * POST /invitations
   */
  inviteUser(workspaceId, email, role = 'member') {
    return api.post('/invitations', { workspaceId, email, role });
  },

  /**
   * List invitations for a workspace.
   * GET /invitations/:workspaceId
   */
  listInvitations(workspaceId) {
    return api.get(`/invitations/${workspaceId}`);
  },

  /**
   * Resend an invitation.
   * POST /invitations/:id/resend
   */
  resendInvitation(invitationId, workspaceId) {
    return api.post(`/invitations/${invitationId}/resend`, { workspaceId });
  },

  /**
   * Cancel an invitation.
   * DELETE /invitations/:id?workspaceId=
   */
  cancelInvitation(invitationId, workspaceId) {
    return api.delete(`/invitations/${invitationId}`, { params: { workspaceId } });
  },

  /**
   * Accept an invitation using the token from the invite link.
   * POST /invitations/accept
   */
  acceptInvitation(token) {
    return api.post('/invitations/accept', { token });
  },
};

export default invitationService;
