const express = require('express');
const router = express.Router();
const { getTaskActivity, getWorkspaceActivity } = require('../controllers/activityController');
const { protect } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Activity
 *   description: Activity log endpoints
 */

/**
 * @swagger
 * /activity/task/{taskId}:
 *   get:
 *     summary: Get activity log for a specific task
 *     tags: [Activity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Activity logs fetched
 */
router.get('/task/:taskId', protect, getTaskActivity);

/**
 * @swagger
 * /activity/workspace/{workspaceId}:
 *   get:
 *     summary: Get workspace-wide activity feed
 *     tags: [Activity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Workspace activity fetched
 */
router.get('/workspace/:workspaceId', protect, getWorkspaceActivity);

module.exports = router;
