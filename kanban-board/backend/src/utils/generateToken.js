const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

/**
 * Generate a signed JWT for a given user ID
 * @param {string} id - MongoDB user _id
 * @returns {string} JWT token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
  });
};

module.exports = generateToken;
