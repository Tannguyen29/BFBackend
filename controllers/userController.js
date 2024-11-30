const User = require('../models/user');
const cloudinary = require('../config/cloudinary');
const moment = require('moment');
const Schedule = require('../models/schedule');

// Setup personal information
exports.setupPersonalInfo = async (req, res) => {
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
};

// Get user information
exports.getUserInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Full user object:', user);
    console.log('PT ID in getUserInfo:', user.ptId);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      ptId: user.ptId,
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
};

// Update user information
exports.updateUserInfo = async (req, res) => {
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
};

// Upload avatar
exports.uploadAvatar = async (req, res) => {
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
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password -otp -otpExpires');
    res.send(users);
  } catch (error) {
    res.status(500).send();
  }
};

// Get all students
exports.getStudents = async (req, res) => {
  try {
    const students = await User.find({ role: 'free' }, 'name');
    res.json(students);
  } catch (error) {
    console.error('Error getting students:', error);
    res.status(500).send('Server error');
  }
};

// Get PT's students
exports.getPTStudents = async (req, res) => {
    try {
        // Kiểm tra người dùng hiện tại có phải PT không
        const pt = await User.findById(req.user.userId);
        if (pt.role !== 'PT') {
            return res.status(403).json({ message: 'Only PTs can access their students list' });
        }

        // Tìm tất cả user có role là premium và có ptId trỏ đến PT hiện tại
        const students = await User.find({
            role: 'premium',
            ptId: req.user.userId
        }).select('name email ');

        if (!students) {
            return res.json([]);
        }

        res.json(students);
    } catch (error) {
        console.error('Error fetching PT students:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get user by ID
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('name email role'); // Chỉ lấy các trường cần thiết

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Error getting user by ID:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getPTStudentsWithSchedules = async (req, res) => {
    try {
        const pt = await User.findById(req.user.userId);
        if (pt.role !== 'PT') {
            return res.status(403).json({ message: 'Only PTs can access their students list' });
        }

        // Tìm students của PT
        const students = await User.find({
            role: 'premium',
            ptId: req.user.userId
        }).select('name email isPremium');

        // Lấy thêm thông tin schedule cho mỗi student
        const studentsWithSchedules = await Promise.all(
            students.map(async (student) => {
                const schedules = await Schedule.find({
                    ptId: req.user.userId,
                    studentId: student._id
                }).select('date startTime endTime');

                return {
                    ...student.toObject(),
                    schedules
                };
            })
        );

        res.json(studentsWithSchedules);
    } catch (error) {
        console.error('Error fetching PT students with schedules:', error);
        res.status(500).json({ message: 'Server error' });
    }
};