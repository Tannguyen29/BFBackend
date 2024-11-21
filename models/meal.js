const mongoose = require('mongoose');

const FoodItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  servingSize: { type: String, required: true },
  servingUnit: { type: String, required: true },
  numberOfServings: { type: Number, required: true },
  calories: { type: Number, required: true },
  protein: { type: Number, required: true },
  fat: { type: Number, required: true },
  carbs: { type: Number, required: true },
}, { _id: false });

const MealSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  mealType: { type: String, enum: ['Breakfast', 'Lunch', 'Dinner'], required: true },
  foods: [FoodItemSchema],
  date: { type: Date, required: true },
});

module.exports = mongoose.model('Meal', MealSchema);
