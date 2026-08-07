const express               = require('express');
const router                = express.Router();
const evaluationController  = require('../controllers/evaluationController');
const authMiddleware        = require('../middleware/authMiddleware');
const roleMiddleware        = require('../middleware/roleMiddleware');

const selfRoles = ['student', 'student_leader', 'alumni', 'stakeholder'];

router.post('/',         authMiddleware, roleMiddleware(...selfRoles), evaluationController.submitEvaluation);
router.get('/event/:id', authMiddleware, roleMiddleware('admin', 'department_head'), evaluationController.getEvaluationsByEvent);
router.get('/my',        authMiddleware, roleMiddleware(...selfRoles), evaluationController.getMyEvaluations);

module.exports = router;