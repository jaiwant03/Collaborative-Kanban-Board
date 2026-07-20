const activityLogService = require('../services/activityLogService');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/errorHandler');

/**
 * @route  GET /activity/task/:taskId
 * @access Private – any workspace member
 */
const getTaskActivity = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const workspaceId = req.query.workspaceId;
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 30;

  const { logs, pagination } = await activityLogService.getTaskActivity({
    taskId,
    workspaceId,
    userId: req.user._id,
    page,
    limit,
  });

  paginatedResponse(res, { logs }, pagination, 'Activity fetched.');
});

/**
 * @route  GET /activity/workspace/:workspaceId
 * @access Private – any workspace member
 */
const getWorkspaceActivity = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 50;

  const { logs, pagination } = await activityLogService.getWorkspaceActivity({
    workspaceId,
    userId: req.user._id,
    page,
    limit,
  });

  paginatedResponse(res, { logs }, pagination, 'Workspace activity fetched.');
});

module.exports = { getTaskActivity, getWorkspaceActivity };
