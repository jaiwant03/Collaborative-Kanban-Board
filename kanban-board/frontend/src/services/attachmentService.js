import api from './api';

const attachmentService = {
  /**
   * List attachments for a task.
   * GET /attachments/task/:taskId?workspaceId=
   */
  getAttachments(taskId, workspaceId) {
    return api.get(`/attachments/task/${taskId}`, { params: { workspaceId } });
  },

  /**
   * Upload a file attachment.
   * POST /attachments/task/:taskId  (multipart/form-data)
   */
  uploadAttachment(taskId, workspaceId, file, onUploadProgress) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspaceId', workspaceId);
    return api.post(`/attachments/task/${taskId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
  },

  /**
   * Delete an attachment.
   * DELETE /attachments/:id?workspaceId=
   */
  deleteAttachment(attachmentId, workspaceId) {
    return api.delete(`/attachments/${attachmentId}`, { params: { workspaceId } });
  },

  /**
   * Returns the URL used to download / open a file.
   *
   * Priority:
   *  1. attachment.fileUrl  — Supabase / Cloudinary public URL stored in MongoDB.
   *     The frontend loads this directly without going through the backend.
   *  2. Backend download route — fallback for local-disk attachments that
   *     have no fileUrl (older records or local dev).
   *
   * @param {object} attachment  — attachment document from MongoDB
   * @param {string} workspaceId
   */
  getFileUrl(attachment, workspaceId) {
    if (attachment?.fileUrl) {
      return attachment.fileUrl;
    }
    // Fallback: go through the backend download route (local disk / legacy)
    return this.getDownloadUrl(attachment._id, workspaceId);
  },

  /**
   * Backend download route URL.
   * For cloud-backed files the backend will 302-redirect to the public URL.
   * For local-disk files the backend streams the file.
   */
  getDownloadUrl(attachmentId, workspaceId) {
    const base  = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    const token = localStorage.getItem('kanban_token');
    return `${base}/attachments/${attachmentId}/download?workspaceId=${workspaceId}&token=${token}`;
  },
};

export default attachmentService;
