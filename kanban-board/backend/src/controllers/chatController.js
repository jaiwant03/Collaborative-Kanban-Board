const ChatMessage = require('../models/ChatMessage');
const { asyncHandler, createError } = require('../utils/errorHandler');
const { successResponse } = require('../utils/apiResponse');
const { assertWorkspaceMember } = require('../services/workspaceService');

/**
 * GET /chat/:workspaceId?limit=50&before=<ISO date>
 *
 * Returns messages newest-first (client reverses for display).
 * Supports cursor-based pagination via `before` (ISO timestamp).
 */
const getMessages = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const limit  = Math.min(parseInt(req.query.limit) || 50, 100);
  const before = req.query.before ? new Date(req.query.before) : null;

  // Must be a workspace member to read chat
  await assertWorkspaceMember(workspaceId, req.user._id);

  const filter = { workspace: workspaceId };
  if (before && !isNaN(before)) {
    filter.createdAt = { $lt: before };
  }

  const messages = await ChatMessage.find(filter)
    .sort({ createdAt: -1 })     // newest first
    .limit(limit)
    .populate('sender', 'name email')
    .lean();

  // Return in chronological order so the client can append directly
  messages.reverse();

  successResponse(res, { messages }, 'Messages fetched.');
});

module.exports = { getMessages };
