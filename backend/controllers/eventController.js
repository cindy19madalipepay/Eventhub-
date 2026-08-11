const pool = require('../config/db');
// ============================================================
// UPLOAD EVENT BANNER TO CLOUDINARY
// ============================================================

const uploadEventBanner = async (req, res) => {
  try {
    const { id } = req.params;

    // --------------------------------------------------------
    // Validate Event ID
    // --------------------------------------------------------

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required.',
      });
    }

    // --------------------------------------------------------
    // Validate uploaded file
    // --------------------------------------------------------

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Banner image is required.',
      });
    }

    // --------------------------------------------------------
    // Check if event exists
    // --------------------------------------------------------

    const [events] = await pool.query(
      `
      SELECT
        event_id,
        event_name,
        banner_image
      FROM events
      WHERE event_id = ?
      `,
      [id]
    );

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
      });
    }

    // --------------------------------------------------------
    // CloudinaryStorage uploads the file automatically.
    // multer-storage-cloudinary normally provides the URL
    // through req.file.path.
    // --------------------------------------------------------

    const bannerUrl =
      req.file.path ||
      req.file.secure_url ||
      req.file.url ||
      null;

    // --------------------------------------------------------
    // Make sure Cloudinary returned a URL
    // --------------------------------------------------------

    if (!bannerUrl) {
      console.error(
        'Cloudinary file information:',
        req.file
      );

      return res.status(500).json({
        success: false,
        message:
          'Cloudinary did not return a valid image URL.',
      });
    }

    // --------------------------------------------------------
    // Save Cloudinary URL in database
    // --------------------------------------------------------

    await pool.query(
      `
      UPDATE events
      SET banner_image = ?
      WHERE event_id = ?
      `,
      [bannerUrl, id]
    );

    // --------------------------------------------------------
    // Success
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,
      message: 'Event banner uploaded successfully.',
      event_id: Number(id),
      banner_image: bannerUrl,
      banner_url: bannerUrl,
    });

  } catch (error) {
    console.error(
      'UploadEventBanner error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to upload event banner.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};
// ============================================================
// UPLOAD EVENT RULES FILE
// ============================================================

const uploadEventRules = async (req, res) => {
  try {
    const { id } = req.params;

    // --------------------------------------------------------
    // Validate Event ID
    // --------------------------------------------------------

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required.',
      });
    }

    // --------------------------------------------------------
    // Validate file
    // --------------------------------------------------------

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Rules file is required.',
      });
    }

    // --------------------------------------------------------
    // Check event
    // --------------------------------------------------------

    const [events] = await pool.query(
      `
      SELECT
        event_id,
        event_name
      FROM events
      WHERE event_id = ?
      `,
      [id]
    );

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
      });
    }

    // --------------------------------------------------------
    // Cloudinary URL
    // --------------------------------------------------------

    const rulesUrl =
      req.file.path ||
      req.file.secure_url ||
      req.file.url ||
      null;

    if (!rulesUrl) {
      console.error(
        'Cloudinary rules file information:',
        req.file
      );

      return res.status(500).json({
        success: false,
        message:
          'Cloudinary did not return a valid rules file URL.',
      });
    }

    // --------------------------------------------------------
    // Save URL
    // --------------------------------------------------------

    await pool.query(
      `
      UPDATE events
      SET rules_file = ?
      WHERE event_id = ?
      `,
      [rulesUrl, id]
    );

    // --------------------------------------------------------
    // Success
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,
      message: 'Event rules uploaded successfully.',
      event_id: Number(id),
      rules_file: rulesUrl,
      rules_url: rulesUrl,
    });

  } catch (error) {
    console.error(
      'UploadEventRules error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to upload event rules.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};
module.exports = {
  createEvent,
  uploadEventBanner,
  uploadEventRules,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getEventQR,
};