const { pool } = require('../config/db');
const QRCode   = require('qrcode');
const crypto   = require('crypto');

// ─── REGISTER FOR EVENT / GET TICKET ────────────────────────────────────────
const createTicket = async (req, res) => {
  try {
    const { event_id, guest_name, guest_email } = req.body;
    const user_id = req.user?.user_id || null;

    if (!event_id) {
      return res.status(400).json({ success: false, message: 'Event ID is required.' });
    }

    // Check event exists and is published
    const [events] = await pool.query(
      "SELECT * FROM events WHERE event_id = ? AND status IN ('published', 'ongoing')",
      [event_id]
    );
    if (events.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found or not available.' });
    }

    const event = events[0];

    // Check if student already has a ticket for this event
    if (user_id) {
      const [existing] = await pool.query(
        'SELECT ticket_id FROM tickets WHERE user_id = ? AND event_id = ?',
        [user_id, event_id]
      );
      if (existing.length > 0) {
        return res.status(409).json({ success: false, message: 'You already have a ticket for this event.' });
      }
    }

    // Generate unique ticket QR code
    const ticket_code = crypto.randomBytes(20).toString('hex');

    // Determine payment status
    const payment_status = event.requires_payment ? 'pending' : 'not_required';
    const ticket_status  = event.requires_payment ? 'pending' : 'validated';

    const [result] = await pool.query(
      `INSERT INTO tickets
        (user_id, event_id, ticket_code, status, payment_status, guest_name, guest_email)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, event_id, ticket_code, ticket_status, payment_status, guest_name || null, guest_email || null]
    );

    // Generate QR image
    const qr_image = await QRCode.toDataURL(ticket_code, { width: 250, margin: 2 });

    return res.status(201).json({
      success:        true,
      message:        'Ticket created successfully.',
      ticket_id:      result.insertId,
      ticket_code,
      qr_image,
      requires_payment: event.requires_payment,
      payment_amount:   event.payment_amount,
    });

  } catch (error) {
    console.error('CreateTicket error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET MY TICKETS (student) ────────────────────────────────────────────────
const getMyTickets = async (req, res) => {
  try {
    const [tickets] = await pool.query(
      `SELECT t.ticket_id, t.event_id, t.ticket_code, t.status, t.payment_status, t.created_at,
              e.event_name, e.date_start, e.time_start, e.venue, e.requires_payment, e.payment_amount
       FROM tickets t
       JOIN events e ON t.event_id = e.event_id
       WHERE t.user_id = ?
       ORDER BY t.created_at DESC`,
      [req.user.user_id]
    );

    return res.status(200).json({ success: true, tickets });
  } catch (error) {
    console.error('GetMyTickets error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET ALL TICKETS PER EVENT (admin / department_head) ───────────────────
// Department heads only see tickets belonging to students in their own department.
const getTicketsByEvent = async (req, res) => {
  try {
    const { id } = req.params;

    let query = `
      SELECT t.*, u.first_name, u.last_name, u.year_level, u.block,
             d.department_name
      FROM tickets t
      LEFT JOIN users u ON t.user_id = u.user_id
      LEFT JOIN departments d ON u.department_id = d.department_id
      WHERE t.event_id = ?
    `;
    const params = [id];

    if (req.user.role === 'department_head') {
      query += ' AND u.department_id = ?';
      params.push(req.user.department_id);
    }

    query += ' ORDER BY t.created_at DESC';

    const [tickets] = await pool.query(query, params);

    return res.status(200).json({ success: true, count: tickets.length, tickets });
  } catch (error) {
    console.error('GetTicketsByEvent error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── BLOCK TICKET (admin) ────────────────────────────────────────────────────
const blockTicket = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("UPDATE tickets SET status = 'blocked' WHERE ticket_id = ?", [id]);

    return res.status(200).json({ success: true, message: 'Ticket blocked successfully.' });
  } catch (error) {
    console.error('BlockTicket error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { createTicket, getMyTickets, getTicketsByEvent, blockTicket };