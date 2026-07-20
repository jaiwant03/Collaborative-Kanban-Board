const mongoose = require('mongoose');
const Task = require('../models/Task');
const { assertWorkspaceMember } = require('./workspaceService');

/**
 * Get dashboard statistics for a workspace
 */
const getDashboardStats = async ({ workspaceId, userId }) => {
  await assertWorkspaceMember(workspaceId, userId);

  // Cast to ObjectId so aggregate() $match works correctly.
  // find()/countDocuments() auto-cast strings, but aggregate() does NOT.
  const wsId = new mongoose.Types.ObjectId(workspaceId);

  const baseFilter = { workspace: wsId, isArchived: false };
  const now = new Date();

  // Run all aggregations in parallel
  const [
    totalTasks,
    tasksByStatus,
    tasksByPriority,
    overdueTasks,
    myTasks,
    recentTasks,
  ] = await Promise.all([
    // Total task count
    Task.countDocuments(baseFilter),

    // Tasks grouped by status
    Task.aggregate([
      { $match: baseFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    // Tasks grouped by priority
    Task.aggregate([
      { $match: baseFilter },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    // Overdue tasks (past due date, not done)
    Task.countDocuments({
      ...baseFilter,
      dueDate: { $lt: now },
      status: { $ne: 'done' },
    }),

    // Tasks assigned to current user
    Task.countDocuments({ ...baseFilter, assignee: userId }),

    // 5 most recently created tasks
    Task.find(baseFilter)
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title status priority dueDate createdAt assignee'),
  ]);

  // Normalize status counts into a keyed object
  const statusMap = { todo: 0, in_progress: 0, review: 0, done: 0 };
  tasksByStatus.forEach(({ _id, count }) => {
    if (_id in statusMap) statusMap[_id] = count;
  });

  // Normalize priority counts
  const priorityMap = { low: 0, medium: 0, high: 0, urgent: 0 };
  tasksByPriority.forEach(({ _id, count }) => {
    if (_id in priorityMap) priorityMap[_id] = count;
  });

  return {
    totalTasks,
    tasksByStatus: statusMap,
    tasksByPriority: priorityMap,
    overdueTasks,
    myTasksCount: myTasks,
    recentTasks,
  };
};

module.exports = { getDashboardStats };
