const express = require('express');
const router = express.Router();
const { param, query, body } = require('express-validator');
const {
  getAttachments,
  uploadAttachment,
  deleteAttachment,
  downloadAttachment,
} = require('../controllers/attachmentController');
const { protect } = require('../middleware/auth');
const { checkWorkspaceRole } = require('../middleware/rbac');
const upload = require('../middleware/upload');
const validate = require('../middleware/validate');

/**
 * @swagger
 * tags:
 *   name: Attachments
 *   description: Task attachment endpoints
 */

/**
 * @swagger
 * /attachments/task/{taskId}:
 *   get:
 *     summary: Get attachments for a task
 *     tags: [Attachments]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/task/:taskId',
  protect,
  [param('taskId').isMongoId(), query('workspaceId').isMongoId()],
  validate,
  getAttachments
);

/**
 * @swagger
 * /attachments/task/{taskId}:
 *   post:
 *     summary: Upload an attachment to a task
 *     tags: [Attachments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               workspaceId:
 *                 type: string
 */
router.post(
  '/task/:taskId',
  protect,
  upload.single('file'),
  [
    param('taskId').isMongoId(),
    body('workspaceId').isMongoId().withMessage('workspaceId is required'),
  ],
  validate,
  checkWorkspaceRole('member'),
  uploadAttachment
);

/**
 * @swagger
 * /attachments/{id}:
 *   delete:
 *     summary: Delete an attachment
 *     tags: [Attachments]
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
  deleteAttachment
);

/**
 * @swagger
 * /attachments/{id}/download:
 *   get:
 *     summary: Download an attachment
 *     tags: [Attachments]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/:id/download',
  protect,
  [param('id').isMongoId(), query('workspaceId').isMongoId()],
  validate,
  downloadAttachment
);

module.exports = router;
