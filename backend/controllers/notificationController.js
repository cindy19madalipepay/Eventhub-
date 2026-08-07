const { pool } = require('../config/db');

const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const [notifications] = await pool.query(`
      SELECT 
        n.notification_id,
        n.event_id,
        n.title,
        n.message,
        n.type,
        n.sent_at,
        e.event_name,
        e.date_start AS event_date,
        e.time_start AS event_time,
        e.venue,
        e.requires_payment,
        e.payment_amount,
        COALESCE(ns.is_read, 0) AS is_read,
        t.payment_status,
        t.ticket_id,
        CASE 
          WHEN ev.evaluation_id IS NOT NULL THEN TRUE 
          ELSE FALSE 
        END AS evaluated
      FROM notifications n
      LEFT JOIN events e ON n.event_id = e.event_id
      LEFT JOIN notification_status ns ON n.notification_id = ns.notification_id 
        AND ns.user_id = ?
      LEFT JOIN tickets t ON e.event_id = t.event_id AND t.user_id = ?
      LEFT JOIN evaluations ev ON e.event_id = ev.event_id AND ev.user_id = ?
      WHERE (n.target_role = 'all' OR n.target_role = 'student')
        AND COALESCE(ns.is_deleted, 0) = 0
      ORDER BY n.sent_at DESC
    `, [userId, userId, userId]);

    res.json({ notifications });
  } catch (error) {
    console.error('getMyNotifications error:', error);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
};

// ─── MARK NOTIFICATION AS READ ───────────────────────────────────────────────
const markNotificationAsRead = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { id } = req.params;

    // Make sure the notification actually exists first
    const [notifRows] = await pool.query(
      'SELECT notification_id FROM notifications WHERE notification_id = ?',
      [id]
    );
    if (notifRows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Insert a status row for this user if one doesn't exist yet,
    // otherwise mark the existing one as read.
    await pool.query(
      `INSERT INTO notification_status (notification_id, user_id, is_read, read_at)
       VALUES (?, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE is_read = 1, read_at = NOW()`,
      [id, userId]
    );

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('markNotificationAsRead error:', error);
    res.status(500).json({ message: 'Failed to mark notification as read' });
  }
};

// ─── DELETE (DISMISS) NOTIFICATION ───────────────────────────────────────────
const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { id } = req.params;

    const [notifRows] = await pool.query(
      'SELECT notification_id FROM notifications WHERE notification_id = ?',
      [id]
    );
    if (notifRows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Soft-delete: this only hides the notification for this user,
    // it does not remove it from the notifications table.
    await pool.query(
      `INSERT INTO notification_status (notification_id, user_id, is_deleted, deleted_at)
       VALUES (?, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE is_deleted = 1, deleted_at = NOW()`,
      [id, userId]
    );

    res.json({ success: true, message: 'Notification dismissed' });
  } catch (error) {
    console.error('deleteNotification error:', error);
    res.status(500).json({ message: 'Failed to dismiss notification' });
  }
};

module.exports = {
  getMyNotifications,
  markNotificationAsRead,
  deleteNotification,
};