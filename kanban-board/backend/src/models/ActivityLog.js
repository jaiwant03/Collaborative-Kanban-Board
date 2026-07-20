const mongoose = require('mongoose');

const ACTIVITY_ACTIONS = [
  'task_created',
  'task_updated',
  'task_deleted',
  'task_moved',
  'assignee_changed',
  'due_date_changed',
  'priority_changed',
  'labels_updated',
  'comment_added',
  'comment_edited',
  'comment_deleted',
  'attachment_uploaded',
  'attachment_deleted',
  'member_invited',
  'member_joined',
  'member_removed',
  'role_changed',
];

const activityLogSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: ACTIVITY_ACTIONS,
      required: true,
    },
    /** Human-readable description e.g. "moved task from To Do → In Progress" */
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    /** Previous state snapshot (any key-value pairs) */
    previousValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    /** New state snapshot */
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for fast task-scoped activity fetches
activityLogSchema.index({ task: 1, createdAt: -1 });
activityLogSchema.index({ workspace: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
module.exports.ACTIVITY_ACTIONS = ACTIVITY_ACTIONS;
