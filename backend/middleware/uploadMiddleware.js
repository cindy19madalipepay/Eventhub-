const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
require('dotenv').config();

const MAX_IMAGE_SIZE =
  parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024;

const MAX_DOC_SIZE = 10 * 1024 * 1024;

// ============================================================
// IMAGE FILTER
// ============================================================
const imageFilter = (req, file, cb) => {
  const allowedExtensions = /\.(jpeg|jpg|png|gif|webp)$/i;
  const allowedMimeTypes =
    /^image\/(jpeg|jpg|png|gif|webp)$/i;

  const extensionValid =
    allowedExtensions.test(file.originalname);

  const mimeValid =
    allowedMimeTypes.test(file.mimetype);

  if (extensionValid && mimeValid) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Only image files are allowed (jpeg, jpg, png, gif, webp).'
      )
    );
  }
};

// ============================================================
// DOCUMENT FILTER
// ============================================================
const docFilter = (req, file, cb) => {
  const allowedExtensions = /\.(pdf|jpeg|jpg|png)$/i;
  const allowedMimeTypes =
    /^(application\/pdf|image\/jpeg|image\/jpg|image\/png)$/i;

  const extensionValid =
    allowedExtensions.test(file.originalname);

  const mimeValid =
    allowedMimeTypes.test(file.mimetype);

  if (extensionValid && mimeValid) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Only PDF or image files are allowed.'
      )
    );
  }
};

// ============================================================
// PAYMENT PROOF
// ============================================================
const paymentStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'eventhub/payments',
    resource_type: 'image',
    public_id: `payment-${req.user?.user_id || 'guest'}-${Date.now()}`,
    allowed_formats: [
      'jpg',
      'jpeg',
      'png',
      'gif',
      'webp',
    ],
  }),
});

const upload = multer({
  storage: paymentStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: MAX_IMAGE_SIZE,
  },
});

// ============================================================
// RULES FILE
// ============================================================
const rulesStorage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: 'eventhub/rules',
    resource_type: 'auto',
    public_id: `rules-${Date.now()}`,
  }),
});

const uploadRules = multer({
  storage: rulesStorage,
  fileFilter: docFilter,
  limits: {
    fileSize: MAX_DOC_SIZE,
  },
});

// ============================================================
// EVALUATION FILE
// ============================================================
const evaluationStorage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: 'eventhub/evaluations',
    resource_type: 'auto',
    public_id: `evaluation-${Date.now()}`,
  }),
});

const uploadEvaluation = multer({
  storage: evaluationStorage,
  fileFilter: docFilter,
  limits: {
    fileSize: MAX_DOC_SIZE,
  },
});

// ============================================================
// ATTENDANCE PHOTO
// ============================================================
const attendanceStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'eventhub/attendance',
    resource_type: 'image',
    public_id: `attendance-${req.user?.user_id || 'guest'}-${Date.now()}`,
    allowed_formats: [
      'jpg',
      'jpeg',
      'png',
      'gif',
      'webp',
    ],
  }),
});

const uploadAttendance = multer({
  storage: attendanceStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: MAX_IMAGE_SIZE,
  },
});

// ============================================================
// EVENT BANNER
// ============================================================
const bannerStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'eventhub/event-banners',
    resource_type: 'image',
    public_id: `banner-${req.params.id || 'event'}-${Date.now()}`,
    allowed_formats: [
      'jpg',
      'jpeg',
      'png',
      'gif',
      'webp',
    ],
  }),
});

const uploadBanner = multer({
  storage: bannerStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: MAX_IMAGE_SIZE,
  },
});

// ============================================================
// EXPORT
// ============================================================
module.exports = {
  upload,
  uploadRules,
  uploadEvaluation,
  uploadAttendance,
  uploadBanner,
};