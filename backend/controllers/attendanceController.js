const { pool } = require('../config/db');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

const uploadToCloudinary = (buffer, mimetype, folder) => {
  return new Promise((resolve, reject) => {
    const cloudinary = require('../config/cloudinary');
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

const getMyAttendance = async (req, res) => {
  try {
    const user_id = req.user?.user_id;
    if (!user_id) return res.status(401).json({ success: false, message: 'Unauthorized.' });

    const [attended] = await pool.query(
      `SELECT 
         a.attendance_id,
         a.ticket_id,
         a.event_id,
         a.checkin_photo AS photo_url,
         a.checked_in_at,
         a.checkout_at,
         e.event_name,
         e.date_start,
         e.time_start,
         e.venue
       FROM attendance a
       JOIN events e ON a.event_id = e.event_id
       WHERE a.user_id = ?
       ORDER BY a.checked_in_at DESC`,
      [user_id]
    );

    // NOTE: this database server's clock runs in UTC (confirmed via
    // SELECT NOW()), but event date_start/time_start are entered assuming
    // Philippine local time (UTC+8). Without adjusting for that, NOW()
    // reads as ~8 hours earlier than it actually is locally, so events
    // that have clearly already started/ended still look "in the future"
    // to this comparison. DATE_ADD(NOW(), INTERVAL 8 HOUR) converts the
    // DB's UTC clock to PH local time before comparing.
    const [missed] = await pool.query(
      `SELECT 
         e.event_id,
         e.event_name,
         e.date_start,
         e.time_start,
         e.venue
       FROM events e
       LEFT JOIN tickets t ON t.event_id = e.event_id AND t.user_id = ?
       LEFT JOIN attendance a ON a.ticket_id = t.ticket_id
       WHERE a.attendance_id IS NULL
         AND TIMESTAMPADD(
               MINUTE, 30,
               CONCAT(e.date_start, ' ', COALESCE(e.time_start, '00:00:00'))
             ) < DATE_ADD(NOW(), INTERVAL 8 HOUR)
       ORDER BY e.date_start DESC`,
      [user_id]
    );

    return res.status(200).json({ success: true, attended, missed });
  } catch (error) {
    console.error('GetMyAttendance error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const registerAttendance = async (req, res) => {
  try {
    const { ticket_id } = req.body;
    const user_id = req.user?.user_id;

    if (!user_id) return res.status(401).json({ success: false, message: 'Unauthorized.' });
    if (!ticket_id) return res.status(400).json({ success: false, message: 'Ticket ID is required.' });
    if (!req.file) return res.status(400).json({ success: false, message: 'Attendance photo is required.' });

    const [tickets] = await pool.query(
      'SELECT * FROM tickets WHERE ticket_id = ? AND (user_id = ? OR ? IS NULL)',
      [ticket_id, user_id, user_id]
    );
    if (tickets.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    const ticket = tickets[0];

    const [existing] = await pool.query(
      'SELECT attendance_id FROM attendance WHERE ticket_id = ? AND checkout_at IS NULL',
      [ticket_id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'You are already checked in.' });
    }

    const result = await uploadToCloudinary(req.file.buffer, req.file.mimetype, 'eventhub/attendance');

    const [insertResult] = await pool.query(
      `INSERT INTO attendance (ticket_id, event_id, user_id, checkin_photo, checked_in_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [ticket_id, ticket.event_id, user_id, result.secure_url]
    );

    await pool.query("UPDATE tickets SET status = 'used' WHERE ticket_id = ?", [ticket_id]);

    return res.status(201).json({
      success: true,
      message: 'Attendance recorded successfully.',
      attendance_id: insertResult.insertId,
      photo_url: result.secure_url,
    });
  } catch (error) {
    console.error('RegisterAttendance error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to record attendance.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const registerCheckout = async (req, res) => {
  try {
    const { event_id } = req.body;
    const user_id = req.user?.user_id;

    if (!user_id) return res.status(401).json({ success: false, message: 'Unauthorized.' });
    if (!event_id) return res.status(400).json({ success: false, message: 'Event ID is required.' });
    if (!req.file) return res.status(400).json({ success: false, message: 'Checkout photo is required.' });

    const [records] = await pool.query(
      `SELECT attendance_id FROM attendance
       WHERE event_id = ? AND user_id = ? AND checkout_at IS NULL
       ORDER BY checked_in_at DESC LIMIT 1`,
      [event_id, user_id]
    );
    if (records.length === 0) {
      return res.status(404).json({ success: false, message: 'No active check-in found for this event.' });
    }

    const result = await uploadToCloudinary(req.file.buffer, req.file.mimetype, 'eventhub/checkout');

    await pool.query(
      `UPDATE attendance SET checkout_photo = ?, checkout_at = NOW() WHERE attendance_id = ?`,
      [result.secure_url, records[0].attendance_id]
    );

    return res.status(200).json({
      success: true,
      message: 'Checked out successfully.',
      photo_url: result.secure_url,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to check out.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const scanAttendance = async (req, res) => {
  try {
    const { ticket_code } = req.body;
    const admin_id = req.user?.user_id;

    if (!ticket_code) return res.status(400).json({ success: false, message: 'Ticket code is required.' });

    const [tickets] = await pool.query(
      `SELECT t.*, e.event_name, e.date_start, e.time_start
       FROM tickets t
       JOIN events e ON t.event_id = e.event_id
       WHERE t.ticket_code = ?`,
      [ticket_code]
    );
    if (tickets.length === 0) {
      return res.status(404).json({ success: false, message: 'Invalid ticket code.' });
    }

    const ticket = tickets[0];
    if (ticket.status === 'blocked') {
      return res.status(403).json({ success: false, message: 'This ticket has been blocked.' });
    }

    const [existing] = await pool.query(
      'SELECT attendance_id FROM attendance WHERE ticket_id = ? AND checkout_at IS NULL',
      [ticket.ticket_id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Already checked in.' });
    }

    await pool.query(
      `INSERT INTO attendance (ticket_id, event_id, user_id, scanned_by, checked_in_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [ticket.ticket_id, ticket.event_id, ticket.user_id, admin_id]
    );
    await pool.query("UPDATE tickets SET status = 'used' WHERE ticket_id = ?", [ticket.ticket_id]);

    return res.status(200).json({ success: true, message: 'Attendance verified successfully.', ticket });
  } catch (error) {
    console.error('ScanAttendance error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const getAttendanceByEvent = async (req, res) => {
  try {
    const { id } = req.params;
    let query = `
      SELECT a.*, u.first_name, u.last_name, u.year_level, u.block, d.department_name
      FROM attendance a
      LEFT JOIN users u ON a.user_id = u.user_id
      LEFT JOIN departments d ON u.department_id = d.department_id
      WHERE a.event_id = ?
    `;
    const params = [id];
    if (req.user?.role === 'department_head') {
      query += ' AND u.department_id = ?';
      params.push(req.user.department_id);
    }
    query += ' ORDER BY a.checked_in_at DESC';
    const [rows] = await pool.query(query, params);
    return res.status(200).json({ success: true, count: rows.length, attendance: rows });
  } catch (error) {
    console.error('GetAttendanceByEvent error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const getAttendanceReport = async (req, res) => {
  try {
    const { event_id, department_id } = req.query;
    let query = `
      SELECT a.*, e.event_name, u.first_name, u.last_name, u.year_level, u.block, d.department_name
      FROM attendance a
      JOIN events e ON a.event_id = e.event_id
      LEFT JOIN users u ON a.user_id = u.user_id
      LEFT JOIN departments d ON u.department_id = d.department_id
      WHERE 1=1
    `;
    const params = [];
    if (event_id) { query += ' AND a.event_id = ?'; params.push(event_id); }
    if (department_id) { query += ' AND u.department_id = ?'; params.push(department_id); }
    if (req.user?.role === 'department_head') {
      query += ' AND u.department_id = ?';
      params.push(req.user.department_id);
    }
    query += ' ORDER BY a.checked_in_at DESC';
    const [rows] = await pool.query(query, params);
    return res.status(200).json({ success: true, report: rows });
  } catch (error) {
    console.error('GetAttendanceReport error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const getDepartmentsOverview = async (req, res) => {
  try {
    // Response key is `departments` (not `overview`) — both
    // AdminDashboard.jsx and AttendanceReport.jsx read data.departments.
    // Fields also match what those two components actually use:
    //   - department_code: matched against the hardcoded BSIT/BSBA/etc
    //     list in AttendanceReport.jsx
    //   - student_count / student_leader_count: shown separately
    //     ("12 students · 3 leaders")
    //   - total_invited: denominator for the engagement % bar — every
    //     student/student_leader in the department is "invited"
    //   - attended_count / unique_attendees: distinct students from this
    //     department with at least one attendance record (same number,
    //     used in two different places in the UI)
    const [rows] = await pool.query(`
      SELECT
        d.department_id,
        d.department_code,
        d.department_name,
        COUNT(DISTINCT CASE WHEN u.role = 'student' THEN u.user_id END) AS student_count,
        COUNT(DISTINCT CASE WHEN u.role = 'student_leader' THEN u.user_id END) AS student_leader_count,
        COUNT(DISTINCT CASE WHEN u.role IN ('student', 'student_leader') THEN u.user_id END) AS total_invited,
        COUNT(DISTINCT a.user_id) AS attended_count,
        COUNT(DISTINCT a.user_id) AS unique_attendees
      FROM departments d
      LEFT JOIN users u
        ON u.department_id = d.department_id
        AND u.role IN ('student', 'student_leader')
      LEFT JOIN attendance a
        ON a.user_id = u.user_id
      GROUP BY d.department_id, d.department_code, d.department_name
    `);
    return res.status(200).json({ success: true, departments: rows });
  } catch (error) {
    console.error('GetDepartmentsOverview error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── FIXED ────────────────────────────────────────────────────────────────
// Previously returned `attendance_count` and never sent `total_students` at
// all, but AttendanceReport.jsx reads `event.attended_count` and
// `event.total_students` for both the progress bar and the "3/12 (25.0%)"
// label — so both always rendered as blank/undefined. total_students is
// now every student + student_leader in the department (matching the
// departments-overview denominator), and attended_count only counts
// attendees who actually belong to this department.
const getDepartmentSummary = async (req, res) => {
  try {
    const { deptId } = req.params;
    const [rows] = await pool.query(
      `SELECT
          e.event_id,
          e.event_name,
          e.date_start,
          (
            SELECT COUNT(DISTINCT u2.user_id)
            FROM users u2
            WHERE u2.department_id = ?
              AND u2.role IN ('student', 'student_leader')
          ) AS total_students,
          COUNT(DISTINCT CASE WHEN u.department_id = ? THEN a.user_id END) AS attended_count
       FROM events e
       JOIN event_departments ed ON ed.event_id = e.event_id AND ed.department_id = ?
       LEFT JOIN attendance a ON a.event_id = e.event_id
       LEFT JOIN users u ON a.user_id = u.user_id
       GROUP BY e.event_id, e.event_name, e.date_start
       ORDER BY e.date_start DESC`,
      [deptId, deptId, deptId]
    );
    return res.status(200).json({ success: true, summary: rows });
  } catch (error) {
    console.error('GetDepartmentSummary error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── FIXED ────────────────────────────────────────────────────────────────
// Previously returned `stats` as a plain array of { year_level, block,
// total, attended } rows, but AttendanceReport.jsx's getBlockStats() reads
// it as a lookup map — yearBlockStats['1-A'] etc. Against an array that
// lookup is always undefined, so every block card showed 0/0 regardless of
// real data. Now returns an object keyed by "year-block". Also now counts
// student_leader alongside student, matching the departments-overview and
// department-summary totals so the numbers agree with each other.
const getYearBlockStats = async (req, res) => {
  try {
    const { deptId } = req.params;
    const [rows] = await pool.query(`
      SELECT u.year_level, u.block,
             COUNT(DISTINCT u.user_id) AS total,
             COUNT(DISTINCT a.user_id) AS attended
      FROM users u
      LEFT JOIN attendance a ON u.user_id = a.user_id
      WHERE u.department_id = ? AND u.role IN ('student', 'student_leader')
      GROUP BY u.year_level, u.block
      ORDER BY u.year_level, u.block
    `, [deptId]);

    const stats = {};
    rows.forEach((row) => {
      stats[`${row.year_level}-${row.block}`] = {
        total: Number(row.total),
        attended: Number(row.attended),
      };
    });

    return res.status(200).json({ success: true, stats });
  } catch (error) {
    console.error('GetYearBlockStats error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const getOrgBreakdown = async (req, res) => {
  try {
    const { deptId } = req.params;
    const [rows] = await pool.query(`
      SELECT u.organization,
             COUNT(DISTINCT u.user_id) AS total,
             COUNT(DISTINCT a.user_id) AS attended
      FROM users u
      LEFT JOIN attendance a ON u.user_id = a.user_id
      WHERE u.department_id = ? AND u.role = 'student'
      GROUP BY u.organization
    `, [deptId]);
    return res.status(200).json({ success: true, breakdown: rows });
  } catch (error) {
    console.error('GetOrgBreakdown error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── FIXED (role count) ─────────────────────────────────────────────────
// total_students now counts student_leader alongside student, matching the
// role set used everywhere else (departments-overview, department-summary,
// year-block-stats) so numbers agree across every view instead of the
// block report undercounting relative to the dashboard.
//
// ── FIXED (checkout_at) ──────────────────────────────────────────────────
// The attendance query only ever selected a.checked_in_at AS scanned_at —
// a.checkout_at was never included, so the frontend's Time Out column had
// nothing to read and always showed "—" even for records that do have a
// checkout timestamp in the database. Now selected alongside scanned_at.
const getBlockReport = async (req, res) => {
  try {
    const { department_id, year_level, block } = req.query;

    if (!department_id || !year_level || !block) {
      return res.status(400).json({ success: false, message: 'department_id, year_level, and block are required.' });
    }

    // Total students in this exact department/year/block — used as the
    // denominator for each event's attendance percentage on the frontend.
    const [totalRows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM users
       WHERE department_id = ? AND year_level = ? AND block = ? AND role IN ('student', 'student_leader')`,
      [department_id, year_level, block]
    );
    const total_students = totalRows[0]?.total || 0;

    // Every event assigned to this department — each one becomes its own
    // card in the block report view.
    const [events] = await pool.query(
      `SELECT e.event_id, e.event_name, e.date_start, e.time_start, e.venue
       FROM events e
       JOIN event_departments ed ON ed.event_id = e.event_id
       WHERE ed.department_id = ?
       ORDER BY e.date_start DESC`,
      [department_id]
    );
    const eventsWithTotal = events.map((e) => ({ ...e, total_students }));

    // Attendance records for students in this exact year/block — includes
    // checkin_photo so the "View Photo" button has something to show, and
    // aliases checked_in_at as scanned_at to match what the frontend reads.
    // checkout_at is selected as-is (real column name) for the Time Out
    // column on the frontend.
    let attQuery = `
      SELECT
        a.attendance_id, a.event_id, a.checkin_photo,
        a.checkout_photo,
        a.checked_in_at AS scanned_at,
        a.checkout_at,
        u.first_name, u.last_name, u.year_level, u.block, u.role, u.position
      FROM attendance a
      JOIN users u ON a.user_id = u.user_id
      WHERE u.department_id = ? AND u.year_level = ? AND u.block = ?
    `;
    const params = [department_id, year_level, block];

    if (req.user?.role === 'department_head') {
      attQuery += ' AND u.department_id = ?';
      params.push(req.user.department_id);
    }
    attQuery += ' ORDER BY a.checked_in_at DESC';

    const [attendance] = await pool.query(attQuery, params);

    return res.status(200).json({ success: true, events: eventsWithTotal, attendance });
  } catch (error) {
    console.error('GetBlockReport error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  upload,
  getMyAttendance,
  registerAttendance,
  registerCheckout,
  scanAttendance,
  getAttendanceByEvent,
  getAttendanceReport,
  getDepartmentsOverview,
  getDepartmentSummary,
  getYearBlockStats,
  getOrgBreakdown,
  getBlockReport,
};