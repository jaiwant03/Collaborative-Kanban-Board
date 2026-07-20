const Workspace = require('../models/Workspace');
const { createError } = require('../utils/errorHandler');

/**
 * Get all workspaces for a user (as member or owner)
 */
const getUserWorkspaces = async (userId) => {
  return Workspace.find({
    'members.user': userId,
    isActive: true,
  })
    .populate('owner', 'name email')
    .populate('members.user', 'name email avatar')
    .sort({ createdAt: -1 });
};

/**
 * Create a new workspace
 */
const createWorkspace = async ({ name, description, userId }) => {
  const workspace = await Workspace.create({
    name,
    description,
    owner: userId,
  });

  return workspace
    .populate('owner', 'name email')
    .then((w) => w.populate('members.user', 'name email avatar'));
};

/**
 * Join workspace by invite code
 */
const joinWorkspace = async ({ inviteCode, userId }) => {
  const workspace = await Workspace.findOne({ inviteCode, isActive: true });
  if (!workspace) {
    throw createError('Invalid invite code or workspace not found.', 404);
  }

  const alreadyMember = workspace.members.some(
    (m) => m.user.toString() === userId.toString()
  );
  if (alreadyMember) {
    throw createError('You are already a member of this workspace.', 409);
  }

  workspace.members.push({ user: userId, role: 'member' });
  await workspace.save();

  await workspace.populate('owner', 'name email');
  await workspace.populate('members.user', 'name email avatar');

  return workspace;
};

/**
 * Leave a workspace
 */
const leaveWorkspace = async ({ workspaceId, userId }) => {
  const workspace = await Workspace.findOne({ _id: workspaceId, isActive: true });
  if (!workspace) {
    throw createError('Workspace not found.', 404);
  }

  if (workspace.owner.toString() === userId.toString()) {
    throw createError('Owner cannot leave their own workspace. Transfer ownership or delete it.', 400);
  }

  const memberIndex = workspace.members.findIndex(
    (m) => m.user.toString() === userId.toString()
  );
  if (memberIndex === -1) {
    throw createError('You are not a member of this workspace.', 400);
  }

  workspace.members.splice(memberIndex, 1);
  await workspace.save();

  return { message: 'Successfully left the workspace.' };
};

/**
 * Get the member list for a workspace (only if the requesting user is a member)
 */
const getWorkspaceMembers = async (workspaceId, userId) => {
  const workspace = await Workspace.findOne({ _id: workspaceId, isActive: true })
    .populate('members.user', 'name email avatar');

  if (!workspace) {
    throw createError('Workspace not found.', 404);
  }

  const isMember = workspace.members.some(
    (m) => m.user._id.toString() === userId.toString()
  );
  if (!isMember) {
    throw createError('Access denied. You are not a member of this workspace.', 403);
  }

  return workspace.members.map((m) => ({
    _id: m.user._id,
    name: m.user.name || '',
    email: m.user.email || '',
    role: m.role,
  }));
};

/**
 * Update the role of a workspace member.
 * Only the workspace owner can change roles; the owner's own role cannot be changed.
 */
const updateMemberRole = async ({ workspaceId, requestingUserId, targetUserId, newRole }) => {
  const workspace = await Workspace.findOne({ _id: workspaceId, isActive: true });
  if (!workspace) throw createError('Workspace not found.', 404);

  // Only the owner can change roles
  if (workspace.owner.toString() !== requestingUserId.toString()) {
    throw createError('Only the workspace owner can change member roles.', 403);
  }

  // Cannot change the owner's own role
  if (targetUserId.toString() === workspace.owner.toString()) {
    throw createError('The workspace owner role cannot be changed.', 400);
  }

  const memberEntry = workspace.members.find(
    (m) => m.user.toString() === targetUserId.toString()
  );
  if (!memberEntry) throw createError('Member not found in this workspace.', 404);

  memberEntry.role = newRole;
  await workspace.save();

  await workspace.populate('members.user', 'name email avatar');
  return workspace.members.map((m) => ({
    _id:    m.user._id,
    name:   m.user.name  || '',
    email:  m.user.email || '',
    role:   m.role,
  }));
};

/**
 * Ensure a user is a member of a workspace
 */
const assertWorkspaceMember = async (workspaceId, userId) => {
  const workspace = await Workspace.findOne({ _id: workspaceId, isActive: true });
  if (!workspace) {
    throw createError('Workspace not found.', 404);
  }

  const isMember = workspace.members.some(
    (m) => m.user.toString() === userId.toString()
  );
  if (!isMember) {
    throw createError('Access denied. You are not a member of this workspace.', 403);
  }

  return workspace;
};

module.exports = {
  getUserWorkspaces,
  createWorkspace,
  joinWorkspace,
  leaveWorkspace,
  getWorkspaceMembers,
  updateMemberRole,
  assertWorkspaceMember,
};
