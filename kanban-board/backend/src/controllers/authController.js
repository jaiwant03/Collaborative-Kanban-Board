const authService = require('../services/authService');
const { successResponse } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/errorHandler');

/**
 * @route  POST /auth/register
 * @access Public
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const { user, token } = await authService.registerUser({ name, email, password });
  successResponse(res, { user, token }, 'Registration successful.', 201);
});

/**
 * @route  POST /auth/login
 * @access Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, token } = await authService.loginUser({ email, password });
  successResponse(res, { user, token }, 'Login successful.');
});

/**
 * @route  GET /auth/me
 * @access Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getUserProfile(req.user._id);
  successResponse(res, { user }, 'Profile fetched.');
});

/**
 * @route  POST /auth/logout
 * @access Private
 * JWT is stateless; logout is handled client-side. This endpoint
 * serves as a documented hook for future token blacklisting.
 */
const logout = asyncHandler(async (req, res) => {
  successResponse(res, null, 'Logged out successfully.');
});

module.exports = { register, login, getMe, logout };
