const corsOptions = {
  origin: ['*', 'http://192.168.2.28:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'x-auth-token', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

module.exports = corsOptions; 