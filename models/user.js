const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { 
    type: String, 
    enum: ['free', 'premium', 'PT', 'admin'], 
    default: 'free' 
  },
  ptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  hasUnreadNotification: {
    type: Boolean,
    default: false
  },
  otp: String,
  otpExpires: Date,
  verified: { type: Boolean, default: false },
  avatarUrl: { type: String, default: '' },
  personalInfo: {
    gender: String,
    age: Number,
    height: Number,
    weight: Number,
    goalWeight: Number,
    physicalActivityLevel: String,
    fitnessGoal: String,
    equipment: String,
    experienceLevel: String,
    bodyParts: [String],
    calorieGoal: Number
  },
  personalInfoCompleted: { type: Boolean, default: false },
  premiumExpireDate: {
    type: Date,
    default: null
  },
  assignedPT: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

const User = mongoose.model('User', userSchema);
module.exports = User;