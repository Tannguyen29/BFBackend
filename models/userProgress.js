const mongoose = require('mongoose');

const UserProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },
  completedWorkouts: [{
    weekNumber: Number,
    dayNumber: Number,
    completedDate: Date
  }],
  currentDay: {
    type: Number,
    default: 1
  },
  lastUnlockTime: Date,
  startDate: {
    type: Date,
    default: Date.now
  }
});

// Tạo compound index để đảm bảo mỗi user chỉ có một progress cho mỗi plan
UserProgressSchema.index({ userId: 1, planId: 1 }, { unique: true });

module.exports = mongoose.model('UserProgress', UserProgressSchema); 