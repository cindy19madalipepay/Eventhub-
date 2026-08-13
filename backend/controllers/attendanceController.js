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

const getDepartmentSummary = async (req, res) => {
  try {
    const { deptId } = req.params;
    const [rows] = await pool.query(`
      SELECT e.event_id, e.event_name, COUNT(a.attendance_id) AS attendance_count
      FROM events e
      LEFT JOIN attendance a ON e.event_id = a.event_id
      LEFT JOIN users u ON a.user_id = u.user_id AND u.department_id = ?
      WHERE e.event_id IN (SELECT event_id FROM event_departments WHERE department_id = ?)
      GROUP BY e.event_id
    `, [deptId, deptId]);
    return res.status(200).json({ success: true, summary: rows });
  } catch (error) {
    console.error('GetDepartmentSummary error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const getYearBlockStats = async (req, res) => {
  try {
    const { deptId } = req.params;
    const [rows] = await pool.query(`
      SELECT u.year_level, u.block,
             COUNT(DISTINCT u.user_id) AS total,
             COUNT(DISTINCT a.user_id) AS attended
      FROM users u
      LEFT JOIN attendance a ON u.user_id = a.user_id
      WHERE u.department_id = ? AND u.role = 'student'
      GROUP BY u.year_level, u.block
      ORDER BY u.year_level, u.block
    `, [deptId]);
    return res.status(200).json({ success: true, stats: rows });
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

const getBlockReport = async (req, res) => {
  try {
    const { event_id, year_level, block } = req.query;
    let query = `
      SELECT a.*, u.first_name, u.last_name, u.year_level, u.block, d.department_name
      FROM attendance a
      JOIN users u ON a.user_id = u.user_id
      LEFT JOIN departments d ON u.department_id = d.department_id
      WHERE u.role = 'student'
    `;
    const params = [];
    if (event_id) { query += ' AND a.event_id = ?'; params.push(event_id); }
    if (year_level) { query += ' AND u.year_level = ?'; params.push(year_level); }
    if (block) { query += ' AND u.block = ?'; params.push(block); }
    if (req.user?.role === 'department_head') {
      query += ' AND u.department_id = ?';
      params.push(req.user.department_id);
    }
    query += ' ORDER BY a.checked_in_at DESC';
    const [rows] = await pool.query(query, params);
    return res.status(200).json({ success: true, report: rows });
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