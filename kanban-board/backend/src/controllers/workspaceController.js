const workspaceService = require('../services/workspaceService');
const { successResponse } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/errorHandler');

/**
 * @route  GET /workspaces
 * @access Private
 */
const getWorkspaces = asyncHandler(async (req, res) => {
  const workspaces = await workspaceService.getUserWorkspaces(req.user._id);
  successResponse(res, { workspaces }, 'Workspaces fetched.');
});

/**
 * @route  POST /workspaces
 * @access Private
 */
const createWorkspace = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const workspace = await workspaceService.createWorkspace({
    name,
    description,
    userId: req.user._id,
  });
  successResponse(res, { workspace }, 'Workspace created.', 201);
});

/**
 * @route  POST /workspaces/join
 * @access Private
 */
const joinWorkspace = asyncHandler(async (req, res) => {
  const { inviteCode } = req.body;
  const workspace = await workspaceService.joinWorkspace({
    inviteCode,
    userId: req.user._id,
  });
  successResponse(res, { workspace }, 'Joined workspace successfully.');
});

/**
 * @route  DELETE /workspaces/:id/leave
 * @access Private
 */
const leaveWorkspace = asyncHandler(async (req, res) => {
  const result = await workspaceService.leaveWorkspace({
    workspaceId: req.params.id,
    userId: req.user._id,
  });
  successResponse(res, null, result.message);
});

/**
 * @route  GET /workspaces/:id/members
 * @access Private
 */
const getWorkspaceMembers = asyncHandler(async (req, res) => {
  const members = await workspaceService.getWorkspaceMembers(
    req.params.id,
    req.user._id
  );
  successResponse(res, { members }, 'Members fetched.');
});

/**
 * @route  PATCH /workspaces/:id/members/:memberId
 * @access Private – owner only
 */
const updateMemberRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const members = await workspaceService.updateMemberRole({
    workspaceId:       req.params.id,
    requestingUserId:  req.user._id,
    targetUserId:      req.params.memberId,
    newRole:           role,
  });
  successResponse(res, { members }, 'Member role updated.');
});

module.exports = {
  getWorkspaces,
  createWorkspace,
  joinWorkspace,
  leaveWorkspace,
  getWorkspaceMembers,
  updateMemberRole,
};
