const { removeExpiredBanners } = require('../controllers/bannerController');

// Run removeExpiredBanners every day at midnight
const initScheduledTasks = () => {
  setInterval(removeExpiredBanners, 24 * 60 * 60 * 1000);
};

module.exports = initScheduledTasks; 