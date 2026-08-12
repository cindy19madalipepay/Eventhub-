const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Use the controller's own upload (memoryStorage) — works on Vercel
const upload = attendanceController.upload;

// ─── ADMIN - SCAN QR CODE ──────────────────────────────────
router.post('/scan', authMiddleware, roleMiddleware('admin'), attendanceController.scanAttendance);

// ─── STUDENT - SELF CHECK-IN ───────────────────────────────
router.post('/register', authMiddleware, upload.single('photo'), attendanceController.registerAttendance);

// ─── STUDENT - CHECKOUT ────────────────────────────────────
router.post('/checkout', authMiddleware, upload.single('photo'), attendanceController.registerCheckout);

// ─── STUDENT - GET MY ATTENDANCE ───────────────────────────
router.get('/my', authMiddleware, attendanceController.getMyAttendance);

// ─── ADMIN / DEPARTMENT HEAD - GET BY EVENT ────────────────
router.get('/event/:id', authMiddleware, roleMiddleware('admin', 'department_head'), attendanceController.getAttendanceByEvent);

// ─── ADMIN / DEPARTMENT HEAD - REPORTS ─────────────────────
router.get('/report', authMiddleware, roleMiddleware('admin', 'department_head'), attendanceController.getAttendanceReport);
router.get('/departments-overview', authMiddleware, roleMiddleware('admin', 'department_head'), attendanceController.getDepartmentsOverview);
router.get('/department-summary/:deptId', authMiddleware, roleMiddleware('admin', 'department_head'), attendanceController.getDepartmentSummary);
router.get('/year-block-stats/:deptId', authMiddleware, roleMiddleware('admin', 'department_head'), attendanceController.getYearBlockStats);
router.get('/org-breakdown/:deptId', authMiddleware, roleMiddleware('admin', 'department_head'), attendanceController.getOrgBreakdown);
router.get('/block-report', authMiddleware, roleMiddleware('admin', 'department_head'), attendanceController.getBlockReport);

module.exports = router;