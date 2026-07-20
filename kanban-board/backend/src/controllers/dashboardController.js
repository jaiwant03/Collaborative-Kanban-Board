const dashboardService = require('../services/dashboardService');
const { successResponse } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/errorHandler');

/**
 * @route  GET /dashboard
 * @access Private
 */
const getDashboard = asyncHandler(async (req, res) => {
  const stats = await dashboardService.getDashboardStats({
    workspaceId: req.query.workspaceId,
    userId: req.user._id,
  });
  successResponse(res, stats, 'Dashboard data fetched.');
});

module.exports = { getDashboard };
