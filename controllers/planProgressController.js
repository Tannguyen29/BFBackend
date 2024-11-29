const Plan = require('../models/plan');
const UserProgress = require('../models/userProgress');

// Start tracking a plan
exports.startPlan = async (req, res) => {
    try {
        const { planId } = req.params;
        const userId = req.user.userId;

        const plan = await Plan.findById(planId);
        if (!plan) {
            return res.status(404).json({ 
                message: 'Plan not found',
                planId: planId
            });
        }

        // Tìm progress hiện có
        let progress = await UserProgress.findOne({ userId, planId });
        
        if (progress) {
            // Nếu đã có progress, trả về progress đó
            return res.status(200).json({ 
                message: 'Plan progress found',
                progress,
                isExisting: true
            });
        }

        // Nếu chưa có, tạo mới progress
        progress = new UserProgress({
            userId,
            planId,
            completedWorkouts: [],
            currentDay: 1,
            lastUnlockTime: null,
            startDate: new Date()
        });

        const savedProgress = await progress.save();

        return res.status(201).json({
            message: 'New plan progress created',
            progress: savedProgress,
            isExisting: false
        });

    } catch (error) {
        console.error('Error in startPlan:', error);
        res.status(500).json({ 
            message: 'Error managing plan progress',
            error: error.message
        });
    }
};

// Get plan progress
exports.getPlanProgress = async (req, res) => {
    try {
        const progress = await UserProgress.findOne({
            userId: req.user.userId,
            planId: req.params.planId
        });

        if (!progress) {
            return res.status(404).json({ message: 'Progress not found' });
        }

        res.json(progress);
    } catch (error) {
        console.error('Error getting progress:', error);
        res.status(500).json({ message: 'Error getting progress' });
    }
};

// Update plan progress
exports.updateProgress = async (req, res) => {
    try {
        const { completedDay } = req.body;
        const userId = req.user.userId;
        const { planId } = req.params;

        if (!completedDay || typeof completedDay !== 'number') {
            return res.status(400).json({ message: 'Invalid completedDay value' });
        }

        const plan = await Plan.findById(planId);
        if (!plan) {
            return res.status(404).json({ message: 'Plan not found' });
        }

        let progress = await UserProgress.findOne({ userId, planId });
        
        // Validate completed day
        if (progress.completedWorkouts.some(workout => workout.dayNumber === completedDay)) {
            return res.status(400).json({ message: 'This day is already completed' });
        }

        // Check workout timing
        if (progress.lastUnlockTime) {
            const lastWorkoutTime = new Date(progress.lastUnlockTime);
            const today = new Date();
            
            // Set về 00:00 để so sánh ngày
            const nextDay = new Date(lastWorkoutTime);
            nextDay.setDate(nextDay.getDate() + 1);
            nextDay.setHours(0, 0, 0, 0);
            
            if (today < nextDay) {
                return res.status(400).json({ 
                    message: 'Please wait until tomorrow to start your next workout',
                    nextWorkoutTime: nextDay
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

// Reset progress timer
exports.resetTimer = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { planId } = req.params;

        let progress = await UserProgress.findOne({ userId, planId });
        if (!progress) {
            return res.status(404).json({ message: 'Progress not found' });
        }

        progress.lastUnlockTime = null;
        await progress.save();

        res.json({
            message: 'Timer reset successfully',
            progress
        });
    } catch (error) {
        console.error('Error resetting timer:', error);
        res.status(500).json({ message: 'Error resetting timer' });
    }
}; 