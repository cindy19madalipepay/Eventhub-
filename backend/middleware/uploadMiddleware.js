const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
require('dotenv').config();

const UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';

// Make sure upload subfolders exist
const PAYMENT_PATH    = path.join(UPLOAD_PATH, 'payments');
const RULES_PATH      = path.join(UPLOAD_PATH, 'rules');
const EVALUATION_PATH = path.join(UPLOAD_PATH, 'evaluations');
const ATTENDANCE_PATH = path.join(UPLOAD_PATH, 'attendance');
const BANNER_PATH     = path.join(UPLOAD_PATH, 'banners');

[UPLOAD_PATH, PAYMENT_PATH, RULES_PATH, EVALUATION_PATH, ATTENDANCE_PATH, BANNER_PATH].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── Payment proof storage (images only) ──────────────────────────────────────
const paymentStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PAYMENT_PATH),
  filename:    (req, file, cb) => {
    const name = `payment-${req.user?.user_id || 'guest'}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, name);
  },
});

const imageFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const valid = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
  valid ? cb(null, true) : cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
};

const upload = multer({
  storage:    paymentStorage,
  fileFilter: imageFilter,
  limits:     { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
});

// ── Rules file storage (PDF or images) ───────────────────────────────────────
const rulesStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, RULES_PATH),
  filename:    (req, file, cb) => {
    const name = `rules-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, name);
  },
});

const rulesFilter = (req, file, cb) => {
  const allowedExt  = /pdf|jpeg|jpg|png/;
  const allowedMime = /pdf|jpeg|jpg|png/;
  const extOk  = allowedExt.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowedMime.test(file.mimetype);
  (extOk && mimeOk)
    ? cb(null, true)
    : cb(new Error('Only PDF or image files are allowed for rules.'));
};

const uploadRules = multer({
  storage:    rulesStorage,
  fileFilter: rulesFilter,
  limits:     { fileSize: 10 * 1024 * 1024 }, // 10MB max for PDF
});

// ── Evaluation file storage (PDF or images) ──────────────────────────────────
const evaluationStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, EVALUATION_PATH),
  filename:    (req, file, cb) => {
    const name = `evaluation-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, name);
  },
});

const evaluationFilter = (req, file, cb) => {
  const allowedExt  = /pdf|jpeg|jpg|png/;
  const allowedMime = /pdf|jpeg|jpg|png/;
  const extOk  = allowedExt.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowedMime.test(file.mimetype);
  (extOk && mimeOk)
    ? cb(null, true)
    : cb(new Error('Only PDF or image files are allowed for the evaluation form.'));
};

const uploadEvaluation = multer({
  storage:    evaluationStorage,
  fileFilter: evaluationFilter,
  limits:     { fileSize: 10 * 1024 * 1024 }, // 10MB max for PDF
});

// ── Attendance photo storage (images only, self-service check-in) ────────────
const attendanceStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ATTENDANCE_PATH),
  filename:    (req, file, cb) => {
    const name = `attendance-${req.user?.user_id || 'guest'}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, name);
  },
});

const uploadAttendance = multer({
  storage:    attendanceStorage,
  fileFilter: imageFilter,
  limits:     { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
});

// ── Banner image storage (images only) ────────────────────────────────────────
const bannerStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, BANNER_PATH),
  filename:    (req, file, cb) => {
    const name = `banner-${req.params.id || 'event'}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, name);
  },
});

const uploadBanner = multer({
  storage:    bannerStorage,
  fileFilter: imageFilter,
  limits:     { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
});

module.exports = { upload, uploadRules, uploadEvaluation, uploadAttendance, uploadBanner };