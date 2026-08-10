const express = require('express');

const router = express.Router();

const eventController = require('../controllers/eventController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// ============================================================
// CREATE EVENT
// ADMIN ONLY
// ============================================================
router.post(
  '/',
  authMiddleware,
  roleMiddleware('admin'),
  eventController.createEvent
);

// ============================================================
// GET ALL EVENTS
// AUTHENTICATED USERS
// ============================================================
router.get(
  '/',
  authMiddleware,
  eventController.getEvents
);

// ============================================================
// GET EVENT QR
// IMPORTANT:
// This MUST come before /:id
// ============================================================
router.get(
  '/:id/qr',
  authMiddleware,
  roleMiddleware('admin'),
  eventController.getEventQR
);

// ============================================================
// GET EVENT BY ID
// ============================================================
router.get(
  '/:id',
  authMiddleware,
  eventController.getEventById
);

// ============================================================
// UPDATE EVENT
// ADMIN ONLY
// ============================================================
router.put(
  '/:id',
  authMiddleware,
  roleMiddleware('admin'),
  eventController.updateEvent
);

// ============================================================
// DELETE EVENT
// ADMIN ONLY
// ============================================================
router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware('admin'),
  eventController.deleteEvent
);

module.exports = router;