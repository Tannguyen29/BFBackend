const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const crypto = require('crypto');
const Exercise = require('./models/exercise');
const Plan = require('./models/plan');

const transporter = require('./config/nodemailer');

const User = require('./models/user');
const auth = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

const otpEmailTemplate = require('./otpEmailTemplate.jsx');

const mongoUri = process.env.MONGO_URI || 'your-mongodb-uri-here';

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Middleware
app.use(cors());
app.use(bodyParser.json());

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
    physicalActivityLevel,
    fitnessGoal,
    healthIssues,
    equipment,
    experienceLevel,
    bodyParts
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
      physicalActivityLevel,
      fitnessGoal,
      healthIssues,
      equipment,
      experienceLevel,
      bodyParts
    };
    user.personalInfoCompleted = true;
    await user.save();

    res.status(200).send('Personal information saved successfully');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error saving personal information');
  }
});

// Create a new exercise
app.post('/exercises',  async (req, res) => {
  try {
    const exercise = new Exercise(req.body);
    await exercise.save();
    res.status(201).send(exercise);
  } catch (error) {
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
app.patch('/exercises/:id', async (req, res) => {
  try {
    const exercise = await Exercise.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!exercise) {
      return res.status(404).send();
    }
    res.send(exercise);
  } catch (error) {
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

// Get all users (for debugging)
app.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).select('-password -otp -otpExpires');
    res.send(users);
  } catch (error) {
    res.status(500).send();
  }
});

// Create a new plan
app.post('/plans', async (req, res) => {
  try {
    const plan = new Plan(req.body);
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


// Get all plans
app.get('/plans', async (req, res) => {
  try {
    const plans = await Plan.find({});
    res.send(plans);
  } catch (error) {
    res.status(500).send();
  }
});

// Update a plan
app.patch('/plans/:id', async (req, res) => {
  try {
    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!plan) {
      return res.status(404).send();
    }
    res.send(plan);
  } catch (error) {
    res.status(400).send(error);
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

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
