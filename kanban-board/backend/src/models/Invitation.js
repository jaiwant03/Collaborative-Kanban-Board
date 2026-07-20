const mongoose = require('mongoose');
const crypto = require('crypto');

const INVITATION_STATUSES = ['pending', 'accepted', 'expired', 'cancelled'];

const invitationSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    /** The invited person's email */
    email: {
      type: String,
      required: [true, 'Invitation email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    /** Role the invitee will receive upon accepting */
    role: {
      type: String,
      enum: ['admin', 'manager', 'member', 'viewer'],
      default: 'member',
    },
    /** Cryptographically secure token included in the invitation link */
    token: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomBytes(32).toString('hex'),
    },
    status: {
      type: String,
      enum: INVITATION_STATUSES,
      default: 'pending',
    },
    /** Invitation expiry — default 7 days from creation */
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    /** Set when the invitation is accepted */
    acceptedAt: {
      type: Date,
      default: null,
    },
    /** User document of the person who accepted (may be null if email wasn't
     *  yet registered at accept time) */
    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/** Virtual: whether the invitation is currently expired */
invitationSchema.virtual('isExpired').get(function () {
  return this.status === 'pending' && this.expiresAt < new Date();
});

// token already has a unique index from the field definition; only add the compound
invitationSchema.index({ email: 1, workspace: 1 });

module.exports = mongoose.model('Invitation', invitationSchema);
module.exports.INVITATION_STATUSES = INVITATION_STATUSES;
