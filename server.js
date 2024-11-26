require('dotenv').config();
const express = require('express');
const connectDB = require('./config/database');
const setupMiddleware = require('./config/middleware');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const exerciseRoutes = require('./routes/exercises');
const scheduleRoutes = require('./routes/schedules');
const nutritionRoutes = require('./routes/nutrition');
const planRoutes = require('./routes/plans');
const ptPlanRoutes = require('./routes/ptPlans');
const studentPtPlanRoutes = require('./routes/studentPtPlans');
const bannerRoutes = require('./routes/banners');
const paymentRoutes = require('./routes/payment');
const planProgressRoutes = require('./routes/planProgress');
const ptPlanProgressRoutes = require('./routes/ptPlanProgress');

// Initialize app
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Setup Middleware
setupMiddleware(app);

// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/payment', paymentRoutes);
app.use('/exercises', exerciseRoutes);
app.use('/schedules', scheduleRoutes);
app.use('/nutrition', nutritionRoutes);
app.use('/plans', planRoutes);
app.use('/plan-progress', planProgressRoutes);
app.use('/pt-plans', ptPlanRoutes);
app.use('/student-pt-plans', studentPtPlanRoutes);
app.use('/pt-plan-progress', ptPlanProgressRoutes);
app.use('/banners', bannerRoutes);

// Initialize scheduled tasks
const initScheduledTasks = require('./utils/scheduledTasks');
initScheduledTasks();

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
