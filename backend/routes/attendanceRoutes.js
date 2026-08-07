const express               = require('express');
const router                = express.Router();
const attendanceController  = require('../controllers/attendanceController');
const authMiddleware        = require('../middleware/authMiddleware');
const roleMiddleware        = require('../middleware/roleMiddleware');
const { uploadAttendance }  = require('../middleware/uploadMiddleware');

router.post('/scan',     authMiddleware, roleMiddleware('admin'), attendanceController.scanAttendance);
router.post('/register', authMiddleware, uploadAttendance.single('photo'), attendanceController.registerAttendance);
router.get('/my',        authMiddleware, attendanceController.getMyAttendance);
router.get('/event/:id', authMiddleware, roleMiddleware('admin', 'department_head'), attendanceController.getAttendanceByEvent);
router.get('/report',    authMiddleware, roleMiddleware('admin', 'department_head'), attendanceController.getAttendanceReport);

// ── Attendance dashboard (admin + department_head) ──────────────
// department_head is scoped to their own department inside each controller
// function — the route itself just needs to admit the role.
router.get('/departments-overview',        authMiddleware, roleMiddleware('admin', 'department_head'), attendanceController.getDepartmentsOverview);
router.get('/department-summary/:deptId',  authMiddleware, roleMiddleware('admin', 'department_head'), attendanceController.getDepartmentSummary);
router.get('/year-block-stats/:deptId',    authMiddleware, roleMiddleware('admin', 'department_head'), attendanceController.getYearBlockStats);
router.get('/org-breakdown/:deptId',       authMiddleware, roleMiddleware('admin', 'department_head'), attendanceController.getOrgBreakdown);
router.get('/block-report',                authMiddleware, roleMiddleware('admin', 'department_head'), attendanceController.getBlockReport);

module.exports = router;