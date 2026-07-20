const taskService = require('../services/taskService');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/errorHandler');

/**
 * @route  GET /tasks
 * @access Private
 */
const getTasks = asyncHandler(async (req, res) => {
  const { tasks, pagination } = await taskService.getTasks({
    workspaceId: req.query.workspaceId,
    query: req.query,
    userId: req.user._id,
  });
  paginatedResponse(res, { tasks }, pagination, 'Tasks fetched.');
});

/**
 * @route  POST /tasks
 * @access Private
 */
const createTask = asyncHandler(async (req, res) => {
  const task = await taskService.createTask({
    data: req.body,
    userId: req.user._id,
  });
  successResponse(res, { task }, 'Task created.', 201);
});

/**
 * @route  PUT /tasks/:id
 * @access Private
 */
const updateTask = asyncHandler(async (req, res) => {
  const task = await taskService.updateTask({
    taskId: req.params.id,
    data: req.body,
    userId: req.user._id,
  });
  successResponse(res, { task }, 'Task updated.');
});

/**
 * @route  DELETE /tasks/:id
 * @access Private
 */
const deleteTask = asyncHandler(async (req, res) => {
  const result = await taskService.deleteTask({
    taskId: req.params.id,
    userId: req.user._id,
  });
  successResponse(res, null, result.message);
});

module.exports = { getTasks, createTask, updateTask, deleteTask };
