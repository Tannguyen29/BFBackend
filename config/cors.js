const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://192.168.2.28:3000',
    'http://192.168.2.28:5173',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization',
    'x-auth-token'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

module.exports = corsOptions; 