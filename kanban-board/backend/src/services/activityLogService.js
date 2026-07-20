const ActivityLog = require('../models/ActivityLog');
const { assertWorkspaceMember } = require('./workspaceService');

/**
 * Create an activity log entry.
 * Called internally by taskService, commentService, attachmentService, etc.
 * Never throws — activity logging must not break main flows.
 *
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string|null} params.taskId
 * @param {string} params.userId
 * @param {string} params.action   - one of ACTIVITY_ACTIONS
 * @param {string} params.description
 * @param {*} params.previousValue
 * @param {*} params.newValue
 */
const logActivity = async ({
  workspaceId,
  taskId = null,
  userId,
  action,
  description = '',
  previousValue = null,
  newValue = null,
}) => {
  try {
    await ActivityLog.create({
      workspace: workspaceId,
      task: taskId || null,
      user: userId,
      action,
      description,
      previousValue,
      newValue,
    });
  } catch (err) {
    // Log to stderr but never propagate — activity logging is best-effort
    console.error('[ActivityLog] Failed to write log entry:', err.message);
  }
};

/**
 * Get activity logs for a specific task.
 * @param {object} params
 * @param {string} params.taskId
 * @param {string} params.workspaceId
 * @param {string} params.userId   - requesting user (for membership check)
 * @param {number} params.page
 * @param {number} params.limit
 */
const getTaskActivity = async ({ taskId, workspaceId, userId, page = 1, limit = 30 }) => {
  await assertWorkspaceMember(workspaceId, userId);

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    ActivityLog.find({ task: taskId, workspace: workspaceId })
      .populate('user', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ActivityLog.countDocuments({ task: taskId, workspace: workspaceId }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get workspace-wide activity feed.
 */
const getWorkspaceActivity = async ({ workspaceId, userId, page = 1, limit = 50 }) => {
  await assertWorkspaceMember(workspaceId, userId);

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    ActivityLog.find({ workspace: workspaceId })
      .populate('user', 'name email avatar')
      .populate('task', 'title status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ActivityLog.countDocuments({ workspace: workspaceId }),
  ]);

  return {
    logs,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

module.exports = { logActivity, getTaskActivity, getWorkspaceActivity };
