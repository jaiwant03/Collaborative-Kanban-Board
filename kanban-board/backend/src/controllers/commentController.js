const commentService = require('../services/commentService');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/errorHandler');
const { getIo } = require('../config/socket');

/**
 * @route  GET /comments/task/:taskId?workspaceId=&page=&limit=
 * @access Private
 */
const getComments = asyncHandler(async (req, res) => {
  const { taskId }  = req.params;
  const workspaceId = req.query.workspaceId;
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 50;

  const { comments, pagination } = await commentService.getComments({
    taskId,
    workspaceId,
    userId: req.user._id,
    page,
    limit,
  });

  paginatedResponse(res, { comments }, pagination, 'Comments fetched.');
});

/**
 * @route  POST /comments/task/:taskId
 * @access Private
 */
const addComment = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { workspaceId, content } = req.body;

  const comment = await commentService.addComment({
    taskId,
    workspaceId,
    userId: req.user._id,
    content,
  });

  // Broadcast to workspace room via Socket.io
  try {
    getIo().to(`workspace:${workspaceId}`).emit('comment:added', { taskId, comment });
  } catch (_) { /* socket not yet initialised in tests */ }

  successResponse(res, { comment }, 'Comment added.', 201);
});

/**
 * @route  PUT /comments/:id
 * @access Private
 */
const editComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { workspaceId, content } = req.body;

  const comment = await commentService.editComment({
    commentId: id,
    workspaceId,
    userId: req.user._id,
    content,
  });

  try {
    getIo().to(`workspace:${workspaceId}`).emit('comment:updated', { comment });
  } catch (_) {}

  successResponse(res, { comment }, 'Comment updated.');
});

/**
 * @route  DELETE /comments/:id
 * @access Private
 */
const deleteComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const workspaceId = req.query.workspaceId || req.body.workspaceId;

  const result = await commentService.deleteComment({
    commentId: id,
    workspaceId,
    userId: req.user._id,
    userRole: req.workspaceRole || 'member',
  });

  try {
    getIo().to(`workspace:${workspaceId}`).emit('comment:deleted', { commentId: id });
  } catch (_) {}

  successResponse(res, null, result.message);
});

module.exports = { getComments, addComment, editComment, deleteComment };
