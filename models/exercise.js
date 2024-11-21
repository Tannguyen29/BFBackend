const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  bodyPart: { type: String, required: true },
  equipment: { type: String, required: true },
  gifUrl: { type: String, required: true },
  name: { type: String, required: true },
  target: { type: String, required: true },
  secondaryMuscles: [{ type: String }],
  instructions: { type: String },
  difficulty: { type: String, required: true }
});

module.exports = mongoose.model('Exercise', exerciseSchema);