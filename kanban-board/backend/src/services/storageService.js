/**
 * StorageService — pluggable file storage abstraction.
 *
 * Supported backends (UPLOAD_STORAGE env var):
 *   local      — writes to disk  (default, ephemeral on Render free tier)
 *   supabase   — uploads to Supabase Storage bucket, stores public URL
 *   cloudinary — uploads to Cloudinary
 *
 * Interface every backend must implement:
 *   save(file)         → Promise<{ storedName, filePath, fileUrl }>
 *   delete(storedName) → Promise<void>
 *
 * For the 'supabase' backend:
 *   • multer uses memoryStorage so the file buffer is available in memory.
 *   • The file is uploaded to SUPABASE_BUCKET/<uuid><ext>.
 *   • getPublicUrl() returns a permanent public URL that is stored in MongoDB.
 *   • No local temp file is ever written.
 */

const fs   = require('fs');
const path = require('path');

// ── Local backend ─────────────────────────────────────────────────────────────

const localBackend = {
  async save(file) {
    return {
      storedName: file.filename,
      filePath:   file.path,
      fileUrl:    null, // served via /uploads static route
    };
  },

  async delete(filePath) {
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error('[StorageService:local] Delete failed:', err.message);
    }
  },
};

// ── Supabase backend ──────────────────────────────────────────────────────────

const supabaseBackend = {
  _client: null,

  getClient() {
    if (this._client) return this._client;

    const { createClient } = require('@supabase/supabase-js');

    const url        = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!url || !serviceKey) {
      throw new Error(
        '[StorageService:supabase] SUPABASE_URL and SUPABASE_SERVICE_KEY must be set ' +
        'in environment variables when UPLOAD_STORAGE=supabase.'
      );
    }

    // Use the service-role key so uploads bypass Row Level Security
    this._client = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    return this._client;
  },

  /**
   * Upload a file buffer (from multer memoryStorage) to Supabase Storage.
   * Returns the permanent public URL and the storage path as storedName.
   */
  async save(file) {
    const supabase   = this.getClient();
    const bucket     = process.env.SUPABASE_BUCKET || 'attachments';
    const ext        = path.extname(file.originalname).toLowerCase();
    const { v4: uuidv4 } = require('uuid');
    const storedName = `${uuidv4()}${ext}`;          // e.g. "a1b2c3d4-....png"
    const filePath   = `tasks/${storedName}`;         // folder/filename in bucket

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file.buffer, {
        contentType:  file.mimetype,
        cacheControl: '3600',
        upsert:       false,
      });

    if (error) {
      throw new Error(`[StorageService:supabase] Upload failed: ${error.message}`);
    }

    // getPublicUrl is synchronous — it just builds the URL from the bucket config
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return {
      storedName,            // short uuid-based filename — used to delete later
      filePath,              // "tasks/<uuid>.ext" — the path inside the bucket
      fileUrl: data.publicUrl,
    };
  },

  /**
   * Remove a file from the Supabase bucket by its in-bucket path.
   * @param {string} filePath  — the "tasks/<uuid>.ext" path stored in Attachment.filePath
   */
  async delete(filePath) {
    if (!filePath) return;
    const supabase = this.getClient();
    const bucket   = process.env.SUPABASE_BUCKET || 'attachments';

    const { error } = await supabase.storage.from(bucket).remove([filePath]);
    if (error) {
      console.error('[StorageService:supabase] Delete failed:', error.message);
    }
  },
};

// ── Cloudinary backend ────────────────────────────────────────────────────────

const cloudinaryBackend = {
  _client: null,

  getClient() {
    if (this._client) return this._client;

    let cloudinary;
    try {
      cloudinary = require('cloudinary').v2;
    } catch {
      throw new Error(
        '[StorageService] UPLOAD_STORAGE=cloudinary but the "cloudinary" npm package ' +
        'is not installed. Run: npm install cloudinary'
      );
    }

    if (process.env.CLOUDINARY_URL) {
      cloudinary.config({ secure: true });
    } else {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key:    process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure:     true,
      });
    }

    this._client = cloudinary;
    return cloudinary;
  },

  async save(file) {
    const cloudinary = this.getClient();

    const result = await cloudinary.uploader.upload(file.path, {
      folder:          'kanban-board/attachments',
      public_id:       path.parse(file.filename).name,
      resource_type:   'auto',
      use_filename:    false,
      unique_filename: true,
    });

    try { fs.unlinkSync(file.path); } catch (_) {}

    return {
      storedName: result.public_id,
      filePath:   result.secure_url,
      fileUrl:    result.secure_url,
    };
  },

  async delete(storedName) {
    const cloudinary = this.getClient();
    try {
      await cloudinary.uploader.destroy(storedName, { resource_type: 'auto' });
    } catch (err) {
      console.error('[StorageService:cloudinary] Delete failed:', err.message);
    }
  },
};

// ── Factory ───────────────────────────────────────────────────────────────────

const getBackend = () => {
  const backend = (process.env.UPLOAD_STORAGE || 'local').toLowerCase();
  if (backend === 'supabase')   return supabaseBackend;
  if (backend === 'cloudinary') return cloudinaryBackend;
  return localBackend;
};

module.exports = {
  save:   (file)              => getBackend().save(file),
  delete: (storedNameOrPath)  => getBackend().delete(storedNameOrPath),
  getBackendName: ()          => (process.env.UPLOAD_STORAGE || 'local').toLowerCase(),
};
