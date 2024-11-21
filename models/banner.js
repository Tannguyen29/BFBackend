const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  expiryDate: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

const Banner = mongoose.model('Banner', bannerSchema);

module.exports = Banner;