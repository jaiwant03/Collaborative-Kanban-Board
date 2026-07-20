const invitationService = require('../services/invitationService');
const { successResponse } = require('../utils/apiResponse');
const { asyncHandler, createError } = require('../utils/errorHandler');

/**
 * @route  POST /invitations
 * @access Private – manager or above
 */
const inviteUser = asyncHandler(async (req, res) => {
  const { workspaceId, email, role } = req.body;

  let invitation;
  try {
    invitation = await invitationService.inviteUser({
      workspaceId,
      invitedByUserId: req.user._id,
      email,
      role,
    });
  } catch (err) {
    // Distinguish between business-logic errors (4xx) and SMTP errors (502)
    if (err.statusCode) throw err; // re-throw 404/409/403 etc. as-is

    // SMTP / email delivery failure — invitation was saved, email didn't go out
    console.error('[InvitationController] SMTP delivery failed:', err.message);
    throw createError(
      `Invitation saved but email delivery failed: ${err.message}. ` +
      'Use the Resend button to try again, or check SMTP credentials in the server environment.',
      502
    );
  }

  successResponse(res, { invitation }, 'Invitation sent.', 201);
});

/**
 * @route  GET /invitations/:workspaceId
 * @access Private – manager or above
 */
const listInvitations = asyncHandler(async (req, res) => {
  const invitations = await invitationService.listInvitations({
    workspaceId: req.params.workspaceId,
    userId: req.user._id,
  });

  successResponse(res, { invitations }, 'Invitations fetched.');
});

/**
 * @route  POST /invitations/:id/resend
 * @access Private – manager or above
 */
const resendInvitation = asyncHandler(async (req, res) => {
  let invitation;
  try {
    invitation = await invitationService.resendInvitation({
      invitationId: req.params.id,
      workspaceId:  req.body.workspaceId,
      userId:       req.user._id,
    });
  } catch (err) {
    if (err.statusCode) throw err;
    console.error('[InvitationController] Resend SMTP failure:', err.message);
    throw createError(`Email delivery failed: ${err.message}`, 502);
  }

  successResponse(res, { invitation }, 'Invitation resent.');
});

/**
 * @route  DELETE /invitations/:id?workspaceId=
 * @access Private – manager or above
 */
const cancelInvitation = asyncHandler(async (req, res) => {
  const result = await invitationService.cancelInvitation({
    invitationId: req.params.id,
    workspaceId:  req.query.workspaceId || req.body.workspaceId,
    userId:       req.user._id,
  });

  successResponse(res, null, result.message);
});

/**
 * @route  POST /invitations/accept
 * @access Private – any authenticated user
 */
const acceptInvitation = asyncHandler(async (req, res) => {
  const { token } = req.body;

  const { workspace, alreadyMember } = await invitationService.acceptInvitation({
    token,
    userId: req.user._id,
  });

  successResponse(
    res,
    { workspace },
    alreadyMember
      ? 'You are already a member of this workspace.'
      : 'You have joined the workspace.'
  );
});

module.exports = {
  inviteUser,
  listInvitations,
  resendInvitation,
  cancelInvitation,
  acceptInvitation,
};
