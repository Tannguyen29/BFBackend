const mongoose = require('mongoose');

const PTProgressSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'PTPlan',
    required: true
  },
  completedWorkouts: [{
    weekNumber: Number,
    dayNumber: Number,
    completedDate: Date,
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

// Đảm bảo mỗi student chỉ có một progress cho mỗi PT plan
PTProgressSchema.index({ studentId: 1, planId: 1 }, { unique: true });

module.exports = mongoose.model('PTProgress', PTProgressSchema); 