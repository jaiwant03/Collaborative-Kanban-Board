const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const { getComments, addComment, editComment, deleteComment } = require('../controllers/commentController');
const { protect } = require('../middleware/auth');
const { checkWorkspaceRole } = require('../middleware/rbac');
const validate = require('../middleware/validate');

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Task comment endpoints
 */

const addCommentValidator = [
  param('taskId').isMongoId().withMessage('Invalid task ID'),
  body('workspaceId').isMongoId().withMessage('workspaceId is required'),
  body('content')
    .trim()
    .notEmpty().withMessage('Comment content is required')
    .isLength({ max: 2000 }).withMessage('Comment cannot exceed 2000 characters'),
];

const editCommentValidator = [
  param('id').isMongoId().withMessage('Invalid comment ID'),
  body('workspaceId').isMongoId().withMessage('workspaceId is required'),
  body('content')
    .trim()
    .notEmpty().withMessage('Content is required')
    .isLength({ max: 2000 }).withMessage('Comment cannot exceed 2000 characters'),
];

/**
 * @swagger
 * /comments/task/{taskId}:
 *   get:
 *     summary: Get comments for a task
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/task/:taskId',
  protect,
  [
    param('taskId').isMongoId(),
    query('workspaceId').isMongoId(),
  ],
  validate,
  getComments
);

/**
 * @swagger
 * /comments/task/{taskId}:
 *   post:
 *     summary: Add a comment to a task
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/task/:taskId',
  protect,
  addCommentValidator,
  validate,
  checkWorkspaceRole('member'),
  addComment
);

/**
 * @swagger
 * /comments/{id}:
 *   put:
 *     summary: Edit a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  '/:id',
  protect,
  editCommentValidator,
  validate,
  checkWorkspaceRole('member'),
  editComment
);

/**
 * @swagger
 * /comments/{id}:
 *   delete:
 *     summary: Delete a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  '/:id',
  protect,
  [
    param('id').isMongoId(),
    query('workspaceId').optional().isMongoId(),
  ],
  validate,
  checkWorkspaceRole('member'),
  deleteComment
);

module.exports = router;
