const PTPlan = require('../models/ptPlan');
const PTProgress = require('../models/ptProgress');

// Get all PT plans for student
exports.getStudentPTPlans = async (req, res) => {
  try {
    // Find all plans containing current user's studentId
    const plans = await PTPlan.find({
      students: req.user.userId
    }).populate('ptId', 'name email');

    // Get progress for all plans
    const progressList = await PTProgress.find({
      studentId: req.user.userId,
      planId: { $in: plans.map(plan => plan._id) }
    });

    // Format data for client
    const formattedPlans = plans.map(plan => {
      const progress = progressList.find(p => 
        p.planId.toString() === plan._id.toString()
      );
      
      return {
        _id: plan._id,
        title: plan.title,
        subtitle: plan.title,
        ptName: plan.ptId.name,
        targetAudience: plan.targetAudience,
        duration: plan.duration,
        weeks: plan.weeks,
        progress: progress?.completedWorkouts || []
      };
    });

    res.json(formattedPlans);
  } catch (error) {
    console.error('Error fetching student PT plans:', error);
    res.status(500).json({ message: 'Error fetching plans' });
  }
};

// Get specific PT plan details
exports.getStudentPTPlanById = async (req, res) => {
  try {
    // Get plan and populate related data
    const plan = await PTPlan.findById(req.params.planId)
      .populate('ptId', 'name email')
      .populate('weeks.days.exercises.exerciseId')
      .lean();

    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    // Check access rights
    const isStudent = plan.students.some(
      studentId => studentId.toString() === req.user.userId
    );

    if (!isStudent) {
      return res.status(403).json({ message: 'Not authorized to view this plan' });
    }

    // Get student's progress
    const progress = await PTProgress.findOne({
      studentId: req.user.userId,
      planId: plan._id
    });

    // Format response
    const response = {
      _id: plan._id,
      title: plan.title,
      ptId: {
        _id: plan.ptId?._id || null,
        name: plan.ptId?.name || 'Unknown',
        email: plan.ptId?.email || ''
      },
      targetAudience: plan.targetAudience || {},
      duration: plan.duration,
      weeks: plan.weeks.map(week => ({
        weekNumber: week.weekNumber,
        days: week.days.map(day => ({
          dayNumber: day.dayNumber,
          exercises: day.exercises.map(exercise => ({
            ...exercise,
            name: exercise.exerciseId?.name || exercise.name,
            gifUrl: exercise.exerciseId?.gifUrl || exercise.gifUrl
          })),
          level: day.level,
          totalTime: day.totalTime,
          focusArea: day.focusArea
        }))
      })),
      progress: progress ? {
        completedWorkouts: progress.completedWorkouts || [],
        currentDay: progress.currentDay || 1,
        lastUnlockTime: progress.lastUnlockTime || null
      } : null
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching PT plan details:', error);
    res.status(500).json({ 
      message: 'Error fetching plan details',
      error: error.message 
    });
  }
}; 