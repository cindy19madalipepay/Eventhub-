const { pool } = require('../config/db');

// ============================================================
// CREATE EVENT
// ============================================================

const createEvent = async (req, res) => {
  try {
    const {
      event_name,
      description,
      date_start,
      date_end,
      time_start,
      time_end,
      venue,
      requires_payment,
      payment_amount,
    } = req.body;

    // --------------------------------------------------------
    // Get logged-in user
    // --------------------------------------------------------

    if (!req.user || !req.user.user_id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in again.',
      });
    }

    const createdBy = req.user.user_id;

    // --------------------------------------------------------
    // Validate required fields
    // --------------------------------------------------------

    if (
      !event_name ||
      !date_start ||
      !date_end ||
      !time_start ||
      !time_end ||
      !venue
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required event fields.',
      });
    }

    // --------------------------------------------------------
    // Only admin can create events
    // --------------------------------------------------------

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can create events.',
      });
    }

    // --------------------------------------------------------
    // Payment values
    // --------------------------------------------------------

    const requiresPayment =
      requires_payment === true ||
      requires_payment === 1 ||
      requires_payment === '1' ||
      requires_payment === 'true'
        ? 1
        : 0;

    const paymentAmount = requiresPayment
      ? Number(payment_amount || 0)
      : 0;

    // --------------------------------------------------------
    // Validate payment amount
    // --------------------------------------------------------

    if (requiresPayment && paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than zero.',
      });
    }

    // --------------------------------------------------------
    // Banner
    //
    // The banner can be uploaded separately using
    // /api/events/:id/banner
    // --------------------------------------------------------

    const bannerImage = null;

    // --------------------------------------------------------
    // CREATE EVENT
    //
    // IMPORTANT:
    // created_by is required by your MySQL database.
    // --------------------------------------------------------

    const [result] = await pool.query(
      `
      INSERT INTO events (
        event_name,
        description,
        date_start,
        date_end,
        time_start,
        time_end,
        venue,
        requires_payment,
        payment_amount,
        banner_image,
        created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        event_name,
        description || null,
        date_start,
        date_end,
        time_start,
        time_end,
        venue,
        requiresPayment,
        paymentAmount,
        bannerImage,
        createdBy,
      ]
    );

    // --------------------------------------------------------
    // Return created event
    // --------------------------------------------------------

    return res.status(201).json({
      success: true,
      message: 'Event created successfully.',
      event_id: result.insertId,
      event: {
        event_id: result.insertId,
        event_name,
        description: description || null,
        date_start,
        date_end,
        time_start,
        time_end,
        venue,
        requires_payment: requiresPayment,
        payment_amount: paymentAmount,
        banner_image: null,
        created_by: createdBy,
      },
    });

  } catch (error) {
    console.error('CreateEvent error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to create event.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};