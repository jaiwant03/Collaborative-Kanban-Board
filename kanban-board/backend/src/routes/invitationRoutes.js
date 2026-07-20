const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const {
  inviteUser,
  listInvitations,
  resendInvitation,
  cancelInvitation,
  acceptInvitation,
} = require('../controllers/invitationController');
const { protect } = require('../middleware/auth');
const { checkWorkspaceRole } = require('../middleware/rbac');
const validate = require('../middleware/validate');

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: Static/literal routes MUST come before parameterised ones.
// POST /accept  must be above  GET /:workspaceId  otherwise Express matches
// the literal string "accept" as a :workspaceId value and fails validation.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /invitations/accept
 * Accept an invitation using the token from the invite link.
 * Any authenticated user can accept — no role check needed here.
 */
router.post(
  '/accept',
  protect,
  [body('token').notEmpty().withMessage('Token is required')],
  validate,
  acceptInvitation
);

/**
 * POST /invitations
 * Send an invitation to a user by email.
 * Requires manager role or above in the workspace.
 */
router.post(
  '/',
  protect,
  [
    body('workspaceId').isMongoId().withMessage('workspaceId is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('role')
      .optional()
      .isIn(['admin', 'manager', 'member', 'viewer'])
      .withMessage('Invalid role'),
  ],
  validate,
  checkWorkspaceRole('manager'),
  inviteUser
);

/**
 * GET /invitations/:workspaceId
 * List all invitations for a workspace.
 */
router.get(
  '/:workspaceId',
  protect,
  [param('workspaceId').isMongoId().withMessage('Invalid workspace ID')],
  validate,
  checkWorkspaceRole('manager'),
  listInvitations
);

/**
 * POST /invitations/:id/resend
 * Resend a pending or expired invitation.
 * checkWorkspaceRole reads workspaceId from req.body.workspaceId.
 */
router.post(
  '/:id/resend',
  protect,
  [
    param('id').isMongoId().withMessage('Invalid invitation ID'),
    body('workspaceId').isMongoId().withMessage('workspaceId is required'),
  ],
  validate,
  checkWorkspaceRole('manager'),
  resendInvitation
);

/**
 * DELETE /invitations/:id?workspaceId=
 * Cancel a pending invitation.
 *
 * NOTE: checkWorkspaceRole is placed AFTER the handler intentionally — the
 * RBAC middleware resolves workspaceId from req.query.workspaceId for DELETE
 * requests (there is no body on a DELETE).  We pass it explicitly so the
 * middleware does not accidentally pick up req.params.id as the workspace ID.
 */
router.delete(
  '/:id',
  protect,
  [
    param('id').isMongoId().withMessage('Invalid invitation ID'),
    query('workspaceId').isMongoId().withMessage('workspaceId query param is required'),
  ],
  validate,
  // Middleware reads req.query.workspaceId — verified above
  checkWorkspaceRole('manager'),
  cancelInvitation
);

module.exports = router;
