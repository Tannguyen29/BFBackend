const otpEmailTemplate = (otp, name) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Bro Fitness</title>
    <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; background-color: white; padding: 20px; }
        .header { display: flex; align-items: center; margin-bottom: 20px; }
        .logo { width: 40px; height: 40px; margin-right: 10px; }
        .shop-name { font-size: 24px; font-weight: bold; }
        .content { margin-bottom: 20px; }
        .otp-box { background-color: #e8f5e9; border: 1px solid #4caf50; color: #4caf50; padding: 10px; margin: 20px 0; font-size: 24px; text-align: center; }
        .footer { margin-top: 20px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
        .footer a { color: #1a73e8; text-decoration: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://i.ibb.co/5xGkYsW/gymLogo.png" alt="Bro Fitness Logo" class="logo">
            <span class="shop-name">Bro Fitness</span>
        </div>
        <div class="content">
            <p>Hello ${name},</p>
            <p>You have received an OTP confirmation code at BroFitness app</p>
            <div class="otp-box">
                ${otp}
            </div>
            <p>If you did not make this request, please ignore it or contact us <a href="#">immediately</a> if you need assistance.</p>
        </div>
        <div class="footer">
            <p>Best regards,<br>Bro Fitness Corp</p>
            <p>
                Fanpage @ <a href="#">Bro Fitness - Official</a><br>
                Group @ <a href="#">Bro Fitness Community</a><br>
                Hotline: 1900 633 305
            </p>
            <p><a href="#">Need immediate support?</a></p>
        </div>
    </div>
</body>
</html>
`;

module.exports = otpEmailTemplate;