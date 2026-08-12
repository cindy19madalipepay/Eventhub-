const bcrypt   = require('bcryptjs');
const { pool } = require('../config/db');

// ─── CREATE USER (admin only) ────────────────────────────────────────────────
// Used by Manage Users to create Admin / Department Head / Student accounts directly,
// bypassing the public student-only /auth/register endpoint.
const createUser = async (req, res) => {
  try {
    const { first_name, last_name, email, password, role, department_id, year_level, block } = req.body;

    if (!first_name || !last_name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'First name, last name, email, password, and role are required.' });
    }

    const validRoles = ['student', 'admin', 'department_head'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    const [existing] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email is already registered.' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const [result] = await pool.query(
      `INSERT INTO users
        (first_name, last_name, email, password_hash, role, department_id, year_level, block, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [first_name, last_name, email, password_hash, role, department_id || null, year_level || null, block || null]
    );

    return res.status(201).json({
      success: true,
      message: 'User created successfully.',
      user_id: result.insertId,
    });
  } catch (error) {
    console.error('CreateUser error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET ALL USERS (admin) ───────────────────────────────────────────────────
const getAllUsers = async (req, res) => {
  try {
    const { role, department_id } = req.query;

    let query = `
      SELECT u.user_id, u.first_name, u.last_name, u.email, u.role,
             u.department_id, u.year_level, u.block, u.is_active, u.created_at,
             d.department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.department_id
      WHERE 1=1
    `;
    const params = [];

    if (role)          { query += ' AND u.role = ?';          params.push(role); }
    if (department_id) { query += ' AND u.department_id = ?'; params.push(department_id); }

    query += ' ORDER BY u.created_at DESC';

    const [users] = await pool.query(query, params);

    return res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    console.error('GetAllUsers error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET SINGLE USER (admin) ─────────────────────────────────────────────────
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT user_id, first_name, last_name, email, role, department_id,
              year_level, block, is_active, created_at
       FROM users WHERE user_id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({ success: true, user: rows[0] });
  } catch (error) {
    console.error('GetUserById error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── UPDATE USER (admin) ─────────────────────────────────────────────────────
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, role, department_id, year_level, block } = req.body;

    const [existing] = await pool.query('SELECT user_id FROM users WHERE user_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await pool.query(
      `UPDATE users SET
        first_name = ?, last_name = ?, email = ?, role = ?,
        department_id = ?, year_level = ?, block = ?
       WHERE user_id = ?`,
      [first_name, last_name, email, role, department_id || null, year_level || null, block || null, id]
    );

    return res.status(200).json({ success: true, message: 'User updated successfully.' });
  } catch (error) {
    console.error('UpdateUser error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── UPDATE OWN PROFILE (any authenticated user) ─────────────────────────────
// Distinct from updateUser: this is self-service (name + optional photo),
// scoped to req.user.user_id from the auth token — never an :id param, so a
// user can only ever edit their own account this way.
//
// req.file.path here is the full Cloudinary URL (not a local filename) —
// multer-storage-cloudinary uploads the file directly to Cloudinary and
// gives us back its permanent hosted URL, so that's what we store in the
// profile_picture column now instead of a filename.
const { pool } = require('../config/db');

// Helper: upload buffer to Cloudinary
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

const updateOwnProfile = async (req, res) => {
  try {
    const user_id = req.user?.user_id;
    if (!user_id) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const { first_name, last_name } = req.body;
    const updates = [];
    const values = [];

    if (first_name !== undefined) {
      updates.push('first_name = ?');
      values.push(first_name.trim());
    }
    if (last_name !== undefined) {
      updates.push('last_name = ?');
      values.push(last_name.trim());
    }

    let profile_picture = null;
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, req.file.mimetype, 'eventhub/avatars');
      profile_picture = result.secure_url;
      updates.push('profile_picture = ?');
      values.push(profile_picture);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update.' });
    }

    values.push(user_id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`, values);

    const [rows] = await pool.query(
      'SELECT user_id, first_name, last_name, email, role, profile_picture, department_id FROM users WHERE user_id = ?',
      [user_id]
    );

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: rows[0],
    });
  } catch (error) {
    console.error('UpdateOwnProfile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to update profile.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Export other functions too...
module.exports = {
  updateOwnProfile,
  // ... your other exports
};

    // req.file is populated by the uploadProfilePhoto multer middleware
    // when the request included an "avatar" file field
    if (req.file) {
      await pool.query(
        'UPDATE users SET first_name = ?, last_name = ?, profile_picture = ? WHERE user_id = ?',
        [first_name, last_name, req.file.path, userId]
      );
    } else {
      await pool.query(
        'UPDATE users SET first_name = ?, last_name = ? WHERE user_id = ?',
        [first_name, last_name, userId]
      );
    }

    const [rows] = await pool.query(
      `SELECT user_id, first_name, last_name, email, role, department_id,
              year_level, block, profile_picture
       FROM users WHERE user_id = ?`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: rows[0],
    });
  } catch (error) {
    console.error('UpdateOwnProfile error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── TOGGLE ACTIVE STATUS (admin) ────────────────────────────────────────────
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query('SELECT is_active FROM users WHERE user_id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const newStatus = rows[0].is_active ? 0 : 1;
    await pool.query('UPDATE users SET is_active = ? WHERE user_id = ?', [newStatus, id]);

    return res.status(200).json({
      success: true,
      message: newStatus ? 'User activated.' : 'User deactivated.',
      is_active: !!newStatus,
    });
  } catch (error) {
    console.error('ToggleUserStatus error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── DELETE USER (admin) ─────────────────────────────────────────────────────
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT user_id FROM users WHERE user_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await pool.query('DELETE FROM users WHERE user_id = ?', [id]);

    return res.status(200).json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    console.error('DeleteUser error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET DEPARTMENT STUDENT STATS (admin / department_head) ─────────────────
// Returns student counts grouped by year_level and block for a department.
// Department heads are locked to their own department_id; admins may pass ?department_id=
const getDepartmentStudentStats = async (req, res) => {
  try {
    const department_id = req.user.role === 'admin'
      ? (req.query.department_id || req.user.department_id)
      : req.user.department_id;

    if (!department_id) {
      return res.status(400).json({ success: false, message: 'No department assigned to this account.' });
    }

    const [rows] = await pool.query(
      `SELECT year_level, block, COUNT(*) AS count
       FROM users
       WHERE department_id = ? AND role = 'student'
       GROUP BY year_level, block`,
      [department_id]
    );

    // Build a clean structure: { 1: { total, blocks: { A: 3, B: 2 } }, 2: {...}, ... }
    const byYear = {};
    let totalStudents = 0;

    rows.forEach(({ year_level, block, count }) => {
      const yr = year_level || 'Unspecified';
      if (!byYear[yr]) byYear[yr] = { total: 0, blocks: {} };
      byYear[yr].total += count;
      byYear[yr].blocks[block || 'Unspecified'] = count;
      totalStudents += count;
    });

    return res.status(200).json({
      success: true,
      department_id,
      total_students: totalStudents,
      by_year: byYear,
    });
  } catch (error) {
    console.error('GetDepartmentStudentStats error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  updateOwnProfile,
  toggleUserStatus,
  deleteUser,
  getDepartmentStudentStats,
};