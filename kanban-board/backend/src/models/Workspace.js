const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

/**
 * Role hierarchy (highest → lowest):
 *   owner   – full control, cannot be removed by others
 *   admin   – full access, can manage members & settings
 *   manager – manage tasks + invite users
 *   member  – create/update assigned tasks, comment, upload
 *   viewer  – read-only
 */
const WORKSPACE_ROLES = ['owner', 'admin', 'manager', 'member', 'viewer'];

const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: WORKSPACE_ROLES,
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Workspace name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    inviteCode: {
      type: String,
      unique: true,
      default: () => uuidv4().replace(/-/g, '').substring(0, 10).toUpperCase(),
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [memberSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: member count
workspaceSchema.virtual('memberCount').get(function () {
  return this.members.length;
});

// Ensure owner is always a member
workspaceSchema.pre('save', function (next) {
  const ownerIsMember = this.members.some(
    (m) => m.user.toString() === this.owner.toString()
  );
  if (!ownerIsMember) {
    this.members.push({ user: this.owner, role: 'owner' });
  }
  next();
});

module.exports = mongoose.model('Workspace', workspaceSchema);
module.exports.WORKSPACE_ROLES = WORKSPACE_ROLES;
