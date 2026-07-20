const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { v4: uuidv4 } = require('uuid');
const { ALLOWED_MIME_TYPES } = require('../models/Attachment');

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760', 10); // 10 MB

// ── Storage strategy ──────────────────────────────────────────────────────────
// When UPLOAD_STORAGE=supabase (or cloudinary) we never write to disk —
// the file buffer lives in memory and is streamed straight to the cloud.
// For local storage we keep the original disk-based behaviour.

const backend = (process.env.UPLOAD_STORAGE || 'local').toLowerCase();

let storage;

if (backend === 'local') {
  // Ensure the uploads directory exists
  const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename:    (_req, file,  cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${uuidv4()}${ext}`);
    },
  });
} else {
  // supabase / cloudinary — keep the file in memory
  storage = multer.memoryStorage();
}

// ── File-type filter ──────────────────────────────────────────────────────────

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `File type "${file.mimetype}" is not allowed. ` +
        'Allowed types: images, PDFs, Word, Excel, PowerPoint, text files, CSV, ZIP.'
      ),
      false
    );
  }
};

// ── Export ────────────────────────────────────────────────────────────────────

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } });

module.exports = upload;
