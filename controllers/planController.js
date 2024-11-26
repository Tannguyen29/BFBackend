const Plan = require('../models/plan');
const User = require('../models/user');
const cloudinary = require('../config/cloudinary');

// Create a new plan
exports.createPlan = async (req, res) => {
  try {
    let planData;
    try {
      planData = JSON.parse(req.body.planData);
    } catch (error) {
      console.error('Error parsing planData:', error);
      return res.status(400).json({ message: 'Invalid plan data format' });
    }

    // Validate required fields
    if (!planData.title) {
      return res.status(400).json({ message: 'Title is required' });
    }
    if (!planData.duration?.weeks || !planData.duration?.daysPerWeek) {
      return res.status(400).json({ message: 'Duration is required' });
    }

    // Handle background image
    let imageUrl = planData.backgroundImage;
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'plans'
        });
        imageUrl = result.secure_url;
      } catch (error) {
        console.error('Error uploading image:', error);
      }
    }

    // Format weeks data
    const formattedWeeks = planData.weeks.map(week => ({
      weekNumber: week.weekNumber,
      days: week.days.map(day => ({
        dayNumber: day.dayNumber,
        exercises: day.exercises.map(exercise => ({
          name: exercise.name,
          duration: parseInt(exercise.duration) || 0,
          sets: parseInt(exercise.sets) || 1,
          reps: parseInt(exercise.reps) || 0,
          type: exercise.type || ''
        })),
        level: day.level || '',
        totalTime: day.totalTime || '0 minutes',
        focusArea: Array.isArray(day.focusArea) ? day.focusArea : []
      }))
    }));

    const newPlan = new Plan({
      title: planData.title,
      subtitle: planData.subtitle || '',
      description: planData.description || '',
      backgroundImage: imageUrl,
      isPro: planData.isPro || false,
      accentColor: planData.accentColor || '#000000',
      targetAudience: {
        experienceLevels: Array.isArray(planData.targetAudience?.experienceLevels) 
          ? planData.targetAudience.experienceLevels 
          : [],
        fitnessGoals: Array.isArray(planData.targetAudience?.fitnessGoals) 
          ? planData.targetAudience.fitnessGoals 
          : [],
        equipmentNeeded: Array.isArray(planData.targetAudience?.equipmentNeeded) 
          ? planData.targetAudience.equipmentNeeded 
          : [],
        activityLevels: Array.isArray(planData.targetAudience?.activityLevels) 
          ? planData.targetAudience.activityLevels 
          : []
      },
      duration: {
        weeks: parseInt(planData.duration.weeks),
        daysPerWeek: parseInt(planData.duration.daysPerWeek)
      },
      weeks: formattedWeeks
    });

    const savedPlan = await newPlan.save();
    res.status(201).json(savedPlan);
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).json({ 
      message: 'Error creating plan', 
      error: error.message,
      stack: error.stack 
    });
  }
};

// Update a plan
exports.updatePlan = async (req, res) => {
  try {
    const planId = req.params.id;
    const updateData = JSON.parse(req.body.planData);

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'plans'
      });
      updateData.backgroundImage = result.secure_url;
    }

    const updatedPlan = await Plan.findByIdAndUpdate(planId, updateData, { new: true });
    if (!updatedPlan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    res.status(200).json(updatedPlan);
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({ 
      message: 'Error updating plan', 
      error: error.message,
      stack: error.stack 
    });
  }
};

// Get all plans
exports.getAllPlans = async (req, res) => {
  try {
    const plans = await Plan.find();
    res.status(200).json(plans);
  } catch (error) {
    console.error('Error getting all plans:', error);
    res.status(500).json({ 
      message: 'Error getting all plans', 
      error: error.message,
      stack: error.stack 
    });
  }
};

// Get plan by id
exports.getPlanById = async (req, res) => {
  try {
    const planId = req.params.id;
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    res.status(200).json(plan);
  } catch (error) {
    console.error('Error getting plan by id:', error);
    res.status(500).json({ 
      message: 'Error getting plan by id', 
      error: error.message,
      stack: error.stack 
    });
  }
};

// Delete a plan
exports.deletePlan = async (req, res) => {
  try {
    const planId = req.params.id;
    const deletedPlan = await Plan.findByIdAndDelete(planId);
    if (!deletedPlan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    res.status(200).json({ message: 'Plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting plan:', error);
    res.status(500).json({ 
      message: 'Error deleting plan', 
      error: error.message,
      stack: error.stack 
    });
  }
};

// Get matching plans for user
exports.getMatchingPlans = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const matchingPlans = await Plan.find({
      targetAudience: {
        $elemMatch: {
          experienceLevels: { $in: user.experienceLevels },
          fitnessGoals: { $in: user.fitnessGoals },
          equipmentNeeded: { $in: user.equipmentNeeded },
          activityLevels: { $in: user.activityLevels }
        }
      }
    });
    res.status(200).json(matchingPlans);
  } catch (error) {
    console.error('Error getting matching plans:', error);
    res.status(500).json({ 
      message: 'Error getting matching plans', 
      error: error.message,
      stack: error.stack 
    });
  }
}; 