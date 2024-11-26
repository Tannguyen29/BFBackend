const Meal = require('../models/meal');

// Save meal
exports.saveMeal = async (req, res) => {
  const { mealType, foods, date } = req.body;
  const userId = req.user.userId;

  try {
    // Validate input
    if (!mealType || !foods || foods.length === 0 || !date) {
      return res.status(400).json({ message: 'mealType, foods, and date are required' });
    }

    console.log('Received date:', date);
    const parsedDate = new Date(date);
    console.log('Parsed date:', parsedDate);

    // Set the time to midnight in UTC
    const startOfDay = new Date(parsedDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    
    const endOfDay = new Date(parsedDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    console.log('Query date range:', {
      start: startOfDay,
      end: endOfDay
    });

    // Check if meal exists
    const existingMeal = await Meal.findOne({
      userId,
      mealType,
      date: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    });

    let meal;
    if (existingMeal) {
      console.log('Updating existing meal:', existingMeal._id);
      // Update existing meal
      meal = await Meal.findByIdAndUpdate(
        existingMeal._id,
        {
          $push: { foods: { $each: foods } }
        },
        { new: true }
      );
    } else {
      console.log('Creating new meal for date:', parsedDate);
      // Create new meal
      meal = new Meal({
        userId,
        mealType,
        foods,
        date: parsedDate
      });
      await meal.save();
    }

    console.log('Saved meal:', {
      id: meal._id,
      date: meal.date,
      mealType: meal.mealType
    });

    res.status(201).json(meal);
  } catch (error) {
    console.error('Error saving/updating meal:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      message: 'Failed to save/update meal', 
      error: error.message 
    });
  }
};

// Get meal by type and date
exports.getMealByTypeAndDate = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { mealType } = req.params;
    const dateParam = new Date(req.params.date);

    // Create date range
    const startDate = new Date(dateParam.setHours(0, 0, 0, 0));
    const endDate = new Date(dateParam.setHours(23, 59, 59, 999));

    const meal = await Meal.findOne({
      userId: userId,
      mealType: mealType,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });

    if (!meal) {
      return res.status(404).json({ 
        message: `No ${mealType} meal found for this date` 
      });
    }

    res.json(meal);

  } catch (error) {
    console.error('Error fetching meal:', error);
    res.status(500).json({ message: 'Failed to fetch meal' });
  }
}; 