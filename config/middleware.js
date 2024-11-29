const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const corsOptions = require('./cors');


module.exports = function(app) {
  // CORS
  app.use(cors(corsOptions));
  
  // Body Parser
  app.use(bodyParser.json({limit: '50mb'}));
  app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
  
  // Express JSON
  app.use(express.json());
  app.use(express.urlencoded({extended: true}));
};
