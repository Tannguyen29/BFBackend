const express = require('express');
const cors = require('cors');
const corsOptions = require('./cors');
const bodyParser = require('body-parser');

module.exports = function(app) {
  app.use(cors(corsOptions));
  
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (corsOptions.origin.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token');
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
  });

  app.use(bodyParser.json({limit: '50mb'}));
  app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
  app.use(express.json());
  
};
