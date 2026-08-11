const express = require('express');
const router = express.Router();

const {
  createEvent,
  uploadEventBanner,
  uploadEventRules,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getEventQR,
} = require('../controllers/eventController');

const authenticate = require('../middleware/authMiddleware');

const {
  uploadBanner,
  uploadRules,
} = require('../middleware/uploadMiddleware');


// ============================================================
// GET EVENTS
// ============================================================

router.get('/', authenticate, getEvents);


// ============================================================
// GET SINGLE EVENT
// ============================================================

router.get('/:id', authenticate, getEventById);


// ============================================================
// CREATE EVENT
// ============================================================

router.post('/', authenticate, createEvent);


// ============================================================
// UPLOAD EVENT BANNER
// ============================================================

router.post(
  '/:id/banner',
  authenticate,
  uploadBanner.single('banner'),
  uploadEventBanner
);


// ============================================================
// UPLOAD EVENT RULES
// ============================================================

router.post(
  '/:id/rules',
  authenticate,
  uploadRules.single('rules'),
  uploadEventRules
);


// ============================================================
// UPDATE EVENT
// ============================================================

router.put('/:id', authenticate, updateEvent);


// ============================================================
// DELETE EVENT
// ============================================================

router.delete('/:id', authenticate, deleteEvent);


// ============================================================
// EVENT QR
// ============================================================

router.get('/:id/qr', authenticate, getEventQR);


module.exports = router;