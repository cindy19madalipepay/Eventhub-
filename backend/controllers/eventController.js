const { pool } = require('../config/db');
const QRCode = require('qrcode');

// ============================================================
// CREATE EVENT
// ============================================================
const createEvent = async (req, res) => {
  try {
    const {
      event_name,
      description,
      date_start,
      time_start,
      date_end,
      time_end,
      venue,
      capacity,
      status,
    } = req.body;

    if (
      !event_name ||
      !date_start ||
      !time_start ||
      !venue
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Event name, start date, start time, and venue are required.',
      });
    }

    const qr_code_data =
      `EVENT-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase()}`;

    const [result] = await pool.query(
      `INSERT INTO events
        (
          event_name,
          description,
          date_start,
          time_start,
          date_end,
          time_end,
          venue,
          capacity,
          status,
          qr_code_data
        )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event_name,
        description || null,
        date_start,
        time_start,
        date_end || null,
        time_end || null,
        venue,
        capacity || null,
        status || 'upcoming',
        qr_code_data,
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Event created successfully.',
      event_id: result.insertId,
      qr_code_data,
    });
  } catch (error) {
    console.error('CreateEvent error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// GET ALL EVENTS
// ============================================================
const getEvents = async (req, res) => {
  try {
    const [events] = await pool.query(
      `SELECT *
       FROM events
       ORDER BY date_start DESC, time_start DESC`
    );

    return res.status(200).json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    console.error('GetEvents error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error.',
    });
  }
};

// ============================================================
// GET EVENT BY ID
// ============================================================
const getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required.',
      });
    }

    const [rows] = await pool.query(
      `SELECT *
       FROM events
       WHERE event_id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
      });
    }

    return res.status(200).json({
      success: true,
      event: rows[0],
    });
  } catch (error) {
    console.error('GetEventById error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error.',
    });
  }
};

// ============================================================
// UPDATE EVENT
// ============================================================
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      event_name,
      description,
      date_start,
      time_start,
      date_end,
      time_end,
      venue,
      capacity,
      status,
    } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required.',
      });
    }

    const [existing] = await pool.query(
      `SELECT event_id
       FROM events
       WHERE event_id = ?`,
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
      });
    }

    await pool.query(
      `UPDATE events
       SET
         event_name = COALESCE(?, event_name),
         description = COALESCE(?, description),
         date_start = COALESCE(?, date_start),
         time_start = COALESCE(?, time_start),
         date_end = COALESCE(?, date_end),
         time_end = COALESCE(?, time_end),
         venue = COALESCE(?, venue),
         capacity = COALESCE(?, capacity),
         status = COALESCE(?, status)
       WHERE event_id = ?`,
      [
        event_name ?? null,
        description ?? null,
        date_start ?? null,
        time_start ?? null,
        date_end ?? null,
        time_end ?? null,
        venue ?? null,
        capacity ?? null,
        status ?? null,
        id,
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Event updated successfully.',
    });
  } catch (error) {
    console.error('UpdateEvent error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error.',
    });
  }
};

// ============================================================
// DELETE EVENT
// ============================================================
const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required.',
      });
    }

    const [existing] = await pool.query(
      `SELECT event_id
       FROM events
       WHERE event_id = ?`,
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
      });
    }

    await pool.query(
      `DELETE FROM events
       WHERE event_id = ?`,
      [id]
    );

    return res.status(200).json({
      success: true,
      message: 'Event deleted successfully.',
    });
  } catch (error) {
    console.error('DeleteEvent error:', error);

    return res.status(500).json({
      success: false,
      message:
        'Unable to delete event. It may already have related records.',
    });
  }
};

// ============================================================
// GET EVENT QR CODE
// ============================================================
const getEventQR = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required.',
      });
    }

    const [rows] = await pool.query(
      `SELECT
          event_id,
          event_name,
          qr_code_data
       FROM events
       WHERE event_id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
      });
    }

    const frontendURL =
      process.env.FRONTEND_URL ||
      'http://localhost:5173';

    const eventLink =
      `${frontendURL.replace(/\/$/, '')}/checkin/${rows[0].event_id}`;

    const qrDataURL =
      await QRCode.toDataURL(eventLink, {
        width: 400,
        margin: 4,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });

    return res.status(200).json({
      success: true,
      event_id: rows[0].event_id,
      event_name: rows[0].event_name,
      qr_code_data: rows[0].qr_code_data,
      event_link: eventLink,
      qr_image: qrDataURL,
    });
  } catch (error) {
    console.error('GetEventQR error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error.',
    });
  }
};

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getEventQR,
};