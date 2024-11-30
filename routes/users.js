const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkPremiumExpiration = require('../middleware/checkPremiumExpiration');
const upload = require('../config/multer');
const userController = require('../controllers/userController');

// Setup personal information
router.post('/personal-information-setup', auth, userController.setupPersonalInfo);

// Get user information
router.get('/info', auth, checkPremiumExpiration, userController.getUserInfo);

// Update user information
router.put('/info', auth, userController.updateUserInfo);

// Upload avatar
router.post('/upload-avatar', auth, upload.single('avatar'), userController.uploadAvatar);

// Get all users (for debugging)
router.get('/', userController.getAllUsers);

// Get all students (for PT to select)
router.get('/students', auth, userController.getStudents);

// Get PT's students
router.get('/pt/students', auth, userController.getPTStudents);

// Get user by ID
router.get('/:id', auth, userController.getUserById);

// Get PT's students with schedules
router.get('/pt/students-with-schedules', auth, userController.getPTStudentsWithSchedules);

module.exports = router;
