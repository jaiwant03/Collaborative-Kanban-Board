const Comment = require('../models/Comment');
const Task = require('../models/Task');
const { assertWorkspaceMember } = require('./workspaceService');
const { logActivity } = require('./activityLogService');
const { createError } = require('../utils/errorHandler');

/**
 * Parse @mentions from comment content.
 * Returns an array of user IDs found inside @[UserName](userId) syntax
 * OR bare word mentions — we store only ObjectId-style mentions.
 * Frontend embeds mentions as @[Name](id) so we parse that.
 */
const parseMentions = (content) => {
  const mentionRegex = /@\[.+?\]\(([a-f0-9]{24})\)/g;
  const ids = [];
  let match;
  while ((match = mentionRegex.exec(content)) !== null) {
    ids.push(match[1]);
  }
  return [...new Set(ids)];
};

/** Assert the task exists and belongs to the workspace */
const assertTask = async (taskId, workspaceId) => {
  const task = await Task.findOne({ _id: taskId, workspace: workspaceId, isArchived: false });
  if (!task) throw createError('Task not found.', 404);
  return task;
};

/**
 * Get comments for a task (paginated, oldest-first).
 */
const getComments = async ({ taskId, workspaceId, userId, page = 1, limit = 50 }) => {
  await assertWorkspaceMember(workspaceId, userId);
  await assertTask(taskId, workspaceId);

  const skip = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    Comment.find({ task: taskId, isDeleted: false })
      .populate('author', 'name email avatar')
      .populate('mentions', 'name email')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit),
    Comment.countDocuments({ task: taskId, isDeleted: false }),
  ]);

  return {
    comments,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

/**
 * Add a comment to a task.
 */
const addComment = async ({ taskId, workspaceId, userId, content }) => {
  await assertWorkspaceMember(workspaceId, userId);
  const task = await assertTask(taskId, workspaceId);

  const mentions = parseMentions(content);

  const comment = await Comment.create({
    task: taskId,
    workspace: workspaceId,
    author: userId,
    content,
    mentions,
  });

  await comment.populate('author', 'name email avatar');
  await comment.populate('mentions', 'name email');

  // Activity log — fire and forget
  logActivity({
    workspaceId,
    taskId,
    userId,
    action: 'comment_added',
    description: `Added a comment on "${task.title}"`,
    newValue: { commentId: comment._id, content: content.slice(0, 100) },
  });

  return comment;
};

/**
 * Edit own comment.
 */
const editComment = async ({ commentId, workspaceId, userId, content }) => {
  await assertWorkspaceMember(workspaceId, userId);

  const comment = await Comment.findOne({
    _id: commentId,
    workspace: workspaceId,
    isDeleted: false,
  });
  if (!comment) throw createError('Comment not found.', 404);

  // Only the author can edit
  if (comment.author.toString() !== userId.toString()) {
    throw createError('You can only edit your own comments.', 403);
  }

  const previousContent = comment.content;
  comment.content = content;
  comment.mentions = parseMentions(content);
  comment.isEdited = true;
  comment.editedAt = new Date();
  await comment.save();

  await comment.populate('author', 'name email avatar');
  await comment.populate('mentions', 'name email');

  logActivity({
    workspaceId,
    taskId: comment.task,
    userId,
    action: 'comment_edited',
    description: 'Edited a comment',
    previousValue: { content: previousContent.slice(0, 100) },
    newValue: { content: content.slice(0, 100) },
  });

  return comment;
};

/**
 * Soft-delete own comment (admin/owner can delete any).
 */
const deleteComment = async ({ commentId, workspaceId, userId, userRole }) => {
  await assertWorkspaceMember(workspaceId, userId);

  const comment = await Comment.findOne({
    _id: commentId,
    workspace: workspaceId,
    isDeleted: false,
  });
  if (!comment) throw createError('Comment not found.', 404);

  const isOwnerOrAdmin = ['owner', 'admin'].includes(userRole);
  const isAuthor = comment.author.toString() === userId.toString();

  if (!isAuthor && !isOwnerOrAdmin) {
    throw createError('You can only delete your own comments.', 403);
  }

  comment.isDeleted = true;
  await comment.save();

  logActivity({
    workspaceId,
    taskId: comment.task,
    userId,
    action: 'comment_deleted',
    description: 'Deleted a comment',
  });

  return { message: 'Comment deleted.' };
};

module.exports = { getComments, addComment, editComment, deleteComment };
