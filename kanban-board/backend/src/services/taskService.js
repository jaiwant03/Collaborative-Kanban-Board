const Task = require('../models/Task');
const { createError } = require('../utils/errorHandler');
const { assertWorkspaceMember } = require('./workspaceService');
const { canManageTask } = require('../middleware/rbac');
const { logActivity } = require('./activityLogService');
const { getIo } = require('../config/socket');

/**
 * Build query filters from request query params
 */
const buildTaskFilters = (query, workspaceId) => {
  const filter = { workspace: workspaceId, isArchived: false };

  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.assignee) filter.assignee = query.assignee;

  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } },
    ];
  }

  return filter;
};

/**
 * Build sort options
 */
const buildSortOptions = (sortBy = 'createdAt', order = 'desc') => {
  const allowedFields = ['dueDate', 'createdAt', 'updatedAt', 'priority', 'title', 'order'];
  const field = allowedFields.includes(sortBy) ? sortBy : 'createdAt';
  return { [field]: order === 'asc' ? 1 : -1 };
};

/**
 * Get tasks for a workspace with filters, search, and pagination
 */
const getTasks = async ({ workspaceId, query, userId }) => {
  await assertWorkspaceMember(workspaceId, userId);

  const filter = buildTaskFilters(query, workspaceId);
  const sort = buildSortOptions(query.sortBy, query.order);

  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(parseInt(query.limit) || 50, 100);
  const skip = (page - 1) * limit;

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate('assignee', 'name email avatar')
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Task.countDocuments(filter),
  ]);

  return {
    tasks,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Create a new task
 */
const createTask = async ({ data, userId }) => {
  await assertWorkspaceMember(data.workspaceId, userId);

  const task = await Task.create({
    ...data,
    workspace: data.workspaceId,
    createdBy: userId,
  });

  const populated = await task
    .populate('assignee', 'name email avatar')
    .then((t) => t.populate('createdBy', 'name email'));

  // Activity log
  logActivity({
    workspaceId: data.workspaceId,
    taskId: populated._id,
    userId,
    action: 'task_created',
    description: `Created task "${populated.title}"`,
    newValue: { title: populated.title, status: populated.status, priority: populated.priority },
  });

  // Real-time broadcast
  try {
    getIo().to(`workspace:${data.workspaceId}`).emit('task:created', { task: populated });
  } catch (_) {}

  return populated;
};

/**
 * Update a task — tracks per-field activity logs for key fields
 */
const updateTask = async ({ taskId, data, userId }) => {
  const task = await Task.findById(taskId);
  if (!task || task.isArchived) {
    throw createError('Task not found.', 404);
  }

  const workspace = await assertWorkspaceMember(task.workspace, userId);

  // Resolve caller's role and check they can manage this task
  const membership = workspace.members.find(
    (m) => m.user.toString() === userId.toString()
  );
  const role = membership?.role;

  if (!canManageTask(role, task, userId)) {
    throw createError(
      role === 'viewer'
        ? 'Viewers cannot edit tasks.'
        : 'You can only edit tasks you created or are assigned to.',
      403
    );
  }

  // Track specific field changes for activity log
  const workspaceId = task.workspace.toString();
  const changes = [];

  const trackableFields = {
    status:   { action: 'task_moved',        label: 'status' },
    assignee: { action: 'assignee_changed',  label: 'assignee' },
    dueDate:  { action: 'due_date_changed',  label: 'due date' },
    priority: { action: 'priority_changed',  label: 'priority' },
    labels:   { action: 'labels_updated',    label: 'labels' },
  };

  Object.entries(trackableFields).forEach(([field, meta]) => {
    if (data[field] !== undefined) {
      const prev = task[field];
      const next = data[field];
      const prevStr = JSON.stringify(prev);
      const nextStr = JSON.stringify(next);
      if (prevStr !== nextStr) {
        changes.push({
          action: meta.action,
          description: `Changed ${meta.label} from "${prev}" to "${next}"`,
          previousValue: prev,
          newValue: next,
        });
      }
    }
  });

  // Merge allowed fields
  const allowedFields = [
    'title', 'description', 'status', 'priority',
    'assignee', 'dueDate', 'labels', 'order',
  ];
  allowedFields.forEach((field) => {
    if (data[field] !== undefined) {
      task[field] = data[field];
    }
  });

  // Generic task_updated if something changed but no specific tracker fired
  const hasSpecificChange = changes.length > 0;
  if (!hasSpecificChange && Object.keys(data).some((k) => allowedFields.includes(k))) {
    changes.push({
      action: 'task_updated',
      description: `Updated task "${task.title}"`,
      previousValue: null,
      newValue: null,
    });
  }

  await task.save();

  await task.populate('assignee', 'name email avatar');
  await task.populate('createdBy', 'name email');

  // Fire activity log entries (all non-blocking)
  changes.forEach((change) => {
    logActivity({
      workspaceId,
      taskId,
      userId,
      action: change.action,
      description: change.description,
      previousValue: change.previousValue,
      newValue: change.newValue,
    });
  });

  // Real-time broadcast
  try {
    getIo().to(`workspace:${workspaceId}`).emit('task:updated', { task });
  } catch (_) {}

  return task;
};

/**
 * Delete (archive) a task
 */
const deleteTask = async ({ taskId, userId }) => {
  const task = await Task.findById(taskId);
  if (!task || task.isArchived) {
    throw createError('Task not found.', 404);
  }

  const workspace = await assertWorkspaceMember(task.workspace, userId);

  const membership = workspace.members.find(
    (m) => m.user.toString() === userId.toString()
  );
  const role = membership?.role;

  if (!canManageTask(role, task, userId)) {
    throw createError(
      role === 'viewer'
        ? 'Viewers cannot delete tasks.'
        : 'You can only delete tasks you created or are assigned to.',
      403
    );
  }

  const workspaceId = task.workspace.toString();

  task.isArchived = true;
  await task.save();

  logActivity({
    workspaceId,
    taskId,
    userId,
    action: 'task_deleted',
    description: `Deleted task "${task.title}"`,
    previousValue: { title: task.title, status: task.status },
  });

  try {
    getIo().to(`workspace:${workspaceId}`).emit('task:deleted', { taskId });
  } catch (_) {}

  return { message: 'Task deleted successfully.' };
};

module.exports = { getTasks, createTask, updateTask, deleteTask };
