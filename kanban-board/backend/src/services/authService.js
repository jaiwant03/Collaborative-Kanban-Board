const User          = require('../models/User');
const Workspace     = require('../models/Workspace');
const generateToken = require('../utils/generateToken');
const { createError } = require('../utils/errorHandler');

/**
 * Register a new user.
 *
 * Two paths:
 *  A) Normal registration — no prior record for this email.
 *     Create a new fully-activated User.
 *
 *  B) Provisional registration — a placeholder User (isProvisional:true)
 *     was created automatically when an invite was sent to this email.
 *     Activate that record: set real name + password, flip flags.
 *     The user is already in workspace.members so no further workspace
 *     changes are needed here.
 */
const registerUser = async ({ name, email, password }) => {
  const existingUser = await User.findOne({ email }).select('+password');

  if (existingUser) {
    if (!existingUser.isProvisional) {
      // Fully-registered account already exists
      throw createError('A user with this email already exists.', 409);
    }

    // ── Activate the provisional account ──────────────────────────────────
    existingUser.name          = name;
    existingUser.password      = password;   // pre-save hook will hash it
    existingUser.isProvisional = false;
    existingUser.isActive      = true;
    await existingUser.save();

    const token = generateToken(existingUser._id);
    return { user: existingUser, token };
  }

  // ── Fresh registration ─────────────────────────────────────────────────
  const user  = await User.create({ name, email, password });
  const token = generateToken(user._id);
  return { user, token };
};

/**
 * Login an existing user.
 *
 * Provisional users (isProvisional:true / isActive:false) cannot log in —
 * they must complete registration first via the invite link.
 */
const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');

  // Provisional users have no password; guide them to register instead
  if (user?.isProvisional) {
    throw createError(
      'This email was invited but has not been registered yet. ' +
      'Please click the invitation link in your email to create your account.',
      401
    );
  }

  if (!user || !user.isActive) {
    throw createError('Invalid email or password.', 401);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw createError('Invalid email or password.', 401);
  }

  const token = generateToken(user._id);
  user.password = undefined;
  return { user, token };
};

/**
 * Get profile of logged-in user.
 */
const getUserProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw createError('User not found.', 404);
  return user;
};

module.exports = { registerUser, loginUser, getUserProfile };
