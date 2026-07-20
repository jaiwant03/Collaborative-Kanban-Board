const { body } = require('express-validator');

const createWorkspaceValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Workspace name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
];

const joinWorkspaceValidator = [
  body('inviteCode')
    .trim()
    .notEmpty().withMessage('Invite code is required')
    .isLength({ min: 6, max: 20 }).withMessage('Invalid invite code format'),
];

module.exports = { createWorkspaceValidator, joinWorkspaceValidator };
