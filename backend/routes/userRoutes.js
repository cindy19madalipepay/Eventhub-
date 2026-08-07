const express            = require('express');
const router             = express.Router();
const userController     = require('../controllers/userController');
const authMiddleware     = require('../middleware/authMiddleware');
const roleMiddleware     = require('../middleware/roleMiddleware');
const uploadProfilePhoto = require('../middleware/uploadProfilePhoto');

// NOTE: both of these must come before '/:id' or Express will treat
// 'department-stats' / 'profile' as an :id param
router.get('/department-stats', authMiddleware, roleMiddleware('admin', 'department_head'), userController.getDepartmentStudentStats);

// Self-service: any authenticated user editing their own name/photo.
// No roleMiddleware — scoped internally to req.user.user_id, not an :id param.
router.put('/profile', authMiddleware, uploadProfilePhoto.single('avatar'), userController.updateOwnProfile);

router.post('/',          authMiddleware, roleMiddleware('admin'), userController.createUser);
router.get('/',           authMiddleware, roleMiddleware('admin'), userController.getAllUsers);
router.get('/:id',        authMiddleware, roleMiddleware('admin'), userController.getUserById);
router.put('/:id',        authMiddleware, roleMiddleware('admin'), userController.updateUser);
router.put('/:id/status', authMiddleware, roleMiddleware('admin'), userController.toggleUserStatus);
router.delete('/:id',     authMiddleware, roleMiddleware('admin'), userController.deleteUser);

module.exports = router;