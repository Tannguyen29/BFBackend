const Schedule = require('../models/schedule');
const User = require('../models/user');

// Create new schedule
exports.createSchedule = async (req, res) => {
  try {
    const { studentId, date, startTime, endTime } = req.body;
    
    // Log để debug
    console.log('Request body:', req.body);
    console.log('User ID:', req.user.userId);
    
    // Verify that the creator is a PT
    const pt = await User.findById(req.user.userId);
    console.log('PT info:', pt);
    
    if (!pt || pt.role !== 'PT') {
      return res.status(403).json({ 
        message: 'Only PTs can create schedules',
        userRole: pt ? pt.role : 'not found'
      });
    }

    // Verify that the student exists and is premium
    const student = await User.findById(studentId);
    console.log('Student info:', student);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    if (student.role !== 'premium') {
      return res.status(403).json({ 
        message: 'Can only schedule sessions with premium students',
        studentRole: student.role
      });
    }

    // Create new schedule
    const newSchedule = new Schedule({
      ptId: req.user.userId,
      studentId,
      date: new Date(date),
      startTime,
      endTime,
      status: 'pending'
    });
    
    await newSchedule.save();
    console.log('New schedule created:', newSchedule);
    
    res.status(201).json({
      message: 'Schedule created successfully',
      schedule: newSchedule
    });

  } catch (error) {
    console.error('Error in createSchedule:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
};

// Get PT's schedules
exports.getPTSchedules = async (req, res) => {
  try {
    const schedules = await Schedule.find({ ptId: req.user.userId })
      .populate('studentId', 'name')
      .sort({ date: 1, startTime: 1 });

    const formattedSchedules = schedules.map(schedule => ({
      _id: schedule._id,
      date: schedule.date,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      studentName: schedule.studentId.name
    }));
    
    res.json(formattedSchedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get student's schedules
exports.getStudentSchedules = async (req, res) => {
  try {
    const schedules = await Schedule.find({ studentId: req.user.userId })
      .populate('ptId', 'name')
      .sort({ date: 1, startTime: 1 });
    
    const formattedSchedules = schedules.map(schedule => ({
      _id: schedule._id,
      date: schedule.date,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      ptName: schedule.ptId.name
    }));

    res.json(formattedSchedules);
  } catch (error) {
    console.error('Error fetching student schedules:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get schedules by range
exports.getSchedulesByRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    
    const schedules = await Schedule.find({
      ptId: req.user.userId,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    })
    .populate('studentId', 'name')
    .sort({ date: 1, startTime: 1 });

    res.json(schedules);
  } catch (error) {
    console.error('Error fetching schedule range:', error);
    res.status(500).send('Server error');
  }
};

// Get schedules by date
exports.getSchedulesByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const schedules = await Schedule.find({
      ptId: req.user.userId,
      date: new Date(date)
    })
    .populate('studentId', 'name')
    .sort({ startTime: 1 });
    
    res.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules for date:', error);
    res.status(500).send('Server error');
  }
};

// Update schedule
exports.updateSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { startTime, endTime } = req.body;
    
    const schedule = await Schedule.findById(scheduleId);
    
    if (schedule.ptId.toString() !== req.user.userId) {
      return res.status(403).send('Not authorized to update this schedule');
    }

    const conflictingSchedule = await Schedule.findOne({
      ptId: req.user.userId,
      date: schedule.date,
      _id: { $ne: scheduleId },
      $or: [
        {
          $and: [
            { startTime: { $lte: startTime } },
            { endTime: { $gt: startTime } }
          ]
        },
        {
          $and: [
            { startTime: { $lt: endTime } },
            { endTime: { $gte: endTime } }
          ]
        },
        {
          $and: [
            { startTime: { $gte: startTime } },
            { endTime: { $lte: endTime } }
          ]
        }
      ]
    });

    if (conflictingSchedule) {
      return res.status(400).send('New time slot conflicts with an existing schedule');
    }

    schedule.startTime = startTime;
    schedule.endTime = endTime;
    await schedule.save();

    const updatedSchedule = await Schedule.findById(scheduleId)
      .populate('studentId', 'name');
    
    res.json(updatedSchedule);
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).send('Server error');
  }
};

// Delete schedule
exports.deleteSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.scheduleId);
    
    if (schedule.ptId.toString() !== req.user.userId) {
      return res.status(403).send('Not authorized to delete this schedule');
    }

    await schedule.deleteOne();
    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).send('Server error');
  }
};

// Get available slots
exports.getAvailableSlots = async (req, res) => {
  try {
    const { date } = req.params;
    
    const schedules = await Schedule.find({
      ptId: req.user.userId,
      date: new Date(date)
    });

    const workingHours = {
      start: '09:00',
      end: '17:00'
    };

    const bookedSlots = schedules.map(schedule => ({
      start: schedule.startTime,
      end: schedule.endTime
    }));

    res.json({
      workingHours,
      bookedSlots
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).send('Server error');
  }
};
