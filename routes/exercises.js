const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const exerciseController = require('../controllers/exerciseController');

// Create a new exercise
router.post('/', upload.single('gifFile'), exerciseController.createExercise);

// Get all exercises
router.get('/', exerciseController.getAllExercises);

// Get a specific exercise
router.get('/:id', exerciseController.getExerciseById);

// Get exercise by name
router.get('/details/:name', exerciseController.getExerciseByName);

// Update an exercise
router.patch('/:id', upload.single('gifFile'), exerciseController.updateExercise);

// Delete an exercise
router.delete('/:id', exerciseController.deleteExercise);

module.exports = router; 