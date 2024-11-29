const User = require('../models/user');
const Notification = require('../models/notification');
const moment = require('moment');
const crypto = require('crypto');
const { createVnpayParams, verifyVnpayHash, sortObject } = require('../utils/vnpayUtils');
const querystring = require('querystring');
const mongoose = require('mongoose');

// Create payment URL
exports.createPayment = async (req, res) => {
    try {
        const { amount, duration } = req.body;
        console.log('Request data:', { amount, duration });

        const ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        console.log('IP Address:', ipAddr);

        let vnp_Params = createVnpayParams(amount, duration, req.user.userId, ipAddr);
        console.log('VNPAY Parameters:', vnp_Params);
        
        vnp_Params = sortObject(vnp_Params);
        const signData = Object.entries(vnp_Params)
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join('&');
            
        const hmac = crypto.createHmac("sha512", process.env.VNP_HASH_SECRET);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
        
        vnp_Params['vnp_SecureHash'] = signed;
        const paymentUrl = `${process.env.VNP_URL}?${Object.entries(vnp_Params)
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join('&')}`;
        
        console.log('Final Payment URL:', paymentUrl);

        res.json({ paymentUrl });
    } catch (error) {
        console.error('Payment Error:', error);
        res.status(500).json({ 
            message: 'Failed to create payment URL', 
            error: error.message 
        });
    }
};

// Handle VNPAY IPN
exports.handleVNPayIPN = async (req, res) => {
    try {
        const { isValid, sortedParams } = verifyVnpayHash(req.query);

        if (isValid) {
            const rspCode = sortedParams.vnp_ResponseCode;
            if (rspCode === '00') {
                const orderInfo = sortedParams.vnp_OrderInfo;
                const [planInfo, userId] = orderInfo.split('_');
                const duration = parseInt(planInfo.match(/\d+/)[0]);
                const expireDate = moment().add(duration, 'months').toDate();

                const updatedUser = await User.findByIdAndUpdate(
                    userId,
                    {
                        role: 'premium',
                        premiumExpireDate: expireDate
                    },
                    { new: true }
                );

                console.log('Updated user:', {
                    userId: updatedUser._id,
                    newRole: updatedUser.role,
                    newExpireDate: updatedUser.premiumExpireDate
                });

                res.status(200).json({ RspCode: '00', Message: 'Success' });
            } else {
                res.status(200).json({ RspCode: rspCode, Message: 'Payment failed' });
            }
        } else {
            res.status(200).json({ RspCode: '97', Message: 'Invalid signature' });
        }
    } catch (error) {
        console.error('IPN Error:', error);
        res.status(500).json({ RspCode: '99', Message: 'Internal server error' });
    }
};

// Handle VNPAY Return
exports.handleVNPayReturn = async (req, res) => {
    try {
        const { isValid, sortedParams } = verifyVnpayHash(req.query);

        if (isValid) {
            const rspCode = sortedParams.vnp_ResponseCode;
            if (rspCode === '00') {
                const orderInfo = sortedParams.vnp_OrderInfo;
                const [planInfo, userId] = orderInfo.split('_');
                const duration = parseInt(planInfo.match(/\d+/)[0]);

                if (userId) {
                    const expireDate = moment().add(duration, 'months').toDate();
                    await User.findByIdAndUpdate(userId, {
                        role: 'premium',
                        premiumExpireDate: expireDate
                    });
                }

                res.json({
                    status: 'success',
                    code: rspCode,
                    message: 'Payment successful'
                });
            } else {
                res.json({
                    status: 'error',
                    code: rspCode,
                    message: 'Payment failed'
                });
            }
        } else {
            res.json({
                status: 'error',
                code: '97',
                message: 'Invalid signature'
            });
        }
    } catch (error) {
        console.error('Return URL Error:', error);
        res.status(500).json({
            status: 'error',
            code: '99',
            message: 'Internal server error'
        });
    }
};

// Get premium status
exports.getPremiumStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            role: user.role,
            premiumExpireDate: user.premiumExpireDate,
            daysRemaining: user.premiumExpireDate ? 
                moment(user.premiumExpireDate).diff(moment(), 'days') : 0
        });
    } catch (error) {
        console.error('Error getting premium status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Update user role and assign PT
exports.updateUserRoleAndAssignPT = async (req, res) => {
    try {
        const { orderInfo } = req.body;
        console.log('1. Received orderInfo:', orderInfo);

        if (!orderInfo) {
            return res.status(400).json({ message: 'orderInfo is required' });
        }

        // Parse orderInfo
        const [planInfo, userId] = orderInfo.split('_');
        console.log('2. Parsed info:', { planInfo, userId });

        // Validate userId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }

        // Extract duration
        const durationMatch = planInfo.match(/(\d+)\s*Months?/i);
        if (!durationMatch) {
            return res.status(400).json({ message: 'Invalid plan duration format' });
        }
        const duration = parseInt(durationMatch[1]);
        const expireDate = moment().add(duration, 'months').toDate();
        console.log('3. Duration and expireDate:', { duration, expireDate });

        // Find available PTs
        const personalTrainers = await User.find({ role: 'PT' });
        console.log('4. Found PTs:', personalTrainers.length, 'trainers');

        // Update user without PT first if no PTs available
        const updateData = {
            role: 'premium',
            premiumExpireDate: expireDate
        };

        if (personalTrainers.length > 0) {
            // Randomly select a PT if available
            const randomPT = personalTrainers[Math.floor(Math.random() * personalTrainers.length)];
            console.log('5. Selected PT:', randomPT._id);
            updateData.ptId = randomPT._id;
        }

        // Update user
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        console.log('6. Updated user:', updatedUser);

        // Create notification only if PT was assigned
        if (updateData.ptId) {
            const notification = new Notification({
                recipient: updateData.ptId,
                student: userId,
                type: 'NEW_STUDENT',
                message: `Bạn có học viên mới: ${updatedUser.name}`
            });
            await notification.save();
            console.log('7. Created notification:', notification);

            // Update PT's notification status
            await User.findByIdAndUpdate(
                updateData.ptId,
                { hasUnreadNotification: true },
                { new: true }
            );
            console.log('8. Updated PT notification status');
        }

        // Return success response
        res.json({
            success: true,
            message: personalTrainers.length > 0 
                ? 'User role updated and PT assigned successfully'
                : 'User role updated successfully (No PT available)',
            user: {
                role: updatedUser.role,
                premiumExpireDate: updatedUser.premiumExpireDate,
                ptId: updatedUser.ptId
            }
        });

    } catch (error) {
        console.error('Error in updateUserRoleAndAssignPT:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to update user role and assign PT',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};