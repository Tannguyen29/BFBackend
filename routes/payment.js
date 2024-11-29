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

// Update user role and assign PT
router.post('/update-user-role-and-pt', auth, paymentController.updateUserRoleAndAssignPT);

router.get('/vnpay_return', function (req, res, next) {
    try {
        const vnp_Params = req.query;
        console.log('Return Params:', vnp_Params);

        const secureHash = vnp_Params['vnp_SecureHash'];
        delete vnp_Params['vnp_SecureHash'];
        delete vnp_Params['vnp_SecureHashType'];

        // Verify hash
        const { isValid } = verifyVnpayHash(vnp_Params);
        
        if (isValid) {
            // Xử lý response thành công
            res.json({ 
                code: vnp_Params['vnp_ResponseCode'],
                message: 'Success'
            });
        } else {
            res.json({ 
                code: '97',
                message: 'Invalid Signature'
            });
        }
    } catch (error) {
        console.error('VNPAY Return Error:', error);
        res.status(500).json({ 
            code: '99',
            message: 'Internal Server Error'
        });
    }
});

module.exports = router; 