const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../config/multer');
const planController = require('../controllers/planController');

// Create a new plan
router.post('/', upload.single('backgroundImage'), planController.createPlan);

// Update a plan
router.patch('/:id', upload.single('backgroundImage'), planController.updatePlan);

// Get all plans
router.get('/', planController.getAllPlans);

// Get plan by id
router.get('/:id', planController.getPlanById);

// Delete a plan
router.delete('/:id', planController.deletePlan);

// Get matching plans for user
router.get('/user/matching', auth, planController.getMatchingPlans);

module.exports = router;
