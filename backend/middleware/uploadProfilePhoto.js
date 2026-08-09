const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Uploads go straight to Cloudinary instead of local/tmp disk — this is
// required on Vercel, since serverless functions can't persist files
// written to disk between requests (only /tmp exists, and it's wiped
// after each request finishes). Cloudinary gives back a permanent URL
// we can store in the database instead of a local filename.
const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: 'eventhub/profiles',
    // e.g. 14-1721550000000  (user_id - timestamp, no extension needed —
    // Cloudinary infers format automatically)
    public_id: `${req.user?.user_id || 'unknown'}-${Date.now()}`,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
  }),
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