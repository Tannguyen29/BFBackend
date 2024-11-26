const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ptPlanController = require('../controllers/ptPlanController');

// Get pro users
router.get('/pro-users', auth, ptPlanController.getProUsers);

// Create new PT plan
router.post('/', auth, ptPlanController.createPTPlan);

// Get all PT plans
router.get('/', auth, ptPlanController.getAllPTPlans);

// Get specific PT plan
router.get('/:planId', auth, ptPlanController.getPTPlanById);

// Update PT plan
router.put('/:planId', auth, ptPlanController.updatePTPlan);

module.exports = router;
