const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  ptId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
}, { timestamps: true });

const Schedule = mongoose.model('Schedule', scheduleSchema);
module.exports = Schedule;