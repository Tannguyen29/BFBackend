const crypto = require('crypto');
const moment = require('moment');
const querystring = require('querystring');

// Sort object by key
exports.sortObject = (obj) => {
    let sorted = {};
    let str = [];
    let key;
    for (key in obj){
        if (obj.hasOwnProperty(key)) {
            str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
};

// Create VNPAY parameters
exports.createVnpayParams = (amount, duration, userId, ipAddr) => {
    const date = new Date();
    const createDate = moment(date).format('YYYYMMDDHHmmss');
    const orderId = moment(date).format('HHmmss');
    const amountInVND = Math.round(amount);
    const orderInfo = `Premium Plan ${duration} Months_${userId}`;

    // Hardcode ReturnUrl để đảm bảo đúng định dạng
    const returnUrl = 'http://192.168.2.28:5000/vnpay_return';

    return {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: process.env.VNP_TMN_CODE,
        vnp_Locale: 'vn',
        vnp_CurrCode: 'VND',
        vnp_TxnRef: orderId,
        vnp_OrderInfo: orderInfo,
        vnp_OrderType: 'other',
        vnp_Amount: amountInVND * 100,
        vnp_ReturnUrl: returnUrl,  // Sử dụng URL đã được định nghĩa
        vnp_IpAddr: ipAddr,
        vnp_CreateDate: createDate
    };
};

// Verify VNPAY hash
exports.verifyVnpayHash = (vnpParams) => {
    const secureHash = vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHashType;

    const sortedParams = {};
    Object.keys(vnpParams).sort().forEach(key => {
        sortedParams[key] = vnpParams[key];
    });

    const signData = querystring.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac('sha512', process.env.VNP_HASH_SECRET);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    return { isValid: secureHash === signed, sortedParams };
}; 