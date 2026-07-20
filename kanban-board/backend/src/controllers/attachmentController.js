const attachmentService = require('../services/attachmentService');
const { successResponse } = require('../utils/apiResponse');
const { asyncHandler }    = require('../utils/errorHandler');
const { getIo }           = require('../config/socket');

/**
 * @route  GET /attachments/task/:taskId?workspaceId=
 * @access Private
 */
const getAttachments = asyncHandler(async (req, res) => {
  const { taskId }    = req.params;
  const { workspaceId } = req.query;

  const attachments = await attachmentService.getAttachments({
    taskId,
    workspaceId,
    userId: req.user._id,
  });

  successResponse(res, { attachments }, 'Attachments fetched.');
});

/**
 * @route  POST /attachments/task/:taskId
 * @access Private
 * Multer middleware (diskStorage or memoryStorage) populates req.file before this runs.
 */
const uploadAttachment = asyncHandler(async (req, res) => {
  const { taskId }      = req.params;
  const { workspaceId } = req.body;

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  const attachment = await attachmentService.uploadAttachment({
    taskId,
    workspaceId,
    userId: req.user._id,
    file:   req.file,
  });

  try {
    getIo().to(`workspace:${workspaceId}`).emit('attachment:uploaded', { taskId, attachment });
  } catch (_) {}

  successResponse(res, { attachment }, 'File uploaded.', 201);
});

/**
 * @route  DELETE /attachments/:id?workspaceId=
 * @access Private
 */
const deleteAttachment = asyncHandler(async (req, res) => {
  const { id }      = req.params;
  const workspaceId = req.query.workspaceId || req.body.workspaceId;

  const result = await attachmentService.deleteAttachment({
    attachmentId: id,
    workspaceId,
    userId:    req.user._id,
    userRole:  req.workspaceRole || 'member',
  });

  try {
    getIo().to(`workspace:${workspaceId}`).emit('attachment:deleted', { attachmentId: id });
  } catch (_) {}

  successResponse(res, null, result.message);
});

/**
 * @route  GET /attachments/:id/download?workspaceId=
 * @access Private
 *
 * Strategy:
 *   • Cloud backends (Supabase, Cloudinary) — the file is publicly hosted.
 *     We redirect the browser straight to the public URL so no bytes flow
 *     through our server.
 *   • Local backend — stream the file from disk with res.sendFile.
 */
const downloadAttachment = asyncHandler(async (req, res) => {
  const { id }      = req.params;
  const workspaceId = req.query.workspaceId;

  const { fileUrl, absolutePath, originalName, mimeType } =
    await attachmentService.resolveAttachmentPath({
      attachmentId: id,
      workspaceId,
      userId: req.user._id,
    });

  if (fileUrl) {
    // Cloud-hosted: redirect the client directly to the storage URL
    return res.redirect(302, fileUrl);
  }

  // Local disk: stream the file
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"`);
  res.setHeader('Content-Type', mimeType);
  res.sendFile(absolutePath);
});

module.exports = { getAttachments, uploadAttachment, deleteAttachment, downloadAttachment };
