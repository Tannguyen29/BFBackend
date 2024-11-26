const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ptPlanProgressController = require('../controllers/ptPlanProgressController');

// Get student progress
router.get('/:planId/progress', auth, ptPlanProgressController.getStudentProgress);

// Update student progress
router.post('/:planId/progress', auth, ptPlanProgressController.updateStudentProgress);

// Start PT plan
router.post('/:planId/start', auth, ptPlanProgressController.startPTPlan);

// Get all students progress (PT only)
router.get('/:planId/students-progress', auth, ptPlanProgressController.getAllStudentsProgress);

module.exports = router; 