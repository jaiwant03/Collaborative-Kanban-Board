const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true, // createdAt + updatedAt
  }
);

// Compound index: fetch messages for a workspace ordered by time efficiently
chatMessageSchema.index({ workspace: 1, createdAt: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
