const express = require('express');
const router = express.Router();
const {
  getWorkspaces,
  createWorkspace,
  joinWorkspace,
  leaveWorkspace,
  getWorkspaceMembers,
  updateMemberRole,
} = require('../controllers/workspaceController');
const { protect } = require('../middleware/auth');
const {
  createWorkspaceValidator,
  joinWorkspaceValidator,
} = require('../validators/workspaceValidators');
const validate = require('../middleware/validate');

/**
 * @swagger
 * tags:
 *   name: Workspaces
 *   description: Workspace management
 */

/**
 * @swagger
 * /workspaces:
 *   get:
 *     summary: Get all workspaces for the current user
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of workspaces
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     workspaces:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Workspace'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/', protect, getWorkspaces);

/**
 * @swagger
 * /workspaces:
 *   post:
 *     summary: Create a new workspace
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateWorkspaceInput'
 *           example:
 *             name: "Product Team"
 *             description: "Workspace for product development"
 *     responses:
 *       201:
 *         description: Workspace created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     workspace:
 *                       $ref: '#/components/schemas/Workspace'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/', protect, createWorkspaceValidator, validate, createWorkspace);

/**
 * @swagger
 * /workspaces/join:
 *   post:
 *     summary: Join a workspace using an invite code
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - inviteCode
 *             properties:
 *               inviteCode:
 *                 type: string
 *                 example: "ABC1234567"
 *     responses:
 *       200:
 *         description: Joined workspace successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     workspace:
 *                       $ref: '#/components/schemas/Workspace'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       409:
 *         $ref: '#/components/responses/ConflictError'
 */
router.post('/join', protect, joinWorkspaceValidator, validate, joinWorkspace);

/**
 * @swagger
 * /workspaces/{id}/leave:
 *   delete:
 *     summary: Leave a workspace
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workspace ID
 *     responses:
 *       200:
 *         description: Left workspace successfully
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete('/:id/leave', protect, leaveWorkspace);

/**
 * @swagger
 * /workspaces/{id}/members:
 *   get:
 *     summary: Get all members of a workspace
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workspace ID
 *     responses:
 *       200:
 *         description: List of workspace members
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     members:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "64f4b9c3e2d5a123456789ab"
 *                           name:
 *                             type: string
 *                             example: "Jaiwant Karrun SA"
 *                           email:
 *                             type: string
 *                             example: "jaiwant@example.com"
 *                           role:
 *                             type: string
 *                             enum: [owner, admin, member]
 *                             example: "owner"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id/members', protect, getWorkspaceMembers);

/**
 * PATCH /workspaces/:id/members/:memberId
 * Update a member's role. Owner-only.
 */
router.patch(
  '/:id/members/:memberId',
  protect,
  updateMemberRole
);

module.exports = router;
