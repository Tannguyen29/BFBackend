const mongoose = require('mongoose');

const ExerciseSchema = new mongoose.Schema({
  name: String,
  duration: Number, 
  sets: { type: Number, default: 1 }, 
  reps: Number,
  type: String,
});

const DaySchema = new mongoose.Schema({
  dayNumber: Number,
  exercises: [ExerciseSchema],
  level: String,
  totalTime: String,
  focusArea: [String],
});

const WeekSchema = new mongoose.Schema({
  weekNumber: Number,
  days: [DaySchema],
});

const TargetAudienceSchema = new mongoose.Schema({
  experienceLevels: [{ type: String, enum: ['beginner', 'intermediate', 'advanced'] }],
  fitnessGoals: [{ type: String, enum: ['loseWeight', 'buildMuscle', 'keepFit'] }],
  equipmentNeeded: [{ type: String, enum: ['body weight', 'dumbbell', 'barbell'] }],
  activityLevels: [{ type: String, enum: ['sedentary', 'moderate', 'active'] }],
});

const PlanSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: String,
  description: String,
  backgroundImage: String,
  isPro: Boolean,
  accentColor: { type: String, default: '#000000' },
  targetAudience: TargetAudienceSchema,
  duration: {
    weeks: { type: Number, required: true },
    daysPerWeek: { type: Number, required: true },
  },
  weeks: [WeekSchema],
});

const Plan = mongoose.model('Plan', PlanSchema);

module.exports = Plan;