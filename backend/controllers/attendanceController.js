const { pool } = require('../config/db');

// ============================================================
// PHILIPPINE LOCAL TIME
// ============================================================
// Your event date_start/time_start values are stored as
// Philippine local time (UTC+8).
//
// This converts the DB server UTC clock to Philippine time.
const PH_NOW = "DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR)";


// ============================================================
// SCAN TICKET QR CODE
// ============================================================
// ADMIN scans the student's ticket QR code.
//
// POST /api/attendance/scan
//
// Body:
// {
//   "qr_code_data": "TICKET-CODE",
//   "method": "qr_scan"
// }
// ============================================================
const scanAttendance = async (req, res) => {
  try {
    const {
      qr_code_data,
      method = 'qr_scan',
    } = req.body;

    if (!qr_code_data) {
      return res.status(400).json({
        success: false,
        message: 'QR code data is required.',
      });
    }

    const [tickets] = await pool.query(
      `
      SELECT
        t.*,
        e.event_name,
        e.date_start,
        e.time_start,
        e.status AS event_status,
        u.first_name,
        u.last_name,
        u.department_id,
        u.year_level,
        u.block
      FROM tickets t
      JOIN events e
        ON t.event_id = e.event_id
      LEFT JOIN users u
        ON t.user_id = u.user_id
      WHERE t.ticket_code = ?
      `,
      [qr_code_data]
    );

    if (tickets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invalid QR code. Ticket not found.',
      });
    }

    const ticket = tickets[0];

    // --------------------------------------------------------
    // Ticket validation
    // --------------------------------------------------------

    if (ticket.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: 'This ticket has been blocked.',
      });
    }

    if (ticket.status === 'used') {
      return res.status(409).json({
        success: false,
        message: 'This ticket has already been used.',
      });
    }

    if (ticket.payment_status === 'pending') {
      return res.status(402).json({
        success: false,
        message: 'Payment not yet validated for this ticket.',
      });
    }

    if (ticket.payment_status === 'rejected') {
      return res.status(402).json({
        success: false,
        message: 'Payment was rejected for this ticket.',
      });
    }

    // --------------------------------------------------------
    // Check event status
    // --------------------------------------------------------

    if (
      ticket.event_status === 'cancelled' ||
      ticket.event_status === 'canceled'
    ) {
      return res.status(410).json({
        success: false,
        message: 'This event has been cancelled.',
      });
    }

    // --------------------------------------------------------
    // Prevent duplicate attendance
    // --------------------------------------------------------

    const [existing] = await pool.query(
      `
      SELECT attendance_id
      FROM attendance
      WHERE ticket_id = ?
        AND event_id = ?
      `,
      [ticket.ticket_id, ticket.event_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Attendance already recorded for this ticket.',
      });
    }

    // --------------------------------------------------------
    // Insert attendance
    // --------------------------------------------------------

    await pool.query(
      `
      INSERT INTO attendance
      (
        ticket_id,
        user_id,
        event_id,
        scanned_at,
        scanned_by,
        method
      )
      VALUES (?, ?, ?, ${PH_NOW}, ?, ?)
      `,
      [
        ticket.ticket_id,
        ticket.user_id,
        ticket.event_id,
        req.user.user_id,
        method,
      ]
    );

    // --------------------------------------------------------
    // Mark ticket as used
    // --------------------------------------------------------

    await pool.query(
      `
      UPDATE tickets
      SET status = 'used'
      WHERE ticket_id = ?
      `,
      [ticket.ticket_id]
    );

    return res.status(200).json({
      success: true,
      message: 'Attendance recorded successfully!',
      attendee: {
        name: `${ticket.first_name || ''} ${ticket.last_name || ''}`.trim(),
        event_id: ticket.event_id,
        event_name: ticket.event_name,
        year_level: ticket.year_level,
        block: ticket.block,
        scanned_at: new Date(),
      },
    });

  } catch (error) {
    console.error('ScanAttendance error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error.',
    });
  }
};


// ============================================================
// SELF-SERVICE STUDENT ATTENDANCE
// ============================================================
// Student uploads photo evidence.
//
// POST /api/attendance/register
//
// multipart/form-data:
// ticket_id
// photo
// ============================================================
const registerAttendance = async (req, res) => {
  try {
    const { ticket_id } = req.body;

    if (!ticket_id) {
      return res.status(400).json({
        success: false,
        message: 'Ticket ID is required.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Photo evidence is required.',
      });
    }

    const [tickets] = await pool.query(
      `
      SELECT
        t.*,
        e.event_name,
        e.date_start,
        e.time_start,
        e.status AS event_status,

        TIMESTAMPDIFF(
          MINUTE,
          TIMESTAMP(e.date_start, e.time_start),
          ${PH_NOW}
        ) AS minutes_since_start

      FROM tickets t

      JOIN events e
        ON t.event_id = e.event_id

      WHERE t.ticket_id = ?
        AND t.user_id = ?
      `,
      [
        ticket_id,
        req.user.user_id,
      ]
    );

    if (tickets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found for your account.',
      });
    }

    const ticket = tickets[0];

    // --------------------------------------------------------
    // Ticket checks
    // --------------------------------------------------------

    if (ticket.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: 'This ticket has been blocked.',
      });
    }

    if (ticket.status === 'used') {
      return res.status(409).json({
        success: false,
        message: 'Attendance has already been registered for this ticket.',
      });
    }

    if (ticket.payment_status === 'pending') {
      return res.status(402).json({
        success: false,
        message: 'Your payment must be validated before you can register attendance.',
      });
    }

    if (ticket.payment_status === 'rejected') {
      return res.status(402).json({
        success: false,
        message: 'Your payment was rejected. Please upload a new receipt first.',
      });
    }

    // --------------------------------------------------------
    // Event status
    // --------------------------------------------------------

    if (
      ticket.event_status === 'cancelled' ||
      ticket.event_status === 'canceled'
    ) {
      return res.status(410).json({
        success: false,
        message: 'This event has been cancelled.',
      });
    }

    // --------------------------------------------------------
    // 30-minute attendance window
    // --------------------------------------------------------

    if (ticket.minutes_since_start < 0) {
      return res.status(403).json({
        success: false,
        message:
          `This event hasn't started yet. Check-in opens at ${ticket.time_start}.`,
      });
    }

    if (ticket.minutes_since_start > 30) {
      return res.status(410).json({
        success: false,
        message:
          'The 30-minute check-in window has closed. This event has been marked as missed.',
      });
    }

    // --------------------------------------------------------
    // Duplicate attendance
    // --------------------------------------------------------

    const [existing] = await pool.query(
      `
      SELECT attendance_id
      FROM attendance
      WHERE ticket_id = ?
        AND event_id = ?
      `,
      [
        ticket.ticket_id,
        ticket.event_id,
      ]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Attendance already recorded for this ticket.',
      });
    }

    // --------------------------------------------------------
    // Save attendance
    // --------------------------------------------------------

    await pool.query(
      `
      INSERT INTO attendance
      (
        ticket_id,
        user_id,
        event_id,
        scanned_at,
        scanned_by,
        method,
        photo
      )
      VALUES (?, ?, ?, ${PH_NOW}, NULL, 'self_upload', ?)
      `,
      [
        ticket.ticket_id,
        req.user.user_id,
        ticket.event_id,
        req.file.filename,
      ]
    );

    // --------------------------------------------------------
    // Mark ticket used
    // --------------------------------------------------------

    await pool.query(
      `
      UPDATE tickets
      SET status = 'used'
      WHERE ticket_id = ?
      `,
      [ticket.ticket_id]
    );

    return res.status(201).json({
      success: true,
      message: 'Attendance registered successfully!',
      event: {
        event_id: ticket.event_id,
        event_name: ticket.event_name,
      },
    });

  } catch (error) {
    console.error('RegisterAttendance error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error.',
    });
  }
};


// ============================================================
// STUDENT CHECKOUT
// ============================================================
// POST /api/attendance/checkout
// ============================================================
const registerCheckout = async (req, res) => {
  try {
    const { event_id } = req.body;

    if (!event_id) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Checkout photo is required.',
      });
    }

    const [rows] = await pool.query(
      `
      SELECT
        attendance_id,
        checkout_at
      FROM attendance
      WHERE user_id = ?
        AND event_id = ?
      `,
      [
        req.user.user_id,
        event_id,
      ]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          'No check-in record found for this event. You must check in before checking out.',
      });
    }

    if (rows[0].checkout_at) {
      return res.status(409).json({
        success: false,
        message: 'You have already checked out of this event.',
      });
    }

    await pool.query(
      `
      UPDATE attendance
      SET
        checkout_at = ${PH_NOW},
        checkout_photo = ?
      WHERE attendance_id = ?
      `,
      [
        req.file.filename,
        rows[0].attendance_id,
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Checked out successfully!',
    });

  } catch (error) {
    console.error('RegisterCheckout error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error.',
    });
  }
};


// ============================================================
// GET ATTENDANCE BY EVENT
// ============================================================
const getAttendanceByEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      department_id,
      year_level,
      block,
    } = req.query;

    let query = `
      SELECT
        a.*,
        u.first_name,
        u.last_name,
        u.year_level,
        u.block,
        d.department_name,
        e.event_name

      FROM attendance a

      JOIN events e
        ON a.event_id = e.event_id

      LEFT JOIN users u
        ON a.user_id = u.user_id

      LEFT JOIN departments d
        ON u.department_id = d.department_id

      WHERE a.event_id = ?
    `;

    const params = [id];

    // Department head only sees their department
    if (req.user.role === 'department_head') {
      query += `
        AND u.department_id = ?
      `;

      params.push(req.user.department_id);

    } else if (department_id) {
      query += `
        AND u.department_id = ?
      `;

      params.push(department_id);
    }

    if (year_level) {
      query += `
        AND u.year_level = ?
      `;

      params.push(year_level);
    }

    if (block) {
      query += `
        AND u.block = ?
      `;

      params.push(block);
    }

    query += `
      ORDER BY a.scanned_at DESC
    `;

    const [attendance] = await pool.query(
      query,
      params
    );

    return res.status(200).json({
      success: true,
      count: attendance.length,
      attendance,
    });

  } catch (error) {
    console.error('GetAttendanceByEvent error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error.',
    });
  }
};


// ============================================================
// GET MY ATTENDANCE
// ============================================================
const getMyAttendance = async (req, res) => {
  try {
    const [attended] = await pool.query(
      `
      SELECT
        a.attendance_id,
        a.scanned_at,
        a.photo,
        a.checkout_at,
        a.checkout_photo,

        e.event_id,
        e.event_name,
        e.date_start,
        e.time_start,
        e.venue

      FROM attendance a

      JOIN events e
        ON a.event_id = e.event_id

      WHERE a.user_id = ?

      ORDER BY a.scanned_at DESC
      `,
      [req.user.user_id]
    );

    const attendedWithPhotoUrl = attended.map((a) => ({
      ...a,

      photo_url: a.photo
        ? `/uploads/attendance/${a.photo}`
        : null,

      checkout_photo_url: a.checkout_photo
        ? `/uploads/attendance/${a.checkout_photo}`
        : null,
    }));

    // --------------------------------------------------------
    // Missed events
    // --------------------------------------------------------

    const [missed] = await pool.query(
      `
      SELECT
        e.event_id,
        e.event_name,
        e.date_start,
        e.time_start,
        e.venue

      FROM tickets t

      JOIN events e
        ON t.event_id = e.event_id

      WHERE t.user_id = ?
        AND t.status != 'used'

        AND TIMESTAMPDIFF(
          MINUTE,
          TIMESTAMP(e.date_start, e.time_start),
          ${PH_NOW}
        ) > 30
      `,
      [req.user.user_id]
    );

    return res.status(200).json({
      success: true,
      attended: attendedWithPhotoUrl,
      missed,
    });

  } catch (error) {
    console.error('GetMyAttendance error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error.',
    });
  }
};


// ============================================================
// FULL ATTENDANCE REPORT
// ============================================================
const getAttendanceReport = async (req, res) => {
  try {
    const {
      event_id,
      department_id,
      year_level,
      block,
    } = req.query;

    let query = `
      SELECT
        a.attendance_id,
        a.scanned_at,
        a.method,
        a.photo,
        a.checkout_at,
        a.checkout_photo,

        u.first_name,
        u.last_name,
        u.year_level,
        u.block,
        u.role,
        u.position,

        d.department_name,

        e.event_name,
        e.date_start

      FROM attendance a

      JOIN events e
        ON a.event_id = e.event_id

      LEFT JOIN users u
        ON a.user_id = u.user_id

      LEFT JOIN departments d
        ON u.department_id = d.department_id

      WHERE 1 = 1
    `;

    const params = [];

    if (event_id) {
      query += `
        AND a.event_id = ?
      `;

      params.push(event_id);
    }

    if (department_id) {
      query += `
        AND u.department_id = ?
      `;

      params.push(department_id);
    }

    if (year_level) {
      query += `
        AND u.year_level = ?
      `;

      params.push(year_level);
    }

    if (block) {
      query += `
        AND u.block = ?
      `;

      params.push(block);
    }

    query += `
      ORDER BY
        e.date_start DESC,
        a.scanned_at DESC
    `;

    const [report] = await pool.query(
      query,
      params
    );

    return res.status(200).json({
      success: true,
      count: report.length,
      report,
    });

  } catch (error) {
    console.error('GetAttendanceReport error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error.',
    });
  }
};


// ============================================================
// DEPARTMENTS OVERVIEW
// ============================================================
const getDepartmentsOverview = async (req, res) => {
  try {
    let query = `
      SELECT
        d.department_id,
        d.department_code,
        d.department_name,

        COUNT(DISTINCT u.user_id) AS student_count,

        COUNT(
          DISTINCT CASE
            WHEN u.role = 'student_leader'
            THEN u.user_id
          END
        ) AS student_leader_count,

        COUNT(DISTINCT t.ticket_id) AS total_invited,

        COUNT(DISTINCT a.attendance_id) AS attended_count,

        COUNT(DISTINCT a.user_id) AS unique_attendees

      FROM departments d

      LEFT JOIN users u
        ON u.department_id = d.department_id
        AND u.role IN (
          'student',
          'student_leader',
          'alumni',
          'stakeholder'
        )

      LEFT JOIN tickets t
        ON t.user_id = u.user_id

      LEFT JOIN attendance a
        ON a.ticket_id = t.ticket_id
    `;

    const params = [];

    if (req.user.role === 'department_head') {
      query += `
        WHERE d.department_id = ?
      `;

      params.push(req.user.department_id);
    }

    query += `
      GROUP BY
        d.department_id,
        d.department_code,
        d.department_name

      ORDER BY d.department_name
    `;

    const [departments] = await pool.query(
      query,
      params
    );

    return res.status(200).json({
      success: true,
      departments,
    });

  } catch (error) {
    console.error('GetDepartmentsOverview error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error.',
    });
  }
};


// ============================================================
// DEPARTMENT EVENT SUMMARY
// ============================================================
const getDepartmentSummary = async (req, res) => {
  try {
    const { deptId } = req.params;

    const [deptRows] = await pool.query(
      `
      SELECT
        department_id,
        department_name
      FROM departments
      WHERE department_code = ?
      `,
      [deptId]
    );

    if (deptRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Department not found.',
      });
    }

    const departmentId =
      deptRows[0].department_id;

    // Department head cannot inspect another department
    if (
      req.user.role === 'department_head' &&
      Number(req.user.department_id) !== Number(departmentId)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized for this department.',
      });
    }

    const [summary] = await pool.query(
      `
      SELECT
        e.event_id,
        e.event_name,

        COUNT(DISTINCT t.ticket_id) AS total_students,

        COUNT(DISTINCT a.attendance_id) AS attended_count

      FROM events e

      JOIN tickets t
        ON t.event_id = e.event_id

      JOIN users u
        ON u.user_id = t.user_id
        AND u.department_id = ?

      LEFT JOIN attendance a
        ON a.ticket_id = t.ticket_id

      GROUP BY
        e.event_id,
        e.event_name

      ORDER BY e.date_start DESC
      `,
      [departmentId]
    );

    return res.status(200).json({
      success: true,
      summary,
    });

  } catch (error) {
    console.error('GetDepartmentSummary error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error.',
    });
  }
};


// ============================================================
// YEAR + BLOCK STATS
// ============================================================
const getYearBlockStats = async (req, res) => {
  try {
    const { deptId } = req.params;

    const [deptRows] = await pool.query(
      `
      SELECT department_id
      FROM departments
      WHERE department_code = ?
      `,
      [deptId]
    );

    if (deptRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Department not found.',
      });
    }

    const departmentId =
      deptRows[0].department_id;

    if (
      req.user.role === 'department_head' &&
      Number(req.user.department_id) !== Number(departmentId)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized for this department.',
      });
    }

    const [rows] = await pool.query(
      `
      SELECT
        u.year_level,
        u.block,

        COUNT(DISTINCT t.ticket_id) AS total,

        COUNT(DISTINCT a.attendance_id) AS attended

      FROM tickets t

      JOIN users u
        ON u.user_id = t.user_id

      LEFT JOIN attendance a
        ON a.ticket_id = t.ticket_id

      WHERE u.department_id = ?

      GROUP BY
        u.year_level,
        u.block
      `,
      [departmentId]
    );

    const stats = {};

    rows.forEach((r) => {
      stats[`${r.year_level}-${r.block}`] = {
        attended: Number(r.attended),
        total: Number(r.total),
      };
    });

    return res.status(200).json({
      success: true,
      stats,
    });

  } catch (error) {
    console.error('GetYearBlockStats error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error.',
    });
  }
};


// ============================================================
// BLOCK-LEVEL EVENT REPORT
// ============================================================
const getBlockReport = async (req, res) => {
  try {
    const {
      department_id,
      year_level,
      block,
    } = req.query;

    if (!department_id || !year_level || !block) {
      return res.status(400).json({
        success: false,
        message:
          'department_id, year_level, and block are required.',
      });
    }

    if (
      req.user.role === 'department_head' &&
      Number(req.user.department_id) !== Number(department_id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized for this department.',
      });
    }

    const [events] = await pool.query(
      `
      SELECT
        e.event_id,
        e.event_name,
        e.date_start,
        e.time_start,
        e.venue,

        COUNT(DISTINCT t.ticket_id) AS total_students

      FROM events e

      JOIN tickets t
        ON t.event_id = e.event_id

      JOIN users u
        ON u.user_id = t.user_id

      WHERE u.department_id = ?
        AND u.year_level = ?
        AND u.block = ?

      GROUP BY
        e.event_id,
        e.event_name,
        e.date_start,
        e.time_start,
        e.venue

      ORDER BY e.date_start DESC
      `,
      [
        department_id,
        year_level,
        block,
      ]
    );

    const [attendance] = await pool.query(
      `
      SELECT
        a.attendance_id,
        a.event_id,
        a.scanned_at,
        a.photo,
        a.method,

        u.first_name,
        u.last_name,
        u.year_level,
        u.block,
        u.role,
        u.position

      FROM attendance a

      JOIN users u
        ON u.user_id = a.user_id

      WHERE u.department_id = ?
        AND u.year_level = ?
        AND u.block = ?

      ORDER BY a.scanned_at DESC
      `,
      [
        department_id,
        year_level,
        block,
      ]
    );

    return res.status(200).json({
      success: true,
      events,
      attendance,
    });

  } catch (error) {
    console.error('GetBlockReport error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error.',
    });
  }
};


// ============================================================
// ORGANIZATION BREAKDOWN
// ============================================================
const getOrgBreakdown = async (req, res) => {
  try {
    const { deptId } = req.params;

    const [deptRows] = await pool.query(
      `
      SELECT department_id
      FROM departments
      WHERE department_code = ?
      `,
      [deptId]
    );

    if (deptRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Department not found.',
      });
    }

    const departmentId =
      deptRows[0].department_id;

    if (
      req.user.role === 'department_head' &&
      Number(req.user.department_id) !== Number(departmentId)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized for this department.',
      });
    }

    const [rows] = await pool.query(
      `
      SELECT
        COALESCE(
          organization,
          'Unspecified'
        ) AS organization,

        COUNT(*) AS count

      FROM users

      WHERE department_id = ?
        AND role = 'student_leader'

      GROUP BY
        COALESCE(
          organization,
          'Unspecified'
        )

      ORDER BY count DESC
      `,
      [departmentId]
    );

    return res.status(200).json({
      success: true,
      organizations: rows,
    });

  } catch (error) {
    console.error('GetOrgBreakdown error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error.',
    });
  }
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  scanAttendance,
  registerAttendance,
  registerCheckout,
  getAttendanceByEvent,
  getMyAttendance,
  getAttendanceReport,
  getDepartmentsOverview,
  getDepartmentSummary,
  getYearBlockStats,
  getBlockReport,
  getOrgBreakdown,
};