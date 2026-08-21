require('dotenv').config({ override: true });
const path = require('path');

module.exports = {
  paths: {
    logFile: path.join(__dirname, '..', 'logs', 'app.log'),
  },
  logLevel: process.env.LOG_LEVEL || 'info',
};
