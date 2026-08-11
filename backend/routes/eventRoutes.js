const express = require('express');

const router = express.Router();

const {
  createEvent,
  uploadEventBanner,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getEventQR,
  uploadEventRules,
} = require('../controllers/eventController');

const {
  uploadBanner,
  uploadRules,
} = require('../middleware/uploadMiddleware');

// ============================================================
// CREATE EVENT
// POST /api/events
// ============================================================
router.post('/', createEvent);

// ============================================================
// GET ALL EVENTS
// GET /api/events
// ============================================================
router.get('/', getEvents);

// ============================================================
// GET EVENT QR
// GET /api/events/:id/qr
// ============================================================
router.get('/:id/qr', getEventQR);

// ============================================================
// UPLOAD EVENT BANNER
// POST /api/events/:id/banner-image
// Field name: banner_image
// ============================================================
router.post(
  '/:id/banner-image',
  uploadBanner.single('banner_image'),
  uploadEventBanner
);

// ============================================================
// UPLOAD EVENT RULES
// POST /api/events/:id/rules-file
// Field name: rules_file
// ============================================================
router.post(
  '/:id/rules-file',
  uploadRules.single('rules_file'),
  uploadEventRules
);

// ============================================================
// UPDATE EVENT
// PUT /api/events/:id
// ============================================================
router.put('/:id', updateEvent);

// ============================================================
// DELETE EVENT
// DELETE /api/events/:id
// ============================================================
router.delete('/:id', deleteEvent);

// ============================================================
// GET EVENT BY ID
// GET /api/events/:id
// ============================================================
router.get('/:id', getEventById);

module.exports = router;