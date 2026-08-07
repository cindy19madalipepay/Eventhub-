const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const nodemailer= require('nodemailer');
const { pool }  = require('../config/db');
require('dotenv').config();

// ─── Helper: generate JWT token ─────────────────────────────────────────────
const generateToken = (user) => {
  return jwt.sign(
    {
      user_id:       user.user_id,
      email:         user.email,
      role:          user.role,
      department_id: user.department_id,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// ─── REGISTER (public — all roles supported by the frontend) ───────────────
const register = async (req, res) => {
  try {
    const { first_name, last_name, email, password, role, department_id, year_level, block, position, organization } = req.body;

    if (!first_name || !last_name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    // Public self-registration allows all supported roles.
    const allowedRoles = ['student', 'student_leader', 'alumni', 'stakeholder', 'department_head', 'admin'];
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ success: false, message: 'Invalid account type.' });
    }

    // Department is required for everyone except admin and stakeholder
    const rolesNeedingDept = ['student', 'student_leader', 'alumni', 'department_head'];
    if (rolesNeedingDept.includes(role) && !department_id) {
      return res.status(400).json({ success: false, message: 'Department is required.' });
    }

    // Year level & block only required for student and student_leader
    const rolesNeedingYearBlock = ['student', 'student_leader'];
    if (rolesNeedingYearBlock.includes(role) && (!year_level || !block)) {
      return res.status(400).json({ success: false, message: 'Year level and block are required.' });
    }

    // Position/designation and organization only required for student_leader
    if (role === 'student_leader' && !position) {
      return res.status(400).json({ success: false, message: 'Position/designation is required for student leaders.' });
    }
    if (role === 'student_leader' && !organization) {
      return res.status(400).json({ success: false, message: 'Organization is required for student leaders.' });
    }

    // Check if email is already taken
    const [existing] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email is already registered.' });
    }

    // Hash the password
    const password_hash = await bcrypt.hash(password, 12);

    // Insert user into DB
    const [result] = await pool.query(
      `INSERT INTO users 
        (first_name, last_name, email, password_hash, role, department_id, year_level, block, position, organization, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        first_name, last_name, email, password_hash, role,
        rolesNeedingDept.includes(role) ? department_id : null,
        rolesNeedingYearBlock.includes(role) ? year_level : null,
        rolesNeedingYearBlock.includes(role) ? block      : null,
        role === 'student_leader' ? position     : null,
        role === 'student_leader' ? organization  : null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      user_id: result.insertId,
    });

  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

// ─── LOGIN ───────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Email, password, and role are required.' });
    }

    // Find user by email AND role (matches your login page flow).
    // LEFT JOIN departments so we get department_code/department_name too —
    // without this, user.department_code was always undefined on the
    // frontend (only the numeric department_id came through), which is
    // exactly what caused AttendanceReport.jsx to fall back to 'MY DEPT'.
    const [rows] = await pool.query(
      `SELECT u.*, d.department_code, d.department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.department_id
       WHERE u.email = ? AND u.role = ? AND u.is_active = 1`,
      [email, role]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or account type.' });
    }

    const user = rows[0];

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Generate token
    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        user_id:         user.user_id,
        first_name:      user.first_name,
        last_name:       user.last_name,
        email:           user.email,
        role:            user.role,
        department_id:   user.department_id,
        department_code: user.department_code,
        department_name: user.department_name,
        year_level:      user.year_level,
        block:           user.block,
        position:        user.position,
        organization:    user.organization,
      },
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// ─── GET CURRENT USER (me) ───────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.user_id, u.first_name, u.last_name, u.email, u.role, u.department_id,
              d.department_code, d.department_name,
              u.year_level, u.block, u.position, u.organization
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.department_id
       WHERE u.user_id = ?`,
      [req.user.user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({ success: true, user: rows[0] });

  } catch (error) {
    console.error('GetMe error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── FORGOT PASSWORD (sends 6-digit code) ───────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(200).json({ success: true, message: 'If that email exists, a code was sent.' });
    }

    const user = rows[0];

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await pool.query(
      'UPDATE users SET reset_token = ?, reset_token_expires = DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE user_id = ?',
      [code, user.user_id]
    );

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from:    `"EventHub" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: 'EventHub - Password Reset Code',
      html: `
        <h2>Password Reset</h2>
        <p>Your verification code is:</p>
        <h1 style="letter-spacing: 8px;">${code}</h1>
        <p>This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
      `,
    });

    return res.status(200).json({ success: true, message: 'If that email exists, a code was sent.' });

  } catch (error) {
    console.error('ForgotPassword error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── RESET PASSWORD (verify code + set new password) ────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { email, code, new_password } = req.body;

    if (!email || !code || !new_password) {
      return res.status(400).json({ success: false, message: 'Email, code, and new password are required.' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND reset_token = ? AND reset_token_expires > NOW()',
      [email, code]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired code.' });
    }

    const user = rows[0];
    const password_hash = await bcrypt.hash(new_password, 12);

    await pool.query(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE user_id = ?',
      [password_hash, user.user_id]
    );

    return res.status(200).json({ success: true, message: 'Password reset successfully.' });

  } catch (error) {
    console.error('ResetPassword error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { register, login, getMe, forgotPassword, resetPassword };