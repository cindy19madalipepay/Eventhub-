const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
require('dotenv').config();

// Use UPLOAD_PATH from environment (e.g. /tmp/uploads on Vercel) so this
// works both locally (./uploads) and on Vercel's read-only filesystem.
const UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';
const uploadDir = path.join(UPLOAD_PATH, 'profiles');

// Make sure the folder exists so multer doesn't fail on first upload
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // e.g. 14-1721550000000.png  (user_id - timestamp . ext)
    const ext = path.extname(file.originalname);
    const userId = req.user?.user_id || 'unknown';
    cb(null, `${userId}-${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, or WEBP images are allowed.'));
  }
};

const uploadProfilePhoto = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB, matches the frontend check
});

module.exports = uploadProfilePhoto;