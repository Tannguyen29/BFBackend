const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  otp: String,
  otpExpires: Date,
  verified: { type: Boolean, default: false },
  avatarUrl: { type: String, default: '' },
  personalInfo: {
    gender: String,
    age: Number,
    height: Number,
    weight: Number,
    physicalActivityLevel: String,
    fitnessGoal: String,
    equipment: String,
    experienceLevel: String,
    bodyParts: [String]
  },
  personalInfoCompleted: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);
module.exports = User;