const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const User = require('../models/User');
const { createError } = require('../utils/errorHandler');

/**
 * Protect routes — verify JWT and attach user to request
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Accept token from Authorization header or cookie
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(createError('Not authorized. No token provided.', 401));
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, jwtConfig.secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(createError('Token expired. Please log in again.', 401));
      }
      return next(createError('Invalid token. Please log in again.', 401));
    }

    // Check user still exists
    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      return next(createError('User no longer exists or is inactive.', 401));
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Restrict access to specific roles
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        createError('You do not have permission to perform this action.', 403)
      );
    }
    next();
  };
};

module.exports = { protect, restrictTo };
