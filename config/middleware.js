const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const corsOptions = require('./cors');

module.exports = function(app) {
  // CORS pre-flight
  app.options('*', cors(corsOptions));
  
  // CORS
  app.use(cors(corsOptions));
  
  // Additional CORS headers
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, x-auth-token, Authorization');
    next();
  });
  
  // Body Parser
  app.use(bodyParser.json({limit: '50mb'}));
  app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
  
  // Express JSON
  app.use(express.json());
  app.use(express.urlencoded({extended: true}));
};
