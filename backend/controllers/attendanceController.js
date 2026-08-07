const { pool } = require('../config/db');

// ─── SCAN QR CODE → LOG ATTENDANCE (admin) ──────────────────────────────────
const scanAttendance = async (req, res) => {
  try {
    const { qr_code_data, method = 'qr_scan' } = req.body;

    if (!qr_code_data) {
      return res.status(400).json({ success: false, message: 'QR code data is required.' });
    }

    // 1. Find the ticket by QR code
    const [tickets] = await pool.query(
      `SELECT t.*, e.event_name, e.date_start, e.status AS event_status,
              u.first_name, u.last_name, u.department_id, u.year_level, u.block
       FROM tickets t
       JOIN events e ON t.event_id = e.event_id
       LEFT JOIN users u ON t.user_id = u.user_id
       WHERE t.ticket_code = ?`,
      [qr_code_data]
    );

    if (tickets.length === 0) {
      return res.status(404).json({ success: false, message: 'Invalid QR code. Ticket not found.' });
    }

    const ticket = tickets[0];

    // 2. Validate ticket status
    if (ticket.status === 'blocked') {
      return res.status(403).json({ success: false, message: 'This ticket has been blocked.' });
    }
    if (ticket.status === 'used') {
      return res.status(409).json({ success: false, message: 'This ticket has already been used.' });
    }
    if (ticket.payment_status === 'pending') {
      return res.status(402).json({ success: false, message: 'Payment not yet validated for this ticket.' });
    }

    // 3. Check if already scanned for this event
    const [existing] = await pool.query(
      'SELECT attendance_id FROM attendance WHERE ticket_id = ? AND event_id = ?',
      [ticket.ticket_id, ticket.event_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Attendance already recorded for this ticket.' });
    }

    // 4. Log attendance
    await pool.query(
      `INSERT INTO attendance (ticket_id, user_id, event_id, scanned_at, scanned_by, method)
       VALUES (?, ?, ?, NOW(), ?, ?)`,
      [ticket.ticket_id, ticket.user_id, ticket.event_id, req.user.user_id, method]
    );

    // 5. Mark ticket as used
    await pool.query("UPDATE tickets SET status = 'used' WHERE ticket_id = ?", [ticket.ticket_id]);

    return res.status(200).json({
      success: true,
      message: 'Attendance recorded successfully! ✅',
      attendee: {
        name:        `${ticket.first_name} ${ticket.last_name}`,
        event_name:  ticket.event_name,
        year_level:  ticket.year_level,
        block:       ticket.block,
        scanned_at:  new Date(),
      },
    });

  } catch (error) {
    console.error('ScanAttendance error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── SELF-SERVICE ATTENDANCE REGISTRATION (student, photo-based) ────────────
const registerAttendance = async (req, res) => {
  try {
    const { ticket_id } = req.body;

    if (!ticket_id) {
      return res.status(400).json({ success: false, message: 'Ticket ID is required.' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Photo evidence is required.' });
    }

    // 1. Find the ticket and confirm it belongs to this student
    const [tickets] = await pool.query(
      `SELECT t.*, e.event_name, e.date_start, e.status AS event_status
       FROM tickets t
       JOIN events e ON t.event_id = e.event_id
       WHERE t.ticket_id = ? AND t.user_id = ?`,
      [ticket_id, req.user.user_id]
    );

    if (tickets.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found for your account.' });
    }

    const ticket = tickets[0];

    // 2. Validate ticket status
    if (ticket.status === 'blocked') {
      return res.status(403).json({ success: false, message: 'This ticket has been blocked.' });
    }
    if (ticket.status === 'used') {
      return res.status(409).json({ success: false, message: 'Attendance has already been registered for this ticket.' });
    }
    if (ticket.payment_status === 'pending') {
      return res.status(402).json({ success: false, message: 'Your payment must be validated before you can register attendance.' });
    }
    if (ticket.payment_status === 'rejected') {
      return res.status(402).json({ success: false, message: 'Your payment was rejected. Please upload a new receipt first.' });
    }

    // 3. Check if already recorded (safety net alongside ticket.status check)
    const [existing] = await pool.query(
      'SELECT attendance_id FROM attendance WHERE ticket_id = ? AND event_id = ?',
      [ticket.ticket_id, ticket.event_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Attendance already recorded for this ticket.' });
    }

    // 4. Log attendance with photo, self-reported (scanned_by is null)
    await pool.query(
      `INSERT INTO attendance (ticket_id, user_id, event_id, scanned_at, scanned_by, method, photo)
       VALUES (?, ?, ?, NOW(), NULL, 'self_upload', ?)`,
      [ticket.ticket_id, req.user.user_id, ticket.event_id, req.file.filename]
    );

    // 5. Mark ticket as used
    await pool.query("UPDATE tickets SET status = 'used' WHERE ticket_id = ?", [ticket.ticket_id]);

    return res.status(201).json({
      success: true,
      message: 'Attendance registered successfully! ✅',
    });

  } catch (error) {
    console.error('RegisterAttendance error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET ATTENDANCE BY EVENT (admin/dept head) ───────────────────────────────
const getAttendanceByEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { department_id, year_level, block } = req.query;

    let query = `
      SELECT a.*, u.first_name, u.last_name, u.year_level, u.block,
             d.department_name, e.event_name
      FROM attendance a
      JOIN events e ON a.event_id = e.event_id
      LEFT JOIN users u ON a.user_id = u.user_id
      LEFT JOIN departments d ON u.department_id = d.department_id
      WHERE a.event_id = ?
    `;
    const params = [id];

    // Department head can only see their own department
    if (req.user.role === 'department_head') {
      query += ' AND u.department_id = ?';
      params.push(req.user.department_id);
    } else if (department_id) {
      query += ' AND u.department_id = ?';
      params.push(department_id);
    }

    if (year_level) { query += ' AND u.year_level = ?'; params.push(year_level); }
    if (block)       { query += ' AND u.block = ?';      params.push(block); }

    query += ' ORDER BY a.scanned_at DESC';

    const [attendance] = await pool.query(query, params);

    return res.status(200).json({ success: true, count: attendance.length, attendance });
  } catch (error) {
    console.error('GetAttendanceByEvent error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET MY ATTENDANCE (student) ─────────────────────────────────────────────
const getMyAttendance = async (req, res) => {
  try {
    const [attended] = await pool.query(
      `SELECT a.attendance_id, a.scanned_at, a.photo, e.event_name, e.date_start, e.venue
       FROM attendance a
       JOIN events e ON a.event_id = e.event_id
       WHERE a.user_id = ?
       ORDER BY a.scanned_at DESC`,
      [req.user.user_id]
    );

    // Build a full URL for the photo, same pattern as payment_proof
    const attendedWithPhotoUrl = attended.map((a) => ({
      ...a,
      photo_url: a.photo ? `/uploads/attendance/${a.photo}` : null,
    }));

    // Events the student registered for but didn't attend
    const [missed] = await pool.query(
      `SELECT e.event_name, e.date_start, e.venue
       FROM tickets t
       JOIN events e ON t.event_id = e.event_id
       WHERE t.user_id = ?
         AND t.status != 'used'
         AND e.status = 'completed'`,
      [req.user.user_id]
    );

    return res.status(200).json({ success: true, attended: attendedWithPhotoUrl, missed });
  } catch (error) {
    console.error('GetMyAttendance error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── FULL REPORT (admin) ─────────────────────────────────────────────────────
const getAttendanceReport = async (req, res) => {
  try {
    const { event_id, department_id, year_level, block } = req.query;

    let query = `
      SELECT a.attendance_id, a.scanned_at, a.method, a.photo,
             u.first_name, u.last_name, u.year_level, u.block,
             u.role, u.position,
             d.department_name, e.event_name, e.date_start
      FROM attendance a
      JOIN events e ON a.event_id = e.event_id
      LEFT JOIN users u ON a.user_id = u.user_id
      LEFT JOIN departments d ON u.department_id = d.department_id
      WHERE 1=1
    `;
    const params = [];

    if (event_id)     { query += ' AND a.event_id = ?';      params.push(event_id); }
    if (department_id){ query += ' AND u.department_id = ?'; params.push(department_id); }
    if (year_level)   { query += ' AND u.year_level = ?';    params.push(year_level); }
    if (block)        { query += ' AND u.block = ?';         params.push(block); }

    query += ' ORDER BY e.date_start DESC, a.scanned_at DESC';

    const [report] = await pool.query(query, params);

    return res.status(200).json({ success: true, count: report.length, report });
  } catch (error) {
    console.error('GetAttendanceReport error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── DEPARTMENTS OVERVIEW (admin) ────────────────────────────────────────────
const getDepartmentsOverview = async (req, res) => {
  try {
    let query = `
      SELECT d.department_id, d.department_code, d.department_name,
             COUNT(DISTINCT u.user_id) AS student_count,
             COUNT(DISTINCT CASE WHEN u.role = 'student_leader' THEN u.user_id END) AS student_leader_count,
             COUNT(DISTINCT t.ticket_id) AS total_invited,
             COUNT(DISTINCT a.attendance_id) AS attended_count,
             COUNT(DISTINCT a.user_id) AS unique_attendees
      FROM departments d
      LEFT JOIN users u
        ON u.department_id = d.department_id
       AND u.role IN ('student', 'student_leader', 'alumni', 'stakeholder')
      LEFT JOIN tickets t ON t.user_id = u.user_id
      LEFT JOIN attendance a ON a.ticket_id = t.ticket_id
    `;
    const params = [];

    // Department heads only see their own department (used by AdminDashboard
    // when reused at /dept/dashboard, and by AttendanceReport's picker step).
    if (req.user.role === 'department_head') {
      query += ' WHERE d.department_id = ?';
      params.push(req.user.department_id);
    }

    query += `
      GROUP BY d.department_id, d.department_code, d.department_name
      ORDER BY d.department_name
    `;

    const [departments] = await pool.query(query, params);

    return res.status(200).json({ success: true, departments });
  } catch (error) {
    console.error('GetDepartmentsOverview error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── DEPARTMENT EVENT SUMMARY (admin) ────────────────────────────────────────
const getDepartmentSummary = async (req, res) => {
  try {
    const { deptId } = req.params;

    const [deptRows] = await pool.query(
      'SELECT department_id, department_name FROM departments WHERE department_code = ?',
      [deptId]
    );
    if (deptRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }
    const departmentId = deptRows[0].department_id;

    const [summary] = await pool.query(
      `SELECT e.event_id, e.event_name,
              COUNT(DISTINCT t.ticket_id) AS total_students,
              COUNT(DISTINCT a.attendance_id) AS attended_count
       FROM events e
       JOIN tickets t ON t.event_id = e.event_id
       JOIN users u ON u.user_id = t.user_id AND u.department_id = ?
       LEFT JOIN attendance a ON a.ticket_id = t.ticket_id
       GROUP BY e.event_id, e.event_name
       ORDER BY e.date_start DESC`,
      [departmentId]
    );

    return res.status(200).json({ success: true, summary });
  } catch (error) {
    console.error('GetDepartmentSummary error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── YEAR + BLOCK ATTENDANCE STATS (admin) ───────────────────────────────────
const getYearBlockStats = async (req, res) => {
  try {
    const { deptId } = req.params;

    const [deptRows] = await pool.query(
      'SELECT department_id FROM departments WHERE department_code = ?',
      [deptId]
    );
    if (deptRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }
    const departmentId = deptRows[0].department_id;

    const [rows] = await pool.query(
      `SELECT u.year_level, u.block,
              COUNT(DISTINCT t.ticket_id) AS total,
              COUNT(DISTINCT a.attendance_id) AS attended
       FROM tickets t
       JOIN users u ON u.user_id = t.user_id
       LEFT JOIN attendance a ON a.ticket_id = t.ticket_id
       WHERE u.department_id = ?
       GROUP BY u.year_level, u.block`,
      [departmentId]
    );

    const stats = {};
    rows.forEach((r) => {
      stats[`${r.year_level}-${r.block}`] = { attended: r.attended, total: r.total };
    });

    return res.status(200).json({ success: true, stats });
  } catch (error) {
    console.error('GetYearBlockStats error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── BLOCK-LEVEL EVENT REPORT (admin) ────────────────────────────────────────
// Powers the "BSIT 3rd Year Block 1" screen: one card per event, each with
// its own attended/total count, progress bar, and list of attendees
// (with photo proof where available).
// GET /attendance/block-report?department_id=&year_level=&block=
const getBlockReport = async (req, res) => {
  try {
    const { department_id, year_level, block } = req.query;

    if (!department_id || !year_level || !block) {
      return res.status(400).json({
        success: false,
        message: 'department_id, year_level, and block are required.',
      });
    }

    // Every event this exact year/block was invited to, with total ticket count
    const [events] = await pool.query(
      `SELECT e.event_id, e.event_name, e.date_start, e.time_start, e.venue,
              COUNT(DISTINCT t.ticket_id) AS total_students
       FROM events e
       JOIN tickets t ON t.event_id = e.event_id
       JOIN users u ON u.user_id = t.user_id
       WHERE u.department_id = ? AND u.year_level = ? AND u.block = ?
       GROUP BY e.event_id, e.event_name, e.date_start, e.time_start, e.venue
       ORDER BY e.date_start DESC`,
      [department_id, year_level, block]
    );

    // Actual attendees for this exact year/block, across those events.
    // Added u.role and u.position so the frontend can show a
    // "Student Leader" badge (with their position/designation) next to
    // attendees who hold that role, instead of everyone looking like a
    // plain student.
    const [attendance] = await pool.query(
      `SELECT a.attendance_id, a.event_id, a.scanned_at, a.photo, a.method,
              u.first_name, u.last_name, u.year_level, u.block,
              u.role, u.position
       FROM attendance a
       JOIN users u ON u.user_id = a.user_id
       WHERE u.department_id = ? AND u.year_level = ? AND u.block = ?
       ORDER BY a.scanned_at DESC`,
      [department_id, year_level, block]
    );

    return res.status(200).json({ success: true, events, attendance });
  } catch (error) {
    console.error('GetBlockReport error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── STUDENT LEADER ORG BREAKDOWN WITHIN A DEPARTMENT (admin/dept head) ──────
// Powers a small "Student Leaders by Organization" card on the year-blocks
// screen — counts student_leader accounts in this department grouped by
// their organization (SSC / CSC / a specific org name).
// GET /attendance/org-breakdown/:deptId
const getOrgBreakdown = async (req, res) => {
  try {
    const { deptId } = req.params;

    const [deptRows] = await pool.query(
      'SELECT department_id FROM departments WHERE department_code = ?',
      [deptId]
    );
    if (deptRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }
    const departmentId = deptRows[0].department_id;

    // Department heads can only pull their own department's breakdown
    if (req.user.role === 'department_head' && req.user.department_id !== departmentId) {
      return res.status(403).json({ success: false, message: 'Not authorized for this department.' });
    }

    const [rows] = await pool.query(
      `SELECT COALESCE(organization, 'Unspecified') AS organization,
              COUNT(*) AS count
       FROM users
       WHERE department_id = ? AND role = 'student_leader'
       GROUP BY COALESCE(organization, 'Unspecified')
       ORDER BY count DESC`,
      [departmentId]
    );

    return res.status(200).json({ success: true, organizations: rows });
  } catch (error) {
    console.error('GetOrgBreakdown error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  scanAttendance,
  registerAttendance,
  getAttendanceByEvent,
  getMyAttendance,
  getAttendanceReport,
  getDepartmentsOverview,
  getDepartmentSummary,
  getYearBlockStats,
  getBlockReport,
  getOrgBreakdown,
};