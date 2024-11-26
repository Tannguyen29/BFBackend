const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const studentPtPlanController = require('../controllers/studentPtPlanController');

// Get all PT plans for student
router.get('/', auth, studentPtPlanController.getStudentPTPlans);

// Get specific PT plan details
router.get('/:planId', auth, studentPtPlanController.getStudentPTPlanById);

module.exports = router; 