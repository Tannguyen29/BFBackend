const moment = require('moment');
const User = require('../models/user');

const checkPremiumExpiration = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    console.log('Checking premium expiration:', {
      userId: user._id,
      currentRole: user.role,
      expireDate: user.premiumExpireDate,
      hasExpired: user.premiumExpireDate ? moment().isAfter(user.premiumExpireDate) : false
    });
    
    if (user && user.role === 'premium') {
      if (!user.premiumExpireDate) {
        console.log('Premium user without expireDate, updating to free');
        user.role = 'free';
        await user.save();
      } else if (moment().isAfter(user.premiumExpireDate)) {
        console.log('Premium expired, updating to free');
        user.role = 'free';
        user.premiumExpireDate = null;
        await user.save();
      }
    }
    next();
  } catch (error) {
    console.error('Error checking premium expiration:', error);
    next();
  }
};

module.exports = checkPremiumExpiration;