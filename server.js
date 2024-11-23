require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Exercise = require('./models/exercise');
const Plan = require('./models/plan');
const Schedule = require('./models/schedule');
const axios = require('axios').default;
const CryptoJS = require('crypto-js'); 
const moment = require('moment'); 
const transporter = require('./config/nodemailer');
const querystring = require('qs');
const checkPremiumExpiration = require('./middleware/checkPremiumExpiration');
const User = require('./models/user');
const auth = require('./middleware/auth');
const Banner = require('./models/banner.js');
const Meal = require('./models/meal.js');
const PTPlan =require('./models/ptPlan.js');
const app = express();
const PORT = process.env.PORT || 5000;

const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const otpEmailTemplate = require('./otpEmailTemplate.jsx');

const mongoUri = process.env.MONGO_URI || 'your-mongodb-uri-here';
const configpayment = process.env.config;
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Middleware
app.use(cors());
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cors({
  origin: 'http://localhost:3000',
  optionsSuccessStatus: 200
}));

// AUTHEN 
app.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).send('User not found');
    }
    if (!user.verified) {
      return res.status(400).send('User not verified');
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).send('Invalid password');
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'secret_key');
    res.send({ token, name: user.name || email, personalInfoCompleted: user.personalInfoCompleted });
  } catch (err) {
    res.status(500).send('Error signing in');
  }
});

app.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).send('Email already exists');
    }

    const existingName = await User.findOne({ name });
    if (existingName) {
      return res.status(400).send('Name already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const otp = crypto.randomInt(1000, 9999).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    const user = new User({ name, email, password: hashedPassword, otp, otpExpires, role: 'free' });
    await user.save();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Sign In OTP code',
      html: otpEmailTemplate(otp)
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return console.log(error);
      }
      console.log('OTP email sent: %s', info.messageId);
    });

    res.status(201).send('User registered successfully. Please check your email for the OTP.');
  } catch (err) {
    res.status(400).send('Error registering user');
  }
});


app.post('/resetpassword', async (req,res) =>{
  const {email, newPassword, confirmPassword } = req.body;
  if (newPassword !== confirmPassword){
    return res.status(400).send('Password do not match');
  }
  try {
    const user = await User.findOne({email});
    if(!user){
      return res.status(400).send('User not found');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    res.status(200).send('Password reset successfully');

  } catch(err){
    console.error(err);
    res.status(500).send('Error resetting password');
  }
});

// OTP CONTROLLER
app.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  try {
    const otp = crypto.randomInt(1000, 9999).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; 

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ email, otp, otpExpires });
    } else {
      user.otp = otp;
      user.otpExpires = otpExpires;
    }
    await user.save();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP Code',
      html: otpEmailTemplate(otp, user.name)
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        return res.status(500).send('Error sending OTP email');
      }
      console.log('OTP email sent: %s', info.messageId);
      res.status(200).send('OTP sent successfully');
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error sending OTP');
  }
});

app.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ email, otp });
    if (!user) {
      return res.status(400).send('Invalid OTP');
    }
    if (user.otpExpires < Date.now()) {
      return res.status(400).send('OTP expired');
    }
    user.verified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();
    res.status(200).send('OTP verified successfully');
  } catch (err) {
    res.status(500).send('Error verifying OTP');
  }
});

app.post('/resend-otp', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).send('User not found');
    }
    const newOtp = crypto.randomInt(1000, 9999).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;  

    user.otp = newOtp;
    user.otpExpires = otpExpires;
    await user.save();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your New OTP Code - Bro Fitness',
      html: otpEmailTemplate(newOtp, user.name)
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        return res.status(500).send('Error sending OTP email');
      }
      console.log('New OTP email sent: %s', info.messageId);
      res.status(200).send('New OTP sent successfully');
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error resending OTP');
  }
});

app.post('/personal-information-setup', auth, async (req, res) => {
  const { userId } = req.user;
  const {
    gender,
    age,
    height,
    weight,
    goalWeight,
    physicalActivityLevel,
    fitnessGoal,
    equipment,
    experienceLevel,
    bodyParts,
    calorieGoal
  } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }
    user.personalInfo = {
      gender,
      age,
      height,
      weight,
      goalWeight,
      physicalActivityLevel,
      fitnessGoal,
      equipment,
      experienceLevel,
      bodyParts,
      calorieGoal
    };
    user.personalInfoCompleted = true;
    await user.save();
    res.status(200).send('Personal information saved successfully');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error saving personal information');
  }
});

app.get('/user-info', auth, checkPremiumExpiration, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Sending user info:', {
      userId: user._id,
      role: user.role,
      premiumExpireDate: user.premiumExpireDate
    });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      personalInfo: user.personalInfo,
      personalInfoCompleted: user.personalInfoCompleted,
      avatarUrl: user.avatarUrl,
      premiumExpireDate: user.premiumExpireDate,
      daysRemaining: user.premiumExpireDate ? 
        moment(user.premiumExpireDate).diff(moment(), 'days') : 0
    });
  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/user-info', auth, async (req, res) => {
  const { userId } = req.user;
  const { name, gender, weight, height } = req.body;

  try {
    const user = await User.findByIdAndUpdate(userId, {
      name,
      'personalInfo.gender': gender,
      'personalInfo.weight': weight,
      'personalInfo.height': height
    }, { new: true });

    if (!user) {
      return res.status(404).send('User not found');
    }

    res.json({
      name: user.name,
      personalInfo: user.personalInfo
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating user information');
  }
});

// Upload avatar
app.post('/upload-avatar', auth, upload.single('avatar'), async (req, res) => {
  const { userId } = req.user;

  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }

  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'avatars',
      public_id: `user_${userId}_avatar`
    });

    const user = await User.findByIdAndUpdate(userId, {
      avatarUrl: result.secure_url
    }, { new: true });

    if (!user) {
      return res.status(404).send('User not found');
    }

    res.json({ avatarUrl: result.secure_url });
  } catch (err) {
    console.error('Error uploading avatar:', err);
    res.status(500).send('Error uploading avatar');
  }
});

////////EXERCISES/////////////

// Create a new exercise
app.post('/exercises', upload.single('gifFile'), async (req, res) => {
  try {
    let gifUrl = req.body.gifUrl;
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: ''
      });
      gifUrl = result.secure_url;
    }

    const exerciseData = {
      ...req.body,
      gifUrl,
      secondaryMuscles: JSON.parse(req.body.secondaryMuscles || '[]')
    };

    const exercise = new Exercise(exerciseData);
    await exercise.save();
    res.status(201).send(exercise);
  } catch (error) {
    console.error('Error creating exercise:', error);
    res.status(400).send(error);
  }
});

// Get all exercises
app.get('/exercises',  async (req, res) => {
  try {
    const exercises = await Exercise.find({});
    res.send(exercises);
  } catch (error) {
    res.status(500).send();
  }
});

// Get a specific exercise
app.get('/exercises/:id',  async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) {
      return res.status(404).send();
    }
    res.send(exercise);
  } catch (error) {
    res.status(500).send();
  }
});

// Update an exercise
app.patch('/exercises/:id', upload.single('gifFile'), async (req, res) => {
  try {
    let updateData = req.body;
    
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: ''
      });
      updateData.gifUrl = result.secure_url;
    }

    if (updateData.secondaryMuscles) {
      updateData.secondaryMuscles = JSON.parse(updateData.secondaryMuscles);
    }

    const exercise = await Exercise.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!exercise) {
      return res.status(404).send();
    }
    res.send(exercise);
  } catch (error) {
    console.error('Error updating exercise:', error);
    res.status(400).send(error);
  }
});

// Delete an exercise
app.delete('/exercises/:id', async (req, res) => {
  try {
    const exercise = await Exercise.findByIdAndDelete(req.params.id);
    if (!exercise) {
      return res.status(404).send();
    }
    res.send(exercise);
  } catch (error) {
    res.status(500).send();
  }
});

app.get('/exercise-details/:name', async (req, res) => {
  try {
    const exerciseName = req.params.name.toLowerCase();
    const exercise = await Exercise.findOne({ name: exerciseName });
    if (!exercise) {
      return res.status(404).send('Exercise not found');
    }
    res.json(exercise);
  } catch (error) {
    res.status(500).send('Server error');
  }
});

// Get all users (for debugging)
app.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).select('-password -otp -otpExpires');
    res.send(users);
  } catch (error) {
    res.status(500).send();
  }
});

////////PLAN////////////

// Create a new plan
app.post('/plans', upload.single('backgroundImage'), async (req, res) => {
  try {
    const planData = JSON.parse(req.body.planData);

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'PlanImage'
      });

      planData.backgroundImage = result.secure_url;
    }

    // Include targetAudience in the new plan
    const plan = new Plan({
      ...planData,
      targetAudience: planData.targetAudience
    });

    const validationError = plan.validateSync();
    if (validationError) {
      console.error('Validation error creating plan:', validationError);
      return res.status(400).json({ error: validationError.message });
    }
    await plan.save();
    res.status(201).send(plan);
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update a plan
app.patch('/plans/:id', upload.single('backgroundImage'), async (req, res) => {
  try {
    const planId = req.params.id;
    const updateData = JSON.parse(req.body.planData);

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'PlanImage'
      });

      updateData.backgroundImage = result.secure_url;
    }

    // Include targetAudience in the update data
    const plan = await Plan.findByIdAndUpdate(planId, {
      ...updateData,
      targetAudience: updateData.targetAudience
    }, { new: true, runValidators: true });
    
    if (!plan) {
      return res.status(404).send();
    }
    
    res.send(plan);
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(400).send(error);
  }
});


// Get all plans
app.get('/plans', async (req, res) => {
  try {
    const plans = await Plan.find({});
    res.send(plans);
  } catch (error) {
    res.status(500).send();
  }
});

// Delete a plan
app.delete('/plans/:id', async (req, res) => {
  try {
    const plan = await Plan.findByIdAndDelete(req.params.id);
    if (!plan) {
      return res.status(404).send();
    }
    res.send(plan);
  } catch (error) {
    res.status(500).send();
  }
});

app.get('/plans/:id', async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) {
      return res.status(404).send('Plan not found');
    }
    res.send(plan);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get('/planperuser', auth, async (req, res) => {
  const { userId } = req.user; 
  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).send('User not found');
    }
    const { experienceLevel, fitnessGoal, equipment, physicalActivityLevel } = user.personalInfo;

    const matchingPlans = await Plan.find({
      'targetAudience.experienceLevels': experienceLevel,
      'targetAudience.fitnessGoals': fitnessGoal,
      'targetAudience.equipmentNeeded': equipment,
      'targetAudience.activityLevels': physicalActivityLevel,
    });

    if (matchingPlans.length === 0) {
      return res.status(404).send('No matching plans found');
    }

    res.json(matchingPlans);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching plans');
  }
});

///////BANNER//////////
// Create a new banner
app.post('/banners', upload.single('image'), async (req, res) => {
  try {
    let imageUrl = req.body.imageUrl;
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'banner'
      });
      imageUrl = result.secure_url;
    }
    const banner = new Banner({
      name: req.body.name,
      imageUrl: imageUrl,
      expiryDate: new Date(req.body.expiryDate)
    });
    await banner.save();
    res.status(201).send(banner);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Update a banner
app.put('/banners/:id', upload.single('image'), async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).send();
    }
    
    if (req.body.name) banner.name = req.body.name;
    if (req.body.expiryDate) banner.expiryDate = new Date(req.body.expiryDate);
    
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'banner' 
      });
      banner.imageUrl = result.secure_url;
    } else if (req.body.imageUrl) {
      banner.imageUrl = req.body.imageUrl;
    }

    await banner.save();
    res.send(banner);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Get all banners
app.get('/banners', async (req, res) => {
  try {
    const banners = await Banner.find({});
    res.send(banners);
  } catch (error) {
    res.status(500).send();
  }
});

// Delete a banner
app.delete('/banners/:id', async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) {
      return res.status(404).send();
    }
    res.send(banner);
  } catch (error) {
    res.status(500).send();
  }
});

// Add this function to automatically remove expired banners
const removeExpiredBanners = async () => {
  const currentDate = new Date();
  await Banner.deleteMany({ expiryDate: { $lt: currentDate } });
};

// Run this function every day at midnight
setInterval(removeExpiredBanners, 24 * 60 * 60 * 1000);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Get all students (for PT to select)
app.get('/students', auth, async (req, res) => {
  try {
    const students = await User.find({ role: 'free' }, 'name');
    res.json(students);
  } catch (error) {
    res.status(500).send('Server error');
  }
});

// Create new schedule
app.post('/schedules', auth, async (req, res) => {
  try {
    const { studentId, date, startTime, endTime } = req.body;
    
    // Verify that the creator is a PT
    const pt = await User.findById(req.user.userId);
    if (pt.role !== 'PT') {
      return res.status(403).send('Only PTs can create schedules');
    }

    const existingStudentSchedule = await Schedule.findOne({
      studentId: studentId,
      date: new Date(date)
    });

    if (existingStudentSchedule) {
      return res.status(400).send('Student already has a schedule on this date');
    }

    const conflictingSchedule = await Schedule.findOne({
      ptId: req.user.userId,
      date: new Date(date),
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
      return res.status(400).send('Time slot conflicts with an existing schedule');
    }
    
    const newSchedule = new Schedule({
      ptId: req.user.userId,
      studentId,
      date: new Date(date),
      startTime,
      endTime
    });
    await newSchedule.save();
    
    const scheduleWithDetails = await Schedule.findById(newSchedule._id)
      .populate('ptId', 'name')
      .populate('studentId', 'name');
    
    res.status(201).json(scheduleWithDetails);
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).send('Server error');
  }
});
// Get PT's schedules
app.get('/schedules', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    // Nếu là PT, lấy tất c lịch của PT đó
    if (user.role === 'PT') {
      const schedules = await Schedule.find({ ptId: req.user.userId })
        .populate('studentId', 'name')
        .sort({ date: 1, startTime: 1 });
      return res.json(schedules);
    }
    
    res.status(403).send('Access denied');
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).send('Server error');
  }
});

// Get student's schedules
app.get('/student-schedules', auth, async (req, res) => {
  try {
    const schedules = await Schedule.find({ studentId: req.user.userId })
      .populate('ptId', 'name')
      .sort({ date: 1, startTime: 1 }); // Sắp xếp theo ngày và giờ
    
    // Transform the data to include PT name
    const formattedSchedules = schedules.map(schedule => ({
      _id: schedule._id,
      date: schedule.date,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      status: schedule.status,
      ptName: schedule.ptId.name
    }));

    res.json(formattedSchedules);
  } catch (error) {
    console.error('Error fetching student schedules:', error);
    res.status(500).send('Server error');
  }
});

app.get('/schedules/range/:startDate/:endDate', auth, async (req, res) => {
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
});

app.get('/schedules/date/:date', auth, async (req, res) => {
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
});

// Update schedule status (accept/reject by student)
app.put('/schedules/:scheduleId', auth, async (req, res) => {
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
});

// Delete schedule (by PT only)
app.delete('/schedules/:scheduleId', auth, async (req, res) => {
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
});

// Get available time slots for a specific date (optional feature)
app.get('/available-slots/:date', auth, async (req, res) => {
  try {
    const { date } = req.params;
    
    // Get all schedules for the specified date
    const schedules = await Schedule.find({
      ptId: req.user.userId,
      date: new Date(date)
    });

    // Define your working hours (e.g., 9 AM to 5 PM)
    const workingHours = {
      start: '09:00',
      end: '17:00'
    };

    // Calculate available slots
    // This is a simplified version - you might want to make it more sophisticated
    const bookedSlots = schedules.map(schedule => ({
      start: schedule.startTime,
      end: schedule.endTime
    }));

    // Return available time slots
    res.json({
      workingHours,
      bookedSlots
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).send('Server error');
  }
});

// Get schedules for a specific date range (optional feature)
app.get('/schedules/range/:startDate/:endDate', auth, async (req, res) => {
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
});


//NUTRITION
app.post('/savemeals', auth, async (req, res) => {
  const { mealType, foods, date } = req.body;
  const userId = req.user.userId;

  try {
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

    // First, check if a meal of this type already exists for this date and user
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
      // If meal exists, update by adding new foods to existing array
      meal = await Meal.findByIdAndUpdate(
        existingMeal._id,
        {
          $push: { foods: { $each: foods } }
        },
        { new: true }
      );
    } else {
      console.log('Creating new meal for date:', parsedDate);
      // If meal doesn't exist, create new meal
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
    res.status(500).json({ message: 'Failed to save/update meal', error: error.message });
  }
});



// Lấy meal theo loại trong ngày
app.get('/meals/:date/:mealType', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { mealType } = req.params;
    const dateParam = new Date(req.params.date);

    // Tạo range để lấy meal trong ngày
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
});

// PT Plans
app.get('/pro-users', auth, async (req, res) => {
  try {
    const proUsers = await User.find({ role: 'premium' });
    res.json(proUsers);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new PT plan
// Thêm route để tạo PT plan mới
app.post('/pt-plans', auth, async (req, res) => {
  try {
    const {
      title,
      targetAudience,
      duration,
      students,
      exercises
    } = req.body;

    // Tạo cấu trúc weeks và days
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
            duration: ex.exercise.duration || 0,
            sets: ex.exercise.sets || 1,
            reps: ex.exercise.reps || 0,
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

    // Tạo student progress cho mỗi student được chọn
    const studentProgress = students.map(studentId => ({
      studentId,
      completedWorkouts: [],
      lastAccessed: new Date()
    }));

    const newPlan = new PTPlan({
      ptId: req.user.userId,
      title,
      targetAudience,
      duration,
      weeks,
      students: studentProgress,
    });

    await newPlan.save();
    res.status(201).json(newPlan);
  } catch (error) {
    console.error('Error creating PT plan:', error);
    res.status(500).json({ message: 'Error creating plan', error: error.message });
  }
});

// Cập nhật route lấy danh sách plans để populate thông tin student
app.get('/pt-plans', auth, async (req, res) => {
  try {
    const plans = await PTPlan.find({ ptId: req.user.userId })
      .populate('students.studentId', 'name email') // Populate thông tin student
      .populate('weeks.days.exercises.exerciseId'); // Populate thông tin exercise
    
    // Map data để client dễ sử dụng hơn
    const formattedPlans = plans.map(plan => ({
      _id: plan._id,
      title: plan.title,
      duration: plan.duration,
      targetAudience: plan.targetAudience,
      students: plan.students.map(student => ({
        ...student.toObject(),
        name: student.studentId?.name || 'Unknown Student',
        email: student.studentId?.email
      })),
      weeks: plan.weeks,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt
    }));

    res.json(formattedPlans);
  } catch (error) {
    console.error('Error fetching PT plans:', error);
    res.status(500).json({ message: 'Error fetching plans' });
  }
});

// Backend routes
app.get('/student-pt-plans', auth, async (req, res) => {
  try {
    // Tìm tất cả plans có chứa studentId của user hiện tại
    const plans = await PTPlan.find({
      'students.studentId': req.user.userId
    }).populate('ptId', 'name email'); // Populate thông tin PT

    // Format lại data trước khi gửi về client
    const formattedPlans = plans.map(plan => ({
      _id: plan._id,
      title: plan.title,
      subtitle: plan.title, // Có thể thay đổi nếu có trường subtitle riêng
      ptName: plan.ptId.name,
      targetAudience: plan.targetAudience,
      duration: plan.duration,
      weeks: plan.weeks,
      progress: plan.students.find(
        student => student.studentId.toString() === req.user.userId
      )?.completedWorkouts || []
    }));

    res.json(formattedPlans);
  } catch (error) {
    console.error('Error fetching student PT plans:', error);
    res.status(500).json({ message: 'Error fetching plans' });
  }
});

// Thêm route để lấy chi tiết của một plan
app.get('/student-pt-plans/:planId', auth, async (req, res) => {
  try {
    const plan = await PTPlan.findById(req.params.planId)
      .populate('ptId', 'name email')
      .populate('weeks.days.exercises.exerciseId');
      
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    // Kiểm tra xem user có quyền truy cập plan này không 
    const isStudent = plan.students.some(
      student => student.studentId.toString() === req.user.userId
    );

    if (!isStudent) {
      return res.status(403).json({ message: 'Not authorized to view this plan' });
    }

    res.json(plan);
  } catch (error) {
    console.error('Error fetching PT plan details:', error);
    res.status(500).json({ message: 'Error fetching plan details' });
  }
});

// VNPAY Payment Routes
const qs = require('qs');

// Hàm sắp xếp object theo key
function sortObject(obj) {
    let sorted = {};
    let str = [];
    let key;
    for (key in obj){
        if (obj.hasOwnProperty(key)) {
            str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}

// Create payment route
app.post('/create-payment', auth, async (req, res) => {
  try {
    const ipAddr = req.headers['x-forwarded-for'] ||
        req.socket.remoteAddress || '127.0.0.1';

    const date = new Date();
    const createDate = moment(date).format('YYYYMMDDHHmmss');
    const orderId = moment(date).format('HHmmss');

    // Lấy thông tin từ request body
    const { amount, duration, bankCode } = req.body;
    const amountInVND = Math.round(amount);

    // Tạo orderInfo với format mới bao gồm duration và userId
    const orderInfo = `Premium Plan ${duration} Months_${req.user.userId}`;

    let vnp_Params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: process.env.VNP_TMN_CODE,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: 'other',
      vnp_Amount: amountInVND * 100,
      vnp_ReturnUrl: `${process.env.FRONTEND_URL}/vnpay-return`,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate
    };

    if (bankCode) {
      vnp_Params['vnp_BankCode'] = bankCode;
    }

    vnp_Params = sortObject(vnp_Params);

    const signData = querystring.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac("sha512", process.env.VNP_HASH_SECRET);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
    
    vnp_Params['vnp_SecureHash'] = signed;
    
    const paymentUrl = `${process.env.VNP_URL}?${querystring.stringify(vnp_Params, { encode: false })}`;

    res.json({ paymentUrl });
  } catch (error) {
    console.error('Payment Error:', error);
    res.status(500).json({ 
      message: 'Failed to create payment URL',
      error: error.message 
    });
  }
});

// VNPAY IPN (Instant Payment Notification)
app.get('/vnpay-ipn', async (req, res) => {
  try {
    const vnpParams = req.query;
    const secureHash = vnpParams.vnp_SecureHash;

    // Remove hash from params
    delete vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHashType;

    // Sort parameters
    const sortedParams = {};
    Object.keys(vnpParams).sort().forEach(key => {
      sortedParams[key] = vnpParams[key];
    });

    // Verify signature
    const signData = querystring.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac('sha256', process.env.VNP_HASH_SECRET);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    if (secureHash === signed) {
      const rspCode = vnpParams.vnp_ResponseCode;

      if (rspCode === '00') {
        const orderInfo = vnpParams.vnp_OrderInfo;
        const [planInfo, userId] = orderInfo.split('_');
        const duration = parseInt(planInfo.match(/\d+/)[0]);
        
        const expireDate = moment().add(duration, 'months').toDate();

        console.log('Updating user premium status:', {
          userId,
          duration,
          expireDate
        });

        const updatedUser = await User.findByIdAndUpdate(
          userId, 
          {
            role: 'premium',
            premiumExpireDate: expireDate
          },
          { new: true }
        );

        console.log('Updated user:', {
          userId: updatedUser._id,
          newRole: updatedUser.role,
          newExpireDate: updatedUser.premiumExpireDate
        });

        res.status(200).json({ RspCode: '00', Message: 'Success' });
      } else {
        res.status(200).json({ RspCode: rspCode, Message: 'Payment failed' });
      }
    } else {
      res.status(200).json({ RspCode: '97', Message: 'Invalid signature' });
    }
  } catch (error) {
    console.error('IPN Error:', error);
    res.status(500).json({ RspCode: '99', Message: 'Internal server error' });
  }
});

// VNPAY Return URL handler
app.get('/vnpay-return', async (req, res) => {
  try {
    const vnpParams = req.query;
    const secureHash = vnpParams.vnp_SecureHash;

    delete vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHashType;

    const sortedParams = {};
    Object.keys(vnpParams).sort().forEach(key => {
      sortedParams[key] = vnpParams[key];
    });

    const signData = querystring.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac('sha512', process.env.VNP_HASH_SECRET);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    if (secureHash === signed) {
      const rspCode = vnpParams.vnp_ResponseCode;
      
      if (rspCode === '00') {
        const orderInfo = vnpParams.vnp_OrderInfo;
        const [planInfo, userId] = orderInfo.split('_');
        const duration = parseInt(planInfo.match(/\d+/)[0]);

        if (userId) {
          const expireDate = moment().add(duration, 'months').toDate();
          
          await User.findByIdAndUpdate(userId, {
            role: 'premium',
            premiumExpireDate: expireDate
          });

          console.log('Updated user premium status:', {
            userId,
            role: 'premium',
            expireDate
          });
        }

        res.json({
          status: 'success',
          code: rspCode,
          message: 'Payment successful'
        });
      } else {
        res.json({
          status: 'error',
          code: rspCode,
          message: 'Payment failed'
        });
      }
    } else {
      res.json({
        status: 'error',
        code: '97',
        message: 'Invalid signature'
      });
    }
  } catch (error) {
    console.error('Return URL Error:', error);
    res.status(500).json({
      status: 'error',
      code: '99',
      message: 'Internal server error'
    });
  }
});

// Thêm API để lấy thông tin premium
app.get('/premium-status', auth, checkPremiumExpiration, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      role: user.role,
      premiumExpireDate: user.premiumExpireDate,
      daysRemaining: user.premiumExpireDate ? 
        moment(user.premiumExpireDate).diff(moment(), 'days') : 0
    });
  } catch (error) {
    console.error('Error getting premium status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Thêm route để cập nhật role
app.post('/update-user-role', auth, async (req, res) => {
  try {
    const { orderInfo } = req.body;
    const [planInfo, userId] = orderInfo.split('_');
    const duration = parseInt(planInfo.match(/\d+/)[0]);
    const expireDate = moment().add(duration, 'months').toDate();

    console.log('Updating user role:', {
      userId,
      planInfo,
      duration,
      expireDate
    });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        role: 'premium',
        premiumExpireDate: expireDate
      },
      { new: true }
    );

    console.log('User updated:', {
      id: updatedUser._id,
      role: updatedUser.role,
      expireDate: updatedUser.premiumExpireDate
    });

    res.json({
      message: 'User role updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Failed to update user role' });
  }
});

