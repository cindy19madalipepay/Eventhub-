const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getMyNotifications, markNotificationAsRead, deleteNotification } = require('../controllers/notificationController');

router.get('/my', authMiddleware, getMyNotifications);
router.put('/:id/read', authMiddleware, markNotificationAsRead);
router.delete('/:id', authMiddleware, deleteNotification);

module.exports = router;