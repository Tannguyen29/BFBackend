const Banner = require('../models/banner');
const cloudinary = require('../config/cloudinary');

// Create a new banner
exports.createBanner = async (req, res) => {
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
};

// Update a banner
exports.updateBanner = async (req, res) => {
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
};

// Get all banners
exports.getAllBanners = async (req, res) => {
  try {
    const banners = await Banner.find({});
    res.send(banners);
  } catch (error) {
    res.status(500).send();
  }
};

// Delete a banner
exports.deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) {
      return res.status(404).send();
    }
    res.send(banner);
  } catch (error) {
    res.status(500).send();
  }
};

// Auto remove expired banners
exports.removeExpiredBanners = async () => {
  const currentDate = new Date();
  await Banner.deleteMany({ expiryDate: { $lt: currentDate } });
}; 