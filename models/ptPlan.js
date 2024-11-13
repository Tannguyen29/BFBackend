const mongoose = require('mongoose');

const StudentProgressSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  completedWorkouts: [{
    weekNumber: Number,
    dayNumber: Number,
    completedDate: Date,
    feedback: String
  }],
  lastAccessed: Date
});

const PTExerciseSchema = new mongoose.Schema({
  exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' },
  name: String,
  duration: Number,
  sets: { type: Number, default: 1 },
  reps: Number,
  type: String,
  gifUrl: String
});

const PTDaySchema = new mongoose.Schema({
  dayNumber: Number,
  exercises: [PTExerciseSchema],
  level: String,
  totalTime: String,
  focusArea: [String],
});

const PTWeekSchema = new mongoose.Schema({
  weekNumber: Number,
  days: [PTDaySchema],
});

const PTPlanSchema = new mongoose.Schema({
  ptId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  targetAudience: {
    experienceLevels: [{ type: String, enum: ['beginner', 'intermediate', 'advanced'] }],
    fitnessGoals: [{ type: String, enum: ['loseWeight', 'buildMuscle', 'keepFit'] }],
    equipmentNeeded: [{ type: String, enum: ['body weight', 'dumbbell', 'barbell'] }],
    activityLevels: [{ type: String, enum: ['sedentary', 'moderate', 'active'] }],
  },
  duration: {
    weeks: { type: Number, required: true },
    daysPerWeek: { type: Number, required: true },
  },
  weeks: [PTWeekSchema],
  students: [StudentProgressSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('PTPlan', PTPlanSchema);