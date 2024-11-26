const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const bannerController = require('../controllers/bannerController');

// Create a new banner
router.post('/', upload.single('image'), bannerController.createBanner);

// Update a banner
router.put('/:id', upload.single('image'), bannerController.updateBanner);

// Get all banners
router.get('/', bannerController.getAllBanners);

// Delete a banner
router.delete('/:id', bannerController.deleteBanner);

module.exports = router; 