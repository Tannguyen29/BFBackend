const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const nutritionController = require('../controllers/nutritionController');

// Save meals
router.post('/meals', auth, nutritionController.saveMeal);

// Get meal by type and date
router.get('/meals/:date/:mealType', auth, nutritionController.getMealByTypeAndDate);

module.exports = router; 