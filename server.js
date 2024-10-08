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

const transporter = require('./config/nodemailer');

const User = require('./models/user');
const auth = require('./middleware/auth');
const Banner = require('./models/banner.js');

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

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Middleware
app.use(cors());
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

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

    const user = new User({ name, email, password: hashedPassword, otp, otpExpires });
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
    const otpExpires = Date.now() + 10 * 60 * 1000;  // OTP hết hạn sau 10 phút

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

app.get('/user-info', auth, async (req, res) => {
  const { userId } = req.user;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }
    res.json({
      name: user.name,
      personalInfo: user.personalInfo,
      personalInfoCompleted: user.personalInfoCompleted,
      avatarUrl: user.avatarUrl
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching user information');
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
