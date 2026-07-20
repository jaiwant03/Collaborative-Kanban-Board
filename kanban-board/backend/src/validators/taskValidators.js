const { body, query, param } = require('express-validator');

const createTaskValidator = [
  body('title')
    .trim()
    .notEmpty().withMessage('Task title is required')
    .isLength({ min: 2, max: 200 }).withMessage('Title must be between 2 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),

  body('status')
    .optional()
    .isIn(['todo', 'in_progress', 'review', 'done'])
    .withMessage('Invalid status value'),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority value'),

  body('workspaceId')
    .notEmpty().withMessage('Workspace ID is required')
    .isMongoId().withMessage('Invalid workspace ID'),

  body('assignee')
    .optional({ nullable: true })
    .isMongoId().withMessage('Invalid assignee ID'),

  body('dueDate')
    .optional({ nullable: true })
    .isISO8601().withMessage('Due date must be a valid ISO 8601 date'),

  body('labels')
    .optional()
    .isArray({ max: 10 }).withMessage('Labels must be an array with at most 10 items'),
];

const updateTaskValidator = [
  param('id')
    .isMongoId().withMessage('Invalid task ID'),

  body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 }).withMessage('Title must be between 2 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),

  body('status')
    .optional()
    .isIn(['todo', 'in_progress', 'review', 'done'])
    .withMessage('Invalid status value'),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority value'),

  body('assignee')
    .optional({ nullable: true })
    .isMongoId().withMessage('Invalid assignee ID'),

  body('dueDate')
    .optional({ nullable: true })
    .isISO8601().withMessage('Due date must be a valid ISO 8601 date'),

  body('labels')
    .optional()
    .isArray({ max: 10 }).withMessage('Labels must be an array with at most 10 items'),
];

const getTasksValidator = [
  query('workspaceId')
    .notEmpty().withMessage('Workspace ID is required')
    .isMongoId().withMessage('Invalid workspace ID'),

  query('status')
    .optional()
    .isIn(['todo', 'in_progress', 'review', 'done'])
    .withMessage('Invalid status filter'),

  query('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority filter'),

  query('sortBy')
    .optional()
    .isIn(['dueDate', 'createdAt', 'updatedAt', 'priority', 'title'])
    .withMessage('Invalid sort field'),

  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be asc or desc'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

module.exports = { createTaskValidator, updateTaskValidator, getTasksValidator };
