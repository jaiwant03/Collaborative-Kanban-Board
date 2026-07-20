const Workspace = require('../models/Workspace');
const { createError } = require('../utils/errorHandler');

/**
 * Role hierarchy — higher index = more permissions.
 * Roles are additive: a role at index N can do everything roles at index 0..N can do.
 */
const ROLE_HIERARCHY = ['viewer', 'member', 'manager', 'admin', 'owner'];

/**
 * Returns the numeric rank of a role (higher = more powerful).
 * Unknown roles get -1 so every check fails safely.
 */
const roleRank = (role) => ROLE_HIERARCHY.indexOf(role ?? '');

/**
 * checkWorkspaceRole(minimumRole)
 *
 * Express middleware factory. Looks up the calling user's membership in the
 * workspace identified by req.params.workspaceId (or req.body.workspaceId for
 * POST routes) and rejects the request when the user's role is below the
 * required minimum.
 *
 * Must be used AFTER the `protect` middleware so that req.user is set.
 *
 * Usage:
 *   router.post('/workspaces/:workspaceId/invite',
 *     protect,
 *     checkWorkspaceRole('manager'),
 *     inviteHandler
 *   );
 *
 * @param {string} minimumRole - 'viewer' | 'member' | 'manager' | 'admin' | 'owner'
 */
const checkWorkspaceRole = (minimumRole) => {
  const requiredRank = roleRank(minimumRole);
  if (requiredRank === -1) {
    throw new Error(`checkWorkspaceRole: unknown role "${minimumRole}"`);
  }

  return async (req, res, next) => {
    try {
      // Resolution order (most-specific first):
      //  1. Named :workspaceId param  — routes like /workspaces/:workspaceId/...
      //  2. Body workspaceId          — POST/PUT with JSON body
      //  3. Query workspaceId         — GET/DELETE with ?workspaceId=
      //  4. Named :id param ONLY when it looks like a MongoDB ObjectId AND
      //     no workspaceId was found elsewhere — avoids grabbing invitation/task IDs
      const fromParams = req.params.workspaceId;
      const fromBody   = req.body?.workspaceId;
      const fromQuery  = req.query?.workspaceId;

      // Only fall back to :id if it is a 24-char hex ObjectId AND
      // neither body nor query supplied a workspaceId
      const idParam = req.params.id;
      const idLooksLikeObjectId = idParam && /^[a-f\d]{24}$/i.test(idParam);
      const fromId = (!fromBody && !fromQuery && idLooksLikeObjectId) ? idParam : null;

      const workspaceId = fromParams || fromBody || fromQuery || fromId;

      if (!workspaceId) {
        return next(createError('Workspace ID is required.', 400));
      }

      const workspace = await Workspace.findById(workspaceId).select('members owner');
      if (!workspace) {
        return next(createError('Workspace not found.', 404));
      }

      const membership = workspace.members.find(
        (m) => m.user.toString() === req.user._id.toString()
      );

      if (!membership) {
        return next(createError('You are not a member of this workspace.', 403));
      }

      const userRank = roleRank(membership.role);
      if (userRank < requiredRank) {
        return next(
          createError(
            `This action requires at least the "${minimumRole}" role. Your role is "${membership.role}".`,
            403
          )
        );
      }

      // Attach the resolved role and workspace to the request for downstream use
      req.workspaceMembership = membership;
      req.workspaceRole = membership.role;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * canManageTask(req, task)
 *
 * Helper (not middleware) used inside service functions to check whether a
 * user can modify a specific task.
 *
 * Rules:
 *  - admin / owner / manager  → always
 *  - member                   → only if they are the task creator or assignee
 *  - viewer                   → never
 */
const canManageTask = (role, task, userId) => {
  const userIdStr = userId.toString();
  if (['owner', 'admin', 'manager'].includes(role)) return true;
  if (role === 'member') {
    const isCreator  = task.createdBy?.toString() === userIdStr;
    const isAssignee = task.assignee?.toString()  === userIdStr;
    return isCreator || isAssignee;
  }
  return false; // viewer
};

module.exports = { checkWorkspaceRole, canManageTask, roleRank, ROLE_HIERARCHY };
