const { S3Client } = require("@aws-sdk/client-s3");
const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");
const fs = require("fs");

const hasAwsCredentials = Boolean(
  (process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY) &&
  (process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_KEY)
);

let s3 = null;
if (hasAwsCredentials) {
  s3 = new S3Client({
    region: process.env.AWS_REGION || "ap-south-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_KEY,
    },
  });
}

/**
 * Creates an uploader.
 * If AWS credentials are set, it streams to AWS S3.
 * If AWS credentials are not set yet, it saves locally to public/uploads/ for easy local testing.
 *
 * @param {string} eventFolder - S3 or local subfolder name (e.g. 'freeze', 'innowave', 'hacknova', 'rootcause')
 * @param {number} maxFileSizeMB - Maximum file size in MB
 * @param {Array<string>} allowedMimeTypes - Allowed MIME types (e.g. ['image/jpeg', 'application/pdf'])
 */
const createS3Uploader = (eventFolder, maxFileSizeMB = 50, allowedMimeTypes = []) => {
  let storage;

  if (hasAwsCredentials && s3) {
    // AWS S3 Storage
    storage = multerS3({
      s3: s3,
      bucket: process.env.AWS_S3_BUCKET || process.env.AWS_BUCKET || "pulzion-submissions-bucket",
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: function (req, file, cb) {
        const userId = req.user ? req.user.id : "anonymous";
        const sanitizedOriginal = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
        const uniqueKey = `submissions/${eventFolder}/${userId}-${Date.now()}-${sanitizedOriginal}`;
        cb(null, uniqueKey);
      },
    });
  } else {
    // Local Disk Fallback (Enables testing Photo/PDF uploads right now without AWS keys)
    const uploadDir = path.join(__dirname, "..", "public", "uploads", eventFolder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    storage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, uploadDir);
      },
      filename: function (req, file, cb) {
        const userId = req.user ? req.user.id : "anonymous";
        const sanitizedOriginal = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filename = `${userId}-${Date.now()}-${sanitizedOriginal}`;
        cb(null, filename);
      },
    });
  }

  const upload = multer({
    storage: storage,
    limits: {
      fileSize: maxFileSizeMB * 1024 * 1024,
    },
    fileFilter: function (req, file, cb) {
      if (allowedMimeTypes.length === 0) {
        return cb(null, true);
      }
      const ext = path.extname(file.originalname || "").toLowerCase();
      
      // Known extension fallbacks
      const isExtAllowed = (
        (ext === ".jpg" || ext === ".jpeg") && allowedMimeTypes.some(m => m.includes("jpeg") || m.includes("jpg")) ||
        (ext === ".png" && allowedMimeTypes.some(m => m.includes("png"))) ||
        ((ext === ".pptx" || ext === ".ppt") && allowedMimeTypes.some(m => m.includes("presentation") || m.includes("powerpoint"))) ||
        (ext === ".pdf" && allowedMimeTypes.some(m => m.includes("pdf"))) ||
        ((ext === ".zip" || ext === ".rar" || ext === ".7z" || ext === ".tar" || ext === ".gz") && allowedMimeTypes.some(m => m.includes("zip") || m.includes("compressed") || m.includes("octet-stream") || m.includes("archive")))
      );

      if (allowedMimeTypes.includes(file.mimetype) || isExtAllowed) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type (${file.mimetype}). Allowed types for this event: ${allowedMimeTypes.join(", ")}`));
      }
    },
  });

  function normalizeFileLocation(req, file) {
    if (!file) return;
    if (!file.location) {
      const host = req.get("host") || "localhost:3001";
      const protocol = req.protocol || "http";
      file.location = `${protocol}://${host}/uploads/${eventFolder}/${file.filename}`;
    }
  }

  // Middleware wrapper that normalizes req.file.location so controllers work identically in both S3 & local modes
  return {
    single: (fieldName) => {
      return (req, res, next) => {
        upload.single(fieldName)(req, res, (err) => {
          if (err) return next(err);
          if (req.file) normalizeFileLocation(req, req.file);
          next();
        });
      };
    },
    fields: (fieldsArray) => {
      return (req, res, next) => {
        upload.fields(fieldsArray)(req, res, (err) => {
          if (err) return next(err);
          if (req.files) {
            Object.values(req.files).forEach((fileArr) => {
              if (Array.isArray(fileArr)) {
                fileArr.forEach((f) => normalizeFileLocation(req, f));
              }
            });
          }
          next();
        });
      };
    },
    any: () => {
      return (req, res, next) => {
        upload.any()(req, res, (err) => {
          if (err) return next(err);
          if (Array.isArray(req.files)) {
            req.files.forEach((f) => normalizeFileLocation(req, f));
          }
          next();
        });
      };
    },
  };
};

module.exports = { s3, createS3Uploader, hasAwsCredentials };
