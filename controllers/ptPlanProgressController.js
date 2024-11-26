const PTPlan = require('../models/ptPlan');
const PTProgress = require('../models/ptProgress');

// Get student progress
exports.getStudentProgress = async (req, res) => {
    try {
        const studentId = req.user.userId;
        const planId = req.params.planId;

        const plan = await PTPlan.findOne({
            _id: planId,
            students: studentId
        });

        if (!plan) {
            return res.status(403).json({ message: 'Not authorized to access this plan' });
        }

        const progress = await PTProgress.findOne({ studentId, planId });
        if (!progress) {
            return res.status(404).json({ message: 'Progress not found' });
        }

        const isCompleted = progress.completedWorkouts.length >= 
            (plan.duration.weeks * plan.duration.daysPerWeek);

        res.json({
            completedWorkouts: progress.completedWorkouts,
            currentDay: progress.currentDay,
            lastUnlockTime: progress.lastUnlockTime,
            isCompleted
        });
    } catch (error) {
        console.error('Error getting progress:', error);
        res.status(500).json({ message: 'Error getting progress' });
    }
};

// Update student progress
exports.updateStudentProgress = async (req, res) => {
    try {
        const { completedDay } = req.body;
        const studentId = req.user.userId;
        const planId = req.params.planId;

        if (!completedDay || typeof completedDay !== 'number') {
            return res.status(400).json({ message: 'Invalid completedDay value' });
        }

        const plan = await PTPlan.findOne({
            _id: planId,
            students: studentId
        });

        if (!plan) {
            return res.status(403).json({ message: 'Not authorized to access this plan' });
        }

        let progress = await PTProgress.findOne({ studentId, planId });
        if (!progress) {
            return res.status(404).json({ message: 'Progress not found. Please start the plan first.' });
        }

        // Validate completed day
        if (progress.completedWorkouts.some(workout => workout.dayNumber === completedDay)) {
            return res.status(400).json({ message: 'This day is already completed' });
        }

        // Check workout timing
        if (progress.lastUnlockTime) {
            const lastWorkoutTime = new Date(progress.lastUnlockTime);
            const today = new Date();
            lastWorkoutTime.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);
            
            const lastCompletedWorkout = progress.completedWorkouts[progress.completedWorkouts.length - 1];
            if (lastWorkoutTime.getTime() === today.getTime() && 
                lastCompletedWorkout?.dayNumber === completedDay) {
                return res.status(400).json({ 
                    message: 'You can only complete one workout per day',
                    lastWorkoutTime,
                    today
                });
            }
        }

        // Update progress
        progress.completedWorkouts.push({
            weekNumber: Math.ceil(completedDay / plan.duration.daysPerWeek),
            dayNumber: completedDay,
            completedDate: new Date()
        });

        progress.currentDay = completedDay + 1;
        progress.lastUnlockTime = new Date();

        await progress.save();

        const isCompleted = progress.completedWorkouts.length >= 
            (plan.duration.weeks * plan.duration.daysPerWeek);

        res.json({
            message: 'Progress updated successfully',
            progress: {
                completedWorkouts: progress.completedWorkouts,
                currentDay: progress.currentDay,
                lastUnlockTime: progress.lastUnlockTime,
                isCompleted
            }
        });
    } catch (error) {
        console.error('Error updating progress:', error);
        res.status(500).json({ message: 'Error updating progress' });
    }
};

// Start PT plan
exports.startPTPlan = async (req, res) => {
    try {
        const studentId = req.user.userId;
        const planId = req.params.planId;

        const plan = await PTPlan.findOne({
            _id: planId,
            students: studentId
        });

        if (!plan) {
            return res.status(403).json({ message: 'Not authorized to access this plan' });
        }

        let progress = await PTProgress.findOne({ studentId, planId });
        if (progress) {
            return res.status(400).json({ 
                message: 'Already started this plan',
                progress 
            });
        }

        progress = new PTProgress({
            studentId,
            planId,
            completedWorkouts: [],
            currentDay: 1,
            startDate: new Date()
        });

        await progress.save();
        res.status(201).json(progress);
    } catch (error) {
        console.error('T plan:', error);
        res.status(500).json({ message: '' });
    }
};

// Get all students progress (PT only)
exports.getAllStudentsProgress = async (req, res) => {
    try {
        const planId = req.params.planId;

        const plan = await PTPlan.findOne({
            _id: planId,
            ptId: req.user.userId
        }).populate('students', 'name email');

        if (!plan) {
            return res.status(403).json({ message: 'Not authorized to access this plan' });
        }

        const progresses = await PTProgress.find({
            planId: plan._id,
            studentId: { $in: plan.students.map(student => student._id) }
        });

        const studentsWithProgress = plan.students.map(student => {
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

        res.json({ students: studentsWithProgress });
    } catch (error) {
        console.error('Error fetching students progress:', error);
        res.status(500).json({ message: 'Error fetching students progress' });
    }
}; 