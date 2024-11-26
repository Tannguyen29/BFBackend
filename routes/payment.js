const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkPremiumExpiration = require('../middleware/checkPremiumExpiration');
const paymentController = require('../controllers/paymentController');

// Create payment URL
router.post('/create-payment', auth, paymentController.createPayment);

// VNPAY IPN handler
router.get('/vnpay-ipn', paymentController.handleVNPayIPN);

// VNPAY Return URL handler
router.get('/vnpay-return', paymentController.handleVNPayReturn);

// Get premium status
router.get('/premium-status', auth, checkPremiumExpiration, paymentController.getPremiumStatus);

// Update user role
router.post('/update-user-role', auth, paymentController.updateUserRole);

module.exports = router; 