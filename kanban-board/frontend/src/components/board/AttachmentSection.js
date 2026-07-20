import React, { useState, useEffect, useCallback, useRef } from 'react';
import attachmentService from '../../services/attachmentService';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Spinner from '../common/Spinner';

// ── Helpers ───────────────────────────────────────────────────────────────────

const FILE_ICONS = {
  'image/':                  '🖼️',
  'application/pdf':         '📄',
  'application/msword':      '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml': '📝',
  'application/vnd.ms-excel': '📊',
  'application/vnd.openxmlformats-officedocument.spreadsheetml':    '📊',
  'application/vnd.ms-powerpoint':                                  '📊',
  'application/vnd.openxmlformats-officedocument.presentationml':   '📊',
  'application/zip':         '🗜️',
  'application/x-zip-compressed': '🗜️',
  'text/':                   '📃',
  default:                   '📎',
};

const getFileIcon = (mimeType) => {
  if (!mimeType) return FILE_ICONS.default;
  const key = Object.keys(FILE_ICONS).find(
    (k) => k !== 'default' && mimeType.startsWith(k)
  );
  return key ? FILE_ICONS[key] : FILE_ICONS.default;
};

/**
 * Derive isImage from mimeType string directly.
 * Mongoose virtuals are stripped during JSON serialization, so we cannot
 * rely on att.isImage coming from the API response.
 */
const isImageMime = (mimeType) =>
  typeof mimeType === 'string' && mimeType.startsWith('image/');

const formatSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

// ── File Preview Overlay ───────────────────────────────────────────────────────

function AttachmentPreview({ attachment, fileUrl, onClose }) {
  const [imgState, setImgState] = useState('loading'); // loading | ok | error
  const isPdf = attachment.mimeType === 'application/pdf';
  const isImg = isImageMime(attachment.mimeType);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Reset loading state whenever the shown attachment changes
  useEffect(() => { setImgState('loading'); }, [fileUrl]);

  return (
    <div
      className="att-preview-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Preview: ${attachment.originalName}`}
    >
      <div
        className="att-preview-overlay__box"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="att-preview-overlay__header">
          <span className="att-preview-overlay__name" title={attachment.originalName}>
            {attachment.originalName}
          </span>
          <div className="att-preview-overlay__header-actions">
            <a
              href={fileUrl}
              download={attachment.originalName}
              className="att-preview-overlay__btn"
              target="_blank"
              rel="noopener noreferrer"
              title="Download"
              aria-label="Download file"
            >
              ⬇️ Download
            </a>
            <button
              className="att-preview-overlay__close"
              onClick={onClose}
              aria-label="Close preview"
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="att-preview-overlay__body">
          {isImg ? (
            <>
              {/* Show spinner while image loads */}
              {imgState === 'loading' && (
                <div style={{ position: 'absolute' }}>
                  <Spinner size="medium" />
                </div>
              )}

              <img
                src={fileUrl}
                alt={attachment.originalName}
                className="att-preview-overlay__image"
                style={{ display: imgState === 'loading' ? 'none' : 'block' }}
                onLoad={() => setImgState('ok')}
                onError={() => setImgState('error')}
              />

              {/* Fallback when image fails to load */}
              {imgState === 'error' && (
                <div className="att-preview-overlay__no-preview">
                  <span style={{ fontSize: '3rem' }}>🖼️</span>
                  <p>Image could not be loaded.</p>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="att-preview-overlay__btn"
                  >
                    Open in new tab ↗
                  </a>
                </div>
              )}
            </>
          ) : isPdf ? (
            <iframe
              src={fileUrl}
              title={attachment.originalName}
              className="att-preview-overlay__iframe"
            />
          ) : (
            <div className="att-preview-overlay__no-preview">
              <span style={{ fontSize: '3rem' }}>{getFileIcon(attachment.mimeType)}</span>
              <p>Preview not available for this file type.</p>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="att-preview-overlay__btn"
              >
                ⬇️ Download to view
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_SIZE_MB    = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const ACCEPTED_EXTENSIONS =
  'image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip';

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * AttachmentSection — complete file attachment UI for a task.
 *
 * Features:
 *  - Click-to-upload + drag-and-drop
 *  - Upload progress bar
 *  - Image preview (thumbnail)
 *  - File type icon for non-images
 *  - Download button
 *  - Delete button (RBAC-aware: viewers can't upload/delete)
 *  - WebSocket real-time sync with other open clients
 *  - Activity log integration (handled by backend service)
 */
function AttachmentSection({ taskId }) {
  const { activeWorkspace, getMemberRole } = useWorkspace();
  const { user }                           = useAuth();
  const { subscribe }                      = useSocket();
  const workspaceId = activeWorkspace?._id;

  // Derive RBAC permissions
  const myRole    = getMemberRole(user?._id);
  const canUpload = myRole && ['owner', 'admin', 'manager', 'member'].includes(myRole);
  const canDelete = (att) => {
    if (!myRole) return false;
    if (['owner', 'admin', 'manager'].includes(myRole)) return true;
    // member can delete only their own
    return myRole === 'member' &&
      (att.uploadedBy?._id || att.uploadedBy)?.toString() === user?._id?.toString();
  };

  const [attachments, setAttachments] = useState([]);
  const [isLoading,   setLoading]     = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [progress,    setProgress]    = useState(0);
  const [isDragging,  setIsDragging]  = useState(false);
  const [preview,     setPreview]     = useState(null); // attachment being previewed

  const fileInputRef = useRef(null);
  const dropZoneRef  = useRef(null);

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchAttachments = useCallback(async () => {
    if (!taskId || !workspaceId) return;
    setLoading(true);
    try {
      const res = await attachmentService.getAttachments(taskId, workspaceId);
      setAttachments(res.data.attachments || []);
    } catch (_) {}
    finally { setLoading(false); }
  }, [taskId, workspaceId]);

  useEffect(() => { fetchAttachments(); }, [fetchAttachments]);

  // ── WebSocket real-time sync ─────────────────────────────────────────────────
  // Only update state for events that belong to this task

  useEffect(() => {
    const unsubUploaded = subscribe('attachment:uploaded', ({ taskId: evtTaskId, attachment }) => {
      if (evtTaskId !== taskId) return;
      setAttachments((prev) => {
        // Avoid duplicates if the current user's own upload already updated state
        if (prev.find((a) => a._id === attachment._id)) return prev;
        return [attachment, ...prev];
      });
    });

    const unsubDeleted = subscribe('attachment:deleted', ({ attachmentId }) => {
      setAttachments((prev) => prev.filter((a) => a._id !== attachmentId));
    });

    return () => {
      unsubUploaded && unsubUploaded();
      unsubDeleted  && unsubDeleted();
    };
  }, [subscribe, taskId]);

  // ── Upload logic ─────────────────────────────────────────────────────────────

  const doUpload = useCallback(async (file) => {
    if (!file) return;

    setUploadError(null);

    if (file.size > MAX_SIZE_BYTES) {
      setUploadError(`File too large. Maximum size is ${MAX_SIZE_MB} MB.`);
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const res = await attachmentService.uploadAttachment(
        taskId,
        workspaceId,
        file,
        (evt) => {
          if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      );
      // Add to list immediately for instant feedback (WebSocket will deduplicate)
      setAttachments((prev) => {
        const att = res.data.attachment;
        if (prev.find((a) => a._id === att._id)) return prev;
        return [att, ...prev];
      });
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [taskId, workspaceId]);

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    doUpload(file);
  };

  // ── Drag-and-drop ────────────────────────────────────────────────────────────

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    // Only clear when leaving the drop zone itself, not a child
    if (!dropZoneRef.current?.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!canUpload) return;
    const file = e.dataTransfer.files?.[0];
    doUpload(file);
  };

  // ── Delete ───────────────────────────────────────────────────────────────────

  const handleDelete = async (att) => {
    if (!window.confirm(`Delete "${att.originalName}"?`)) return;
    try {
      await attachmentService.deleteAttachment(att._id, workspaceId);
      // Optimistic remove; WebSocket will sync other clients
      setAttachments((prev) => prev.filter((a) => a._id !== att._id));
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Delete failed.');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="attachment-section">

      {/* ── Preview overlay ─────────────────────────────────────────────── */}
      {preview && (
        <AttachmentPreview
          attachment={preview}
          fileUrl={attachmentService.getFileUrl(preview, workspaceId)}
          onClose={() => setPreview(null)}
        />
      )}

      {/* ── Upload zone — only visible to members/managers/admins/owners ─── */}
      {canUpload && (
        <div
          ref={dropZoneRef}
          className={`attachment-section__upload${isDragging ? ' attachment-section__upload--dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            id="attachment-file-input"
            className="sr-only"
            onChange={handleFileInput}
            accept={ACCEPTED_EXTENSIONS}
            disabled={uploading}
          />
          <label
            htmlFor="attachment-file-input"
            className="attachment-section__upload-label"
            style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}
          >
            {uploading ? (
              <span className="attachment-section__upload-label-inner">
                <Spinner size="small" />
                <span>Uploading… {progress}%</span>
              </span>
            ) : isDragging ? (
              <span className="attachment-section__upload-label-inner">
                <span style={{ fontSize: '1.5rem' }}>📂</span>
                <span>Drop file here</span>
              </span>
            ) : (
              <span className="attachment-section__upload-label-inner">
                <span style={{ fontSize: '1.2rem' }}>📎</span>
                <span>
                  Click to attach or <strong>drag &amp; drop</strong>
                  <br />
                  <small style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                    Images, PDF, Office, ZIP · max {MAX_SIZE_MB} MB
                  </small>
                </span>
              </span>
            )}
          </label>

          {/* Progress bar */}
          {uploading && (
            <div className="attachment-section__progress-bar">
              <div
                className="attachment-section__progress-fill"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          )}

          {/* Upload error */}
          {uploadError && (
            <div className="alert alert--error" style={{ marginTop: '.5rem', fontSize: '.82rem' }}>
              {uploadError}
              <button
                style={{ marginLeft: '.5rem', fontWeight: 700, cursor: 'pointer', background: 'none', border: 'none', color: 'inherit' }}
                onClick={() => setUploadError(null)}
                aria-label="Dismiss error"
              >✕</button>
            </div>
          )}
        </div>
      )}

      {/* Viewer-only notice */}
      {!canUpload && (
        <p className="attachment-section__viewer-note">
          🔒 You have view-only access. Downloading is available below.
        </p>
      )}

      {/* ── Attachment list ─────────────────────────────────────────────── */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '1rem' }}>
          <Spinner size="small" />
        </div>
      ) : attachments.length === 0 ? (
        <p className="attachment-section__empty">
          {canUpload ? 'No attachments yet. Upload the first one above.' : 'No attachments.'}
        </p>
      ) : (
        <ul className="attachment-list">
          {attachments.map((att) => (
            <li key={att._id} className="attachment-item">

              {/* Thumbnail for images / icon for others — click opens preview */}
              {isImageMime(att.mimeType) ? (
                <button
                  className="attachment-item__preview-link"
                  onClick={() => setPreview(att)}
                  aria-label={`Preview ${att.originalName}`}
                  title="Click to preview"
                >
                  <div
                    className="attachment-item__preview"
                    style={{
                      backgroundImage: `url(${attachmentService.getFileUrl(att, workspaceId)})`,
                    }}
                    role="img"
                    aria-label={att.originalName}
                  />
                </button>
              ) : (
                <button
                  className="attachment-item__icon-btn"
                  onClick={() => setPreview(att)}
                  aria-label={`Preview ${att.originalName}`}
                  title="Click to preview"
                >
                  <span className="attachment-item__icon" aria-hidden="true">
                    {getFileIcon(att.mimeType)}
                  </span>
                </button>
              )}

              {/* File info */}
              <div className="attachment-item__info">
                <span className="attachment-item__name" title={att.originalName}>
                  {att.originalName}
                </span>
                <span className="attachment-item__meta">
                  {formatSize(att.size)}
                  {att.uploadedBy?.name && ` · ${att.uploadedBy.name}`}
                  {att.createdAt && ` · ${formatTime(att.createdAt)}`}
                </span>
              </div>

              {/* Actions */}
              <div className="attachment-item__actions">
                {/* Preview — opens inline lightbox */}
                <button
                  className="attachment-item__btn"
                  onClick={() => setPreview(att)}
                  aria-label={`Preview ${att.originalName}`}
                  title="Preview"
                >
                  👁️
                </button>

                {/* Download — available to all roles */}
                <a
                  href={attachmentService.getFileUrl(att, workspaceId)}
                  className="attachment-item__btn"
                  download={att.originalName}
                  aria-label={`Download ${att.originalName}`}
                  title="Download"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ⬇️
                </a>

                {/* Delete — RBAC-gated */}
                {canDelete(att) && (
                  <button
                    className="attachment-item__btn attachment-item__btn--danger"
                    onClick={() => handleDelete(att)}
                    aria-label={`Delete ${att.originalName}`}
                    title="Delete"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AttachmentSection;
