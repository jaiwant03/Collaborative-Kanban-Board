const crypto      = require('crypto');
const Invitation  = require('../models/Invitation');
const Workspace   = require('../models/Workspace');
const User        = require('../models/User');
const { sendInviteEmail }       = require('./emailService');
const { assertWorkspaceMember } = require('./workspaceService');
const { logActivity }           = require('./activityLogService');
const { createError }           = require('../utils/errorHandler');
const { getIo }                 = require('../config/socket');

// ── Service Functions ──────────────────────────────────────────────────────────

/**
 * Create an invitation record and send the invite email.
 *
 * Key behaviour:
 *  - If the email has no User record at all → create a provisional User
 *    (isProvisional: true, isActive: false, no password) and immediately
 *    add them to workspace.members. Member count updates right away.
 *  - If a provisional User already exists for the email → reuse it and
 *    ensure they are in workspace.members.
 *  - If a fully-registered User already exists → just send the invite
 *    (they'll accept and be added on the accept step as before).
 *  - If already a member → reject with 409.
 */
const inviteUser = async ({ workspaceId, invitedByUserId, email, role = 'member' }) => {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) throw createError('Workspace not found.', 404);

  // Prevent duplicate pending invitations
  const existing = await Invitation.findOne({ workspace: workspaceId, email, status: 'pending' });
  if (existing && !existing.isExpired) {
    throw createError('A pending invitation already exists for this email.', 409);
  }

  // Find or create the user record for this email
  let targetUser = await User.findOne({ email });

  if (targetUser) {
    // Already a real member → reject
    const alreadyMember = workspace.members.some(
      (m) => m.user.toString() === targetUser._id.toString()
    );
    if (alreadyMember && !targetUser.isProvisional) {
      throw createError('This user is already a member of the workspace.', 409);
    }
  } else {
    // No user at all → create provisional placeholder
    targetUser = await User.create({
      name:          email.split('@')[0], // placeholder name, updated on register
      email,
      password:      null,
      isProvisional: true,
      isActive:      false,
    });
  }

  // Add provisional (or existing non-member) user to workspace immediately
  const alreadyInWorkspace = workspace.members.some(
    (m) => m.user.toString() === targetUser._id.toString()
  );
  if (!alreadyInWorkspace) {
    workspace.members.push({ user: targetUser._id, role });
    await workspace.save();
  }

  const inviter = await User.findById(invitedByUserId).select('name');

  // Upsert invitation record
  let invitation;
  if (existing && existing.isExpired) {
    existing.token     = crypto.randomBytes(32).toString('hex');
    existing.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    existing.status    = 'pending';
    existing.role      = role;
    existing.invitedBy = invitedByUserId;
    await existing.save();
    invitation = existing;
  } else {
    invitation = await Invitation.create({
      workspace:  workspaceId,
      invitedBy:  invitedByUserId,
      email,
      role,
    });
  }

  // Send invite email
  const inviterName = inviter?.name || 'A team member';
  await sendInviteEmail({
    to:          email,
    inviteToken: invitation.token,
    metadata:    { inviterName, workspaceName: workspace.name, role },
  });

  // Broadcast updated workspace to all connected members so counts update live
  const populatedWorkspace = await Workspace.findById(workspaceId)
    .populate('members.user', 'name email');
  getIo()
    .to(`workspace:${workspaceId}`)
    .emit('workspace:member_joined', {
      workspaceId: workspaceId.toString(),
      member: {
        user: {
          _id:   targetUser._id.toString(),
          name:  targetUser.name,
          email: targetUser.email,
        },
        role,
        joinedAt: new Date().toISOString(),
      },
      workspace: populatedWorkspace,
    });

  logActivity({
    workspaceId,
    userId:      invitedByUserId,
    action:      'member_invited',
    description: `Invited ${email} as ${role}`,
    newValue:    { email, role },
  });

  return invitation;
};

/**
 * Resend a fresh invitation email.
 */
const resendInvitation = async ({ invitationId, workspaceId, userId }) => {
  await assertWorkspaceMember(workspaceId, userId);

  const invitation = await Invitation.findOne({ _id: invitationId, workspace: workspaceId });
  if (!invitation) throw createError('Invitation not found.', 404);
  if (!['pending', 'expired'].includes(invitation.status)) {
    throw createError('Only pending or expired invitations can be resent.', 400);
  }

  // Rotate token + reset expiry
  invitation.token     = crypto.randomBytes(32).toString('hex');
  invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  invitation.status    = 'pending';
  await invitation.save();

  const workspace   = await Workspace.findById(workspaceId).select('name');
  const inviter     = await User.findById(userId).select('name');
  const inviterName = inviter?.name || 'A team member';

  await sendInviteEmail({
    to:          invitation.email,
    inviteToken: invitation.token,
    metadata: {
      inviterName,
      workspaceName: workspace?.name || 'the workspace',
      role:          invitation.role,
    },
  });

  return invitation;
};

/**
 * Cancel a pending invitation.
 */
const cancelInvitation = async ({ invitationId, workspaceId, userId }) => {
  await assertWorkspaceMember(workspaceId, userId);

  const invitation = await Invitation.findOne({ _id: invitationId, workspace: workspaceId });
  if (!invitation) throw createError('Invitation not found.', 404);
  if (invitation.status !== 'pending') {
    throw createError('Only pending invitations can be cancelled.', 400);
  }

  invitation.status = 'cancelled';
  await invitation.save();
  return { message: 'Invitation cancelled.' };
};

/**
 * Accept an invitation via the token in the invite link.
 *
 * By the time this runs:
 *  - A provisional User (isProvisional:true) was created when the invite was sent
 *    and is already in workspace.members.
 *  - The accepting user (req.user) is now fully registered (isProvisional:false).
 *
 * So we just need to:
 *  1. Replace the provisional member slot with the real registered user (if different _id).
 *  2. Mark the invitation accepted.
 *  3. Emit socket event so UI refreshes.
 */
const acceptInvitation = async ({ token, userId }) => {
  const invitation = await Invitation.findOne({ token, status: 'pending' });
  if (!invitation) throw createError('Invitation not found or already used.', 404);

  if (invitation.isExpired || invitation.expiresAt < new Date()) {
    invitation.status = 'expired';
    await invitation.save();
    throw createError('This invitation has expired.', 410);
  }

  const workspace = await Workspace.findById(invitation.workspace);
  if (!workspace) throw createError('Workspace no longer exists.', 404);

  // Find the provisional placeholder that was added when the invite was sent
  const provisionalUser = await User.findOne({
    email: invitation.email,
    isProvisional: true,
  });

  // Index of the member slot occupied by the provisional user (or the real user)
  const provisionalSlotIdx = provisionalUser
    ? workspace.members.findIndex(
        (m) => m.user.toString() === provisionalUser._id.toString()
      )
    : -1;

  // Index of the accepting (real) user — may already be there
  const realUserSlotIdx = workspace.members.findIndex(
    (m) => m.user.toString() === userId.toString()
  );

  if (provisionalSlotIdx !== -1) {
    // Replace the provisional placeholder with the real user
    workspace.members[provisionalSlotIdx].user = userId;
    workspace.members[provisionalSlotIdx].role = invitation.role;

    // If the real user was somehow added separately, remove the duplicate
    if (realUserSlotIdx !== -1 && realUserSlotIdx !== provisionalSlotIdx) {
      workspace.members.splice(realUserSlotIdx, 1);
    }
  } else if (realUserSlotIdx === -1) {
    // No provisional slot and real user not yet a member — add them
    workspace.members.push({ user: userId, role: invitation.role });
  }

  await workspace.save();

  // Clean up the provisional user record if it's no longer needed
  if (provisionalUser) {
    await User.deleteOne({ _id: provisionalUser._id });
  }

  invitation.status     = 'accepted';
  invitation.acceptedAt = new Date();
  invitation.acceptedBy = userId;
  await invitation.save();

  // Reload with populated members
  const populatedWorkspace = await Workspace.findById(workspace._id)
    .populate('members.user', 'name email');

  logActivity({
    workspaceId: workspace._id,
    userId,
    action:      'member_joined',
    description: `Joined workspace as ${invitation.role} via invitation`,
    newValue:    { role: invitation.role },
  });

  // Broadcast so all connected users refresh member list
  const newMember = await User.findById(userId).select('name email');
  getIo()
    .to(`workspace:${workspace._id}`)
    .emit('workspace:member_joined', {
      workspaceId: workspace._id.toString(),
      member: {
        user: {
          _id:   newMember._id.toString(),
          name:  newMember.name,
          email: newMember.email,
        },
        role:     invitation.role,
        joinedAt: new Date().toISOString(),
      },
      workspace: populatedWorkspace,
    });

  return { workspace: populatedWorkspace, alreadyMember: false };
};

/**
 * List all invitations for a workspace.
 */
const listInvitations = async ({ workspaceId, userId }) => {
  await assertWorkspaceMember(workspaceId, userId);

  const invitations = await Invitation.find({ workspace: workspaceId })
    .populate('invitedBy', 'name email')
    .sort({ createdAt: -1 });

  // Lazy-expire stale pending invitations
  const now      = new Date();
  const staleIds = invitations
    .filter((i) => i.status === 'pending' && i.expiresAt < now)
    .map((i) => i._id);

  if (staleIds.length) {
    await Invitation.updateMany({ _id: { $in: staleIds } }, { status: 'expired' });
    invitations.forEach((i) => {
      if (staleIds.some((id) => id.equals(i._id))) i.status = 'expired';
    });
  }

  return invitations;
};

module.exports = {
  inviteUser,
  resendInvitation,
  cancelInvitation,
  acceptInvitation,
  listInvitations,
};
