const corsOptions = {
  origin: [
    '*',
    'http://192.168.2.28:3000',
    'http://192.168.2.28:5000',
    'https://bfbackend-mdhk.onrender.com',
    // Thêm domain của frontend nếu có
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'x-auth-token', 
    'Authorization',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Headers',
    'Access-Control-Allow-Methods'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  preflightContinue: false
};

module.exports = corsOptions; 