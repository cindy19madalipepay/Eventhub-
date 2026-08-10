const { pool } = require('../config/db');
const QRCode   = require('qrcode');
const crypto   = require('crypto');

// ─── GET ALL EVENTS ──────────────────────────────────────────────────────────
const getAllEvents = async (req, res) => {
  try {
    let query = `
      SELECT e.*, u.first_name, u.last_name,
             GROUP_CONCAT(d.department_code ORDER BY d.department_code SEPARATOR ', ') AS allowed_departments
      FROM events e
      LEFT JOIN users u ON e.created_by = u.user_id
      LEFT JOIN event_departments ed ON e.event_id = ed.event_id
      LEFT JOIN departments d ON ed.department_id = d.department_id
      WHERE e.status != 'cancelled'
    `;
    const params = [];

    // Students and department heads only see events open to their department
    // (or events with no department restriction)
    if ((req.user.role === 'student' || req.user.role === 'department_head') && req.user.department_id) {
      query += `
        AND (
          e.event_id NOT IN (SELECT event_id FROM event_departments)
          OR e.event_id IN (SELECT event_id FROM event_departments WHERE department_id = ?)
        )
      `;
      params.push(req.user.department_id);
    }

    query += ' GROUP BY e.event_id ORDER BY e.date_start DESC';

    const [events] = await pool.query(query, params);

    return res.status(200).json({ success: true, events });
  } catch (error) {
    console.error('GetAllEvents error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET EVENT BY QR CODE (public, no login required) ───────────────────────
const getEventByCode = async (req, res) => {
  try {
    const { code } = req.params;

    const [events] = await pool.query(
      `SELECT e.event_id, e.event_name, e.description, e.date_start, e.date_end,
              e.time_start, e.time_end, e.venue, e.requires_payment, e.payment_amount,
              e.rules, e.status, e.qr_code_data
       FROM events e
       WHERE e.qr_code_data = ?`,
      [code]
    );

    if (events.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found. This QR code or link may be invalid.' });
    }

    return res.status(200).json({ success: true, event: events[0] });
  } catch (error) {
    console.error('GetEventByCode error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET SINGLE EVENT ────────────────────────────────────────────────────────
const getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    const [events] = await pool.query(
      `SELECT e.*, u.first_name, u.last_name
       FROM events e
       LEFT JOIN users u ON e.created_by = u.user_id
       WHERE e.event_id = ?`,
      [id]
    );

    if (events.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    // Get allowed departments for this event
    const [departments] = await pool.query(
      `SELECT d.department_id, d.department_name, d.department_code
       FROM event_departments ed
       JOIN departments d ON ed.department_id = d.department_id
       WHERE ed.event_id = ?`,
      [id]
    );

    return res.status(200).json({
      success: true,
      event: { ...events[0], departments },
    });
  } catch (error) {
    console.error('GetEventById error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── CREATE EVENT (admin only) ───────────────────────────────────────────────
const createEvent = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      event_name, description, date_start, date_end,
      time_start, time_end, venue, requires_payment,
      payment_amount, rules, department_ids, banner_url
    } = req.body;

    if (!event_name || !date_start || !time_start) {
      return res.status(400).json({ success: false, message: 'Event name, date, and time are required.' });
    }

    // Generate unique QR code data string
    const qr_code_data = crypto.randomBytes(16).toString('hex');

    // Insert event
    const [result] = await connection.query(
      `INSERT INTO events
        (event_name, description, date_start, date_end, time_start, time_end,
         venue, created_by, requires_payment, payment_amount, rules, qr_code_data, status, banner_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event_name, description, date_start, date_end || date_start,
        time_start, time_end, venue, req.user.user_id,
        requires_payment || 0, payment_amount || 0, rules,
        qr_code_data, 'published', banner_url || null
      ]
    );

    const event_id = result.insertId;

    // Link departments that can attend
    if (department_ids && department_ids.length > 0) {
      const deptValues = department_ids.map(dept_id => [event_id, dept_id]);
      await connection.query('INSERT INTO event_departments (event_id, department_id) VALUES ?', [deptValues]);
    }

    // Create a notification so students, alumni, and stakeholders are alerted
    // about the new event. One row per role — keeps read/dismiss status
    // independent per audience, and leaves room to customize wording per role later.
    const notifTitle = event_name;
    const notifMessage = `New event: ${event_name}`;
    const targetRoles = ['student', 'alumni', 'stakeholder'];

    const notifValues = targetRoles.map(role => [
      event_id,
      notifTitle,
      notifMessage,
      role,
      null,
      req.user.user_id,
      'new_event'
    ]);

    await connection.query(
      `INSERT INTO notifications
        (event_id, title, message, target_role, target_dept_id, sent_by, type)
       VALUES ?`,
      [notifValues]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message:    'Event created successfully.',
      event_id,
      qr_code_data,
    });

  } catch (error) {
    await connection.rollback();
    console.error('CreateEvent error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  } finally {
    connection.release();
  }
};

// ─── UPDATE EVENT (admin only) ───────────────────────────────────────────────
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { event_name, description, date_start, date_end, time_start, time_end, venue, requires_payment, payment_amount, rules, status } = req.body;

    await pool.query(
      `UPDATE events SET
        event_name = ?, description = ?, date_start = ?, date_end = ?,
        time_start = ?, time_end = ?, venue = ?, requires_payment = ?,
        payment_amount = ?, rules = ?, status = ?, updated_at = NOW()
       WHERE event_id = ?`,
      [event_name, description, date_start, date_end, time_start, time_end, venue, requires_payment, payment_amount, rules, status, id]
    );

    return res.status(200).json({ success: true, message: 'Event updated successfully.' });
  } catch (error) {
    console.error('UpdateEvent error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET EVENT QR CODE ───────────────────────────────────────────────────────
const getEventQR = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query('SELECT qr_code_data, event_name FROM events WHERE event_id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    // Build the public event URL that the QR code will point to
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
    const eventLink = `${frontendURL}/e/${rows[0].qr_code_data}`;

    // Generate QR code as base64 image — encodes the URL, not raw text.
    // width bumped 300→400 and margin 2→4: a larger source image survives
    // downscaling on the poster better, and a 4-module quiet zone (the
    // standard recommendation) gives phone cameras a proper blank border
    // to lock onto — 2 modules was too thin, especially once the QR sits
    // inside the poster's card background.
    const qrDataURL = await QRCode.toDataURL(eventLink, {
      width:           400,
      margin:          4,
      color: { dark: '#000000', light: '#ffffff' },
    });

    return res.status(200).json({
      success:      true,
      event_name:   rows[0].event_name,
      qr_code_data: rows[0].qr_code_data,
      event_link:   eventLink,
      qr_image:     qrDataURL, // base64 PNG
    });
  } catch (error) {
    console.error('GetEventQR error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── UPLOAD BANNER IMAGE (admin only) ────────────────────────────────────────
// req.file.path here is the full Cloudinary URL (not a local filename) —
// uploadBanner (via multer-storage-cloudinary) uploads directly to
// Cloudinary and gives back its permanent hosted URL, which is what
// MyEvents.jsx / Notifications.jsx now expect in banner_image.
const uploadBannerImage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Banner image is required.' });
    }

    await pool.query(
      'UPDATE events SET banner_image = ?, banner_url = NULL WHERE event_id = ?',
      [req.file.path, id]
    );

    return res.status(200).json({
      success: true,
      message: 'Banner image uploaded.',
      banner_image: req.file.path,
    });
  } catch (error) {
    console.error('UploadBannerImage error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── DELETE / CANCEL EVENT (admin only) ─────────────────────────────────────
const cancelEvent = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("UPDATE events SET status = 'cancelled', updated_at = NOW() WHERE event_id = ?", [id]);

    return res.status(200).json({ success: true, message: 'Event cancelled successfully.' });
  } catch (error) {
    console.error('CancelEvent error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  getAllEvents,
  getEventById,
  getEventByCode,
  createEvent,
  updateEvent,
  getEventQR,
  uploadBannerImage,
  cancelEvent,
};