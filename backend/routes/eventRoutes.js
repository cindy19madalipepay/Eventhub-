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
} = require('../controllers/eventController');

const {
  uploadBanner,
} = require('../middleware/uploadMiddleware');

// ============================================================
// CREATE EVENT
// ============================================================
router.post('/', createEvent);

// ============================================================
// GET ALL EVENTS
// ============================================================
router.get('/', getEvents);

// ============================================================
// GET EVENT QR
// ============================================================
router.get('/:id/qr', getEventQR);

// ============================================================
// UPLOAD EVENT BANNER
// ============================================================
router.post(
  '/:id/banner-image',
  uploadBanner.single('banner_image'),
  uploadEventBanner
);

// ============================================================
// UPDATE EVENT
// ============================================================
router.put('/:id', updateEvent);

// ============================================================
// DELETE EVENT
// ============================================================
router.delete('/:id', deleteEvent);

// ============================================================
// GET EVENT BY ID
// ============================================================
router.get('/:id', getEventById);

module.exports = router;