const express = require('express');

const router = express.Router();

const {
  getAllEvents,
  getEventById,
  getEventByCode,
  createEvent,
  updateEvent,
  getEventQR,
  uploadBannerImage,
  cancelEvent,
} = require('../controllers/eventController');

const authMiddleware =
  require('../middleware/authMiddleware');

const roleMiddleware =
  require('../middleware/roleMiddleware');

const {
  uploadRules,
  uploadEvaluation,
  uploadBanner,
} = require('../middleware/uploadMiddleware');


// ============================================================
// PUBLIC EVENT ROUTE
// ============================================================
// No login required.
//
// Example:
// /api/events/public/ABC123
//
// Useful when a QR code contains an event code.

router.get(
  '/public/:code',
  getEventByCode
);


// ============================================================
// GET ALL EVENTS
// ============================================================

router.get(
  '/',
  authMiddleware,
  getAllEvents
);


// ============================================================
// GET EVENT BY ID
// ============================================================

router.get(
  '/:id',
  authMiddleware,
  getEventById
);


// ============================================================
// GET EVENT QR
// ============================================================
// Admin only.
//
// This endpoint should generate/retrieve the QR code
// associated with the event.

router.get(
  '/:id/qr',
  authMiddleware,
  roleMiddleware('admin'),
  getEventQR
);


// ============================================================
// CREATE EVENT
// ============================================================

router.post(
  '/',
  authMiddleware,
  roleMiddleware('admin'),
  createEvent
);


// ============================================================
// UPDATE EVENT
// ============================================================

router.put(
  '/:id',
  authMiddleware,
  roleMiddleware('admin'),
  updateEvent
);


// ============================================================
// CANCEL EVENT
// ============================================================

router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware('admin'),
  cancelEvent
);


// ============================================================
// UPLOAD EVENT BANNER
// ============================================================

router.post(
  '/:id/banner-image',
  authMiddleware,
  roleMiddleware('admin'),
  uploadBanner.single('banner_image'),
  uploadBannerImage
);


// ============================================================
// UPLOAD EVENT RULES
// ============================================================

router.post(
  '/:id/rules-file',
  authMiddleware,
  roleMiddleware('admin'),
  uploadRules.single('rules_file'),

  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded.',
        });
      }

      const { pool } = require('../config/db');

      const filePath =
        `rules/${req.file.filename}`;

      await pool.query(
        `
        UPDATE events
        SET rules_file = ?
        WHERE event_id = ?
        `,
        [
          filePath,
          req.params.id,
        ]
      );

      return res.status(200).json({
        success: true,
        message: 'Rules file uploaded successfully.',
        file_path: filePath,
        file_url: `/uploads/${filePath}`,
      });

    } catch (error) {
      console.error(
        'UploadRulesFile error:',
        error
      );

      return res.status(500).json({
        success: false,
        message: 'Server error.',
      });
    }
  }
);


// ============================================================
// UPLOAD EVENT EVALUATION
// ============================================================

router.post(
  '/:id/evaluation-file',
  authMiddleware,
  roleMiddleware('admin'),
  uploadEvaluation.single('evaluation_file'),

  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded.',
        });
      }

      const { pool } =
        require('../config/db');

      const filePath =
        `evaluations/${req.file.filename}`;

      await pool.query(
        `
        UPDATE events
        SET evaluation_file = ?
        WHERE event_id = ?
        `,
        [
          filePath,
          req.params.id,
        ]
      );

      return res.status(200).json({
        success: true,
        message:
          'Evaluation file uploaded successfully.',
        file_path: filePath,
        file_url:
          `/uploads/${filePath}`,
      });

    } catch (error) {
      console.error(
        'UploadEvaluationFile error:',
        error
      );

      return res.status(500).json({
        success: false,
        message: 'Server error.',
      });
    }
  }
);


module.exports = router;