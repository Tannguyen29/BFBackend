const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const scheduleController = require('../controllers/scheduleController');

// Create new schedule
router.post('/', auth, scheduleController.createSchedule);

// Get PT's schedules
router.get('/', auth, scheduleController.getPTSchedules);

// Get student's schedules
router.get('/student', auth, scheduleController.getStudentSchedules);

// Get schedules by date range
router.get('/range/:startDate/:endDate', auth, scheduleController.getSchedulesByRange);

// Get schedules by specific date
router.get('/date/:date', auth, scheduleController.getSchedulesByDate);

// Update schedule
router.put('/:scheduleId', auth, scheduleController.updateSchedule);

// Delete schedule
router.delete('/:scheduleId', auth, scheduleController.deleteSchedule);

// Get available time slots
router.get('/available-slots/:date', auth, scheduleController.getAvailableSlots);

module.exports = router;
