const mongoose = require('mongoose');

const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  // Compressed
  'application/zip',
  'application/x-zip-compressed',
];

const attachmentSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    /** Original file name as uploaded by the user */
    originalName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    /**
     * UUID-based filename used on the storage backend.
     * For local/cloudinary this is the disk filename.
     * For Supabase this is the short "<uuid>.ext" name (bucket path is in filePath).
     * Optional — not meaningful for all backends.
     */
    storedName: {
      type: String,
      default: null,
    },
    /**
     * Storage path / relative disk path.
     * - local:      absolute disk path
     * - cloudinary: secure URL (same as fileUrl)
     * - supabase:   in-bucket path  "tasks/<uuid>.ext"  — used for deletion
     */
    filePath: {
      type: String,
      default: null,
    },
    /**
     * Publicly accessible URL of the file.
     * Populated for Supabase and Cloudinary backends.
     * Null for local-disk backend (file is served by the Express static route).
     */
    fileUrl: {
      type: String,
      default: null,
    },
    mimeType: {
      type: String,
      required: true,
      enum: {
        values: ALLOWED_MIME_TYPES,
        message: 'File type not allowed',
      },
    },
    /** Size in bytes */
    size: {
      type: Number,
      required: true,
      max: [10 * 1024 * 1024, 'File size cannot exceed 10 MB'],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON:  { virtuals: true },
    toObject: { virtuals: true },
  }
);

/** true when the MIME type represents an image */
attachmentSchema.virtual('isImage').get(function () {
  return this.mimeType.startsWith('image/');
});

attachmentSchema.index({ task: 1, createdAt: -1 });

module.exports = mongoose.model('Attachment', attachmentSchema);
module.exports.ALLOWED_MIME_TYPES = ALLOWED_MIME_TYPES;
