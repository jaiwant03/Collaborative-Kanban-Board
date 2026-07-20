const express = require('express');
const router  = express.Router();
const { param } = require('express-validator');
const { getMessages } = require('../controllers/chatController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

/**
 * GET /chat/:workspaceId
 * Fetch paginated message history for a workspace.
 * Query params: limit (default 50, max 100), before (ISO date for cursor pagination)
 */
router.get(
  '/:workspaceId',
  protect,
  [param('workspaceId').isMongoId().withMessage('Invalid workspace ID')],
  validate,
  getMessages
);

module.exports = router;
