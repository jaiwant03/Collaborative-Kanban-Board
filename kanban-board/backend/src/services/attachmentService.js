const path           = require('path');
const fs             = require('fs');
const Attachment     = require('../models/Attachment');
const Task           = require('../models/Task');
const storageService = require('./storageService');
const { assertWorkspaceMember } = require('./workspaceService');
const { logActivity }           = require('./activityLogService');
const { createError }           = require('../utils/errorHandler');

// ── Helpers ───────────────────────────────────────────────────────────────────

const assertTask = async (taskId, workspaceId) => {
  const task = await Task.findOne({ _id: taskId, workspace: workspaceId, isArchived: false });
  if (!task) throw createError('Task not found.', 404);
  return task;
};

// ── Service functions ─────────────────────────────────────────────────────────

/**
 * List all non-deleted attachments for a task.
 */
const getAttachments = async ({ taskId, workspaceId, userId }) => {
  await assertWorkspaceMember(workspaceId, userId);
  await assertTask(taskId, workspaceId);

  return Attachment.find({ task: taskId, isDeleted: false })
    .populate('uploadedBy', 'name email avatar')
    .sort({ createdAt: -1 });
};

/**
 * Upload a file and persist the metadata to MongoDB.
 *
 * The actual bytes are sent to the configured storage backend
 * (Supabase / Cloudinary / local disk).  For Supabase/Cloudinary the
 * returned fileUrl is a permanent public URL that the frontend loads
 * directly; for local storage fileUrl is null and the file is served
 * via the Express /uploads static route.
 *
 * @param {object} params
 * @param {string} params.taskId
 * @param {string} params.workspaceId
 * @param {string} params.userId
 * @param {object} params.file  — multer file object
 *   (diskStorage → file.path/filename, memoryStorage → file.buffer)
 */
const uploadAttachment = async ({ taskId, workspaceId, userId, file }) => {
  await assertWorkspaceMember(workspaceId, userId);
  const task = await assertTask(taskId, workspaceId);

  // ── Push to storage backend ────────────────────────────────────────────────
  const { storedName, filePath, fileUrl } = await storageService.save(file);

  // ── Persist metadata in MongoDB ────────────────────────────────────────────
  const attachment = await Attachment.create({
    task:         taskId,
    workspace:    workspaceId,
    uploadedBy:   userId,
    originalName: file.originalname,
    storedName,
    filePath,
    fileUrl,
    mimeType:     file.mimetype,
    size:         file.size,
  });

  await attachment.populate('uploadedBy', 'name email avatar');

  logActivity({
    workspaceId,
    taskId,
    userId,
    action:      'attachment_uploaded',
    description: `Uploaded "${file.originalname}" on "${task.title}"`,
    newValue:    { filename: file.originalname, size: file.size },
  });

  return attachment;
};

/**
 * Soft-delete an attachment and remove it from the storage backend.
 */
const deleteAttachment = async ({ attachmentId, workspaceId, userId, userRole }) => {
  await assertWorkspaceMember(workspaceId, userId);

  const attachment = await Attachment.findOne({
    _id:       attachmentId,
    workspace: workspaceId,
    isDeleted: false,
  });
  if (!attachment) throw createError('Attachment not found.', 404);

  const isOwnerOrAdmin = ['owner', 'admin'].includes(userRole);
  const isUploader     = attachment.uploadedBy.toString() === userId.toString();
  if (!isUploader && !isOwnerOrAdmin) {
    throw createError('You do not have permission to delete this attachment.', 403);
  }

  // Remove from storage backend.
  // For Supabase: filePath = "tasks/<uuid>.ext"  (in-bucket path)
  // For local:    filePath = absolute disk path
  // For Cloudinary: storedName = public_id
  const backend = storageService.getBackendName();
  if (backend === 'cloudinary') {
    await storageService.delete(attachment.storedName);
  } else {
    await storageService.delete(attachment.filePath);
  }

  attachment.isDeleted = true;
  await attachment.save();

  logActivity({
    workspaceId,
    taskId:      attachment.task,
    userId,
    action:      'attachment_deleted',
    description: `Deleted attachment "${attachment.originalName}"`,
  });

  return { message: 'Attachment deleted.' };
};

/**
 * Resolve download info for an attachment.
 *
 * - For Supabase / Cloudinary: returns the stored public fileUrl so the
 *   controller can redirect directly — no streaming needed.
 * - For local disk:            returns the absolute file path for res.sendFile.
 */
const resolveAttachmentPath = async ({ attachmentId, workspaceId, userId }) => {
  await assertWorkspaceMember(workspaceId, userId);

  const attachment = await Attachment.findOne({
    _id:       attachmentId,
    workspace: workspaceId,
    isDeleted: false,
  });
  if (!attachment) throw createError('Attachment not found.', 404);

  // Cloud backend — hand back the public URL
  if (attachment.fileUrl) {
    return {
      fileUrl:      attachment.fileUrl,
      originalName: attachment.originalName,
      mimeType:     attachment.mimeType,
      absolutePath: null,
    };
  }

  // Local backend — resolve the absolute path on disk
  const absolutePath = path.resolve(attachment.filePath);
  if (!fs.existsSync(absolutePath)) {
    throw createError('File not found on server.', 404);
  }

  return {
    fileUrl:      null,
    absolutePath,
    originalName: attachment.originalName,
    mimeType:     attachment.mimeType,
  };
};

module.exports = { getAttachments, uploadAttachment, deleteAttachment, resolveAttachmentPath };
