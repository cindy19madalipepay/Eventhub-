const express = require('express');

const router = express.Router();

const attendanceController =
  require('../controllers/attendanceController');

const authMiddleware =
  require('../middleware/authMiddleware');

const roleMiddleware =
  require('../middleware/roleMiddleware');

const {
  uploadAttendance,
} = require('../middleware/uploadMiddleware');


// ============================================================
// ADMIN SCANS STUDENT TICKET QR
// ============================================================

router.post(
  '/scan',
  authMiddleware,
  roleMiddleware('admin'),
  attendanceController.scanAttendance
);


// ============================================================
// STUDENT SELF-SERVICE CHECK-IN
// ============================================================

router.post(
  '/register',
  authMiddleware,
  uploadAttendance.single('photo'),
  attendanceController.registerAttendance
);


// ============================================================
// STUDENT CHECK-OUT
// ============================================================

router.post(
  '/checkout',
  authMiddleware,
  uploadAttendance.single('photo'),
  attendanceController.registerCheckout
);


// ============================================================
// STUDENT: MY ATTENDANCE
// ============================================================

router.get(
  '/my',
  authMiddleware,
  attendanceController.getMyAttendance
);


// ============================================================
// ADMIN / DEPARTMENT HEAD: EVENT ATTENDANCE
// ============================================================

router.get(
  '/event/:id',
  authMiddleware,
  roleMiddleware('admin', 'department_head'),
  attendanceController.getAttendanceByEvent
);


// ============================================================
// ADMIN / DEPARTMENT HEAD: FULL REPORT
// ============================================================

router.get(
  '/report',
  authMiddleware,
  roleMiddleware('admin', 'department_head'),
  attendanceController.getAttendanceReport
);


// ============================================================
// ADMIN / DEPARTMENT HEAD: DEPARTMENTS OVERVIEW
// ============================================================

router.get(
  '/departments-overview',
  authMiddleware,
  roleMiddleware('admin', 'department_head'),
  attendanceController.getDepartmentsOverview
);


// ============================================================
// ADMIN / DEPARTMENT HEAD: DEPARTMENT SUMMARY
// ============================================================

router.get(
  '/department-summary/:deptId',
  authMiddleware,
  roleMiddleware('admin', 'department_head'),
  attendanceController.getDepartmentSummary
);


// ============================================================
// ADMIN / DEPARTMENT HEAD: YEAR + BLOCK STATS
// ============================================================

router.get(
  '/year-block-stats/:deptId',
  authMiddleware,
  roleMiddleware('admin', 'department_head'),
  attendanceController.getYearBlockStats
);


// ============================================================
// ADMIN / DEPARTMENT HEAD: ORGANIZATION BREAKDOWN
// ============================================================

router.get(
  '/org-breakdown/:deptId',
  authMiddleware,
  roleMiddleware('admin', 'department_head'),
  attendanceController.getOrgBreakdown
);


// ============================================================
// ADMIN / DEPARTMENT HEAD: BLOCK REPORT
// ============================================================

router.get(
  '/block-report',
  authMiddleware,
  roleMiddleware('admin', 'department_head'),
  attendanceController.getBlockReport
);


module.exports = router;