const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const planProgressController = require('../controllers/planProgressController');

// Start tracking a plan
router.post('/:planId/start', auth, planProgressController.startPlan);

// Get plan progress
router.get('/:planId/progress', auth, planProgressController.getPlanProgress);

// Update plan progress
router.post('/:planId/progress', auth, planProgressController.updateProgress);

// Reset progress timer
router.post('/:planId/reset-timer', auth, planProgressController.resetTimer);

module.exports = router; 