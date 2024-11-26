const User = require('../models/user');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const transporter = require('../config/nodemailer');
const otpEmailTemplate = require('../otpEmailTemplate.jsx');

// Sign in
exports.signin = async (req, res) => {
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
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET || 'secret_key'
    );
    res.send({ 
      token, 
      name: user.name || email, 
      personalInfoCompleted: user.personalInfoCompleted 
    });
  } catch (err) {
    res.status(500).send('Error signing in');
  }
};

// Sign up
exports.signup = async (req, res) => {
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

    const user = new User({ 
      name, 
      email, 
      password: hashedPassword, 
      otp, 
      otpExpires, 
      role: 'free' 
    });
    await user.save();

    await sendOTPEmail(email, otp);
    res.status(201).send('User registered successfully. Please check your email for the OTP.');
  } catch (err) {
    res.status(400).send('Error registering user');
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  const { email, newPassword, confirmPassword } = req.body;
  if (newPassword !== confirmPassword) {
    return res.status(400).send('Passwords do not match');
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).send('User not found');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    res.status(200).send('Password reset successfully');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error resetting password');
  }
};

// Send OTP
exports.sendOTP = async (req, res) => {
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

    await sendOTPEmail(email, otp, user.name);
    res.status(200).send('OTP sent successfully');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error sending OTP');
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
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
};

// Resend OTP
exports.resendOTP = async (req, res) => {
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

    await sendOTPEmail(email, newOtp, user.name);
    res.status(200).send('New OTP sent successfully');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error resending OTP');
  }
};

// Helper function for sending OTP emails
const sendOTPEmail = async (email, otp, name = '') => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP Code - Bro Fitness',
    html: otpEmailTemplate(otp, name)
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        reject(error);
      } else {
        console.log('OTP email sent: %s', info.messageId);
        resolve(info);
      }
    });
  });
}; 