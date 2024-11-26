const PTPlan = require('../models/ptPlan');
const User = require('../models/user');
const PTProgress = require('../models/ptProgress');

// Get pro users
exports.getProUsers = async (req, res) => {
  try {
    const proUsers = await User.find({ role: 'premium' });
    res.json(proUsers);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Create new PT plan
exports.createPTPlan = async (req, res) => {
  try {
    const { title, targetAudience, duration, students, exercises } = req.body;

    // Create weeks and days structure
    const weeks = createWeeksStructure(duration, exercises, targetAudience);

    const newPlan = new PTPlan({
      ptId: req.user.userId,
      title,
      targetAudience,
      duration,
      weeks,
      students,
    });

    await newPlan.save();
    res.status(201).json(newPlan);
  } catch (error) {
    console.error('Error creating PT plan:', error);
    res.status(500).json({ message: 'Error creating plan', error: error.message });
  }
};

// Get all PT plans
exports.getAllPTPlans = async (req, res) => {
  try {
    const plans = await PTPlan.find({ ptId: req.user.userId })
      .populate('students', 'name email')
      .populate('weeks.days.exercises.exerciseId');

    const formattedPlans = await Promise.all(plans.map(async plan => {
      const students = plan.students || [];
      
      const progresses = await PTProgress.find({
        planId: plan._id,
        studentId: { $in: students.map(student => student._id) }
      });

      const studentsWithProgress = students.map(student => {
        const studentProgress = progresses.find(
          p => p.studentId.toString() === student._id.toString()
        );

        return {
          studentId: student._id,
          name: student.name || 'Unknown',
          email: student.email || '',
          completedWorkouts: studentProgress?.completedWorkouts || [],
          currentDay: studentProgress?.currentDay || 0,
          lastUnlockTime: studentProgress?.lastUnlockTime || null
        };
      });

      return {
        _id: plan._id,
        title: plan.title || 'Untitled Plan',
        targetAudience: plan.targetAudience || {},
        duration: plan.duration || { weeks: 0, daysPerWeek: 0 },
        weeks: plan.weeks || [],
        students: studentsWithProgress,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt
      };
    }));

    res.json(formattedPlans);
  } catch (error) {
    console.error('Error fetching PT plans:', error);
    res.status(500).json({ 
      message: 'Error fetching plans',
      error: error.message 
    });
  }
};

// Get specific PT plan
exports.getPTPlanById = async (req, res) => {
  try {
    const plan = await PTPlan.findOne({ 
      _id: req.params.planId,
      ptId: req.user.userId 
    })
    .populate('students', 'name email')
    .populate('weeks.days.exercises.exerciseId');

    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    res.json(plan);
  } catch (error) {
    console.error('Error fetching plan details:', error);
    res.status(500).json({ message: 'Error fetching plan details' });
  }
};

// Update PT plan
exports.updatePTPlan = async (req, res) => {
  try {
    const { title, targetAudience, duration, students, exercises } = req.body;

    // Validation
    if (!validatePlanData(title, targetAudience, duration, students, exercises)) {
      return res.status(400).json({ message: 'Invalid plan data' });
    }

    const existingPlan = await PTPlan.findOne({
      _id: req.params.planId,
      ptId: req.user.userId
    });

    if (!existingPlan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    const weeks = createWeeksStructure(duration, exercises, targetAudience);
    const uniqueStudents = [...new Set(students)];

    const updatedPlan = await PTPlan.findByIdAndUpdate(
      req.params.planId,
      {
        title,
        targetAudience,
        duration,
        weeks,
        students: uniqueStudents,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('students', 'name email')
     .populate('weeks.days.exercises.exerciseId');

    res.json(updatedPlan);
  } catch (error) {
    console.error('Error updating PT plan:', error);
    res.status(500).json({ message: 'Error updating plan' });
  }
};

// Helper functions
const createWeeksStructure = (duration, exercises, targetAudience) => {
  const weeks = [];
  for (let weekNum = 1; weekNum <= duration.weeks; weekNum++) {
    const days = [];
    for (let dayNum = 1; dayNum <= duration.daysPerWeek; dayNum++) {
      days.push({
        dayNumber: dayNum,
        exercises: exercises.filter(ex => 
          ex.weekNumber === weekNum && ex.dayNumber === dayNum
        ).map(ex => ({
          exerciseId: ex.exercise._id,
          name: ex.exercise.name,
          duration: parseInt(ex.exercise.duration) || 0,
          sets: parseInt(ex.exercise.sets) || 1,
          reps: parseInt(ex.exercise.reps) || 0,
          type: ex.exercise.type || 'exercise',
          gifUrl: ex.exercise.gifUrl
        })),
        level: targetAudience.experienceLevels[0] || 'beginner',
        focusArea: exercises.filter(ex => 
          ex.weekNumber === weekNum && ex.dayNumber === dayNum
        ).map(ex => ex.exercise.bodyPart)
      });
    }
    weeks.push({
      weekNumber: weekNum,
      days: days
    });
  }
  return weeks;
};

const validatePlanData = (title, targetAudience, duration, students, exercises) => {
  if (!title?.trim()) return false;
  if (!targetAudience?.experienceLevels?.length) return false;
  if (!targetAudience?.fitnessGoals?.length) return false;
  if (!targetAudience?.equipmentNeeded?.length) return false;
  if (!duration?.weeks || duration.weeks <= 0) return false;
  if (!duration?.daysPerWeek || duration.daysPerWeek <= 0) return false;
  if (!students?.length) return false;
  if (!exercises?.length) return false;
  return true;
}; 