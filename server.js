'use strict';
const dotenv = require('dotenv');

dotenv.config({ path: './config.env'});
const app = require('./app');

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

process.on('SIGTERM', () => {
  console.log("**************SIGTERM RECEIVED**************\nSutting down gracefully");
  server.close(() => {
    console.log("XXXX Process terminated XXXX");
  });
})