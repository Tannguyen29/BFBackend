const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  otp: String,
  otpExpires: Date,
  verified: { type: Boolean, default: false },
  personalInfo: {
    gender: String,
    age: Number,
    height: Number,
    weight: Number,
    physicalActivityLevel: String,
    fitnessGoal: String,
    healthIssues: String,
    equipment: String,
    dailyExerciseTime: Number,
    bodyParts: [String]
  },
  personalInfoCompleted: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);
module.exports = User;