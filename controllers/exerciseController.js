const Exercise = require(('../models/Exercise'));
const cloudinary = require('../config/cloudinary');

// Create a new exercise
exports.createExercise = async (req, res) => {
  try {
    let gifUrl = req.body.gifUrl;
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: ''
      });
      gifUrl = result.secure_url;
    }

    const exerciseData = {
      ...req.body,
      gifUrl,
      secondaryMuscles: JSON.parse(req.body.secondaryMuscles || '[]')
    };

    const exercise = new Exercise(exerciseData);
    await exercise.save();
    res.status(201).send(exercise);
  } catch (error) {
    console.error('Error creating exercise:', error);
    res.status(400).send(error);
  }
};

// Get all exercises
exports.getAllExercises = async (req, res) => {
  try {
    const exercises = await Exercise.find({});
    res.send(exercises);
  } catch (error) {
    res.status(500).send();
  }
};

// Get a specific exercise
exports.getExerciseById = async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) {
      return res.status(404).send();
    }
    res.send(exercise);
  } catch (error) {
    res.status(500).send();
  }
};

// Get exercise by name
exports.getExerciseByName = async (req, res) => {
  try {
    const exerciseName = req.params.name.toLowerCase();
    const exercise = await Exercise.findOne({ name: exerciseName });
    if (!exercise) {
      return res.status(404).send('Exercise not found');
    }
    res.json(exercise);
  } catch (error) {
    res.status(500).send('Server error');
  }
};

// Update an exercise
exports.updateExercise = async (req, res) => {
  try {
    let updateData = req.body;
    
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: ''
      });
      updateData.gifUrl = result.secure_url;
    }

    if (updateData.secondaryMuscles) {
      updateData.secondaryMuscles = JSON.parse(updateData.secondaryMuscles);
    }

    const exercise = await Exercise.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    if (!exercise) {
      return res.status(404).send();
    }
    res.send(exercise);
  } catch (error) {
    console.error('Error updating exercise:', error);
    res.status(400).send(error);
  }
};

// Delete an exercise
exports.deleteExercise = async (req, res) => {
  try {
    const exercise = await Exercise.findByIdAndDelete(req.params.id);
    if (!exercise) {
      return res.status(404).send();
    }
    res.send(exercise);
  } catch (error) {
    res.status(500).send();
  }
}; 