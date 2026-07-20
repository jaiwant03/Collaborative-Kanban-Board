/**
 * Create a structured error with statusCode
 * @param {string} message
 * @param {number} statusCode
 * @returns {Error}
 */
const createError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * Async wrapper to avoid try/catch boilerplate in route handlers
 * @param {Function} fn
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { createError, asyncHandler };
