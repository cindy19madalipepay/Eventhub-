const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
require('dotenv').config();

const MAX_IMAGE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024;
const MAX_DOC_SIZE   = 10 * 1024 * 1024; // 10MB max for PDF/rules/evaluation

const imageFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const valid = allowed.test(file.originalname.toLowerCase()) && allowed.test(file.mimetype);
  valid ? cb(null, true) : cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
};

const docFilter = (req, file, cb) => {
  const allowedExt  = /pdf|jpeg|jpg|png/;
  const extOk  = allowedExt.test(file.originalname.toLowerCase());
  const mimeOk = /pdf|jpeg|jpg|png/.test(file.mimetype);
  (extOk && mimeOk)
    ? cb(null, true)
    : cb(new Error('Only PDF or image files are allowed.'));
};

// ── Payment proof storage (images only) ──────────────────────────────────────
const paymentStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'eventhub/payments',
    resource_type: 'image',
    public_id: `payment-${req.user?.user_id || 'guest'}-${Date.now()}`,
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  }),
});

const upload = multer({
  storage:    paymentStorage,
  fileFilter: imageFilter,
  limits:     { fileSize: MAX_IMAGE_SIZE },
});

// ── Rules file storage (PDF or images) ───────────────────────────────────────
const rulesStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'eventhub/rules',
    resource_type: 'auto', // lets PDFs upload as 'raw' and images upload as 'image'
    public_id: `rules-${Date.now()}`,
  }),
});

const uploadRules = multer({
  storage:    rulesStorage,
  fileFilter: docFilter,
  limits:     { fileSize: MAX_DOC_SIZE },
});

// ── Evaluation file storage (PDF or images) ──────────────────────────────────
const evaluationStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'eventhub/evaluations',
    resource_type: 'auto',
    public_id: `evaluation-${Date.now()}`,
  }),
});

const uploadEvaluation = multer({
  storage:    evaluationStorage,
  fileFilter: docFilter,
  limits:     { fileSize: MAX_DOC_SIZE },
});

// ── Attendance photo storage (images only, self-service check-in) ────────────
const attendanceStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'eventhub/attendance',
    resource_type: 'image',
    public_id: `attendance-${req.user?.user_id || 'guest'}-${Date.now()}`,
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  }),
});

const uploadAttendance = multer({
  storage:    attendanceStorage,
  fileFilter: imageFilter,
  limits:     { fileSize: MAX_IMAGE_SIZE },
});

// ── Banner image storage (images only) ────────────────────────────────────────
const bannerStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'eventhub/banners',
    resource_type: 'image',
    public_id: `banner-${req.params.id || 'event'}-${Date.now()}`,
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  }),
});

const uploadBanner = multer({
  storage:    bannerStorage,
  fileFilter: imageFilter,
  limits:     { fileSize: MAX_IMAGE_SIZE },
});

module.exports = { upload, uploadRules, uploadEvaluation, uploadAttendance, uploadBanner };