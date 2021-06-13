'use strict';
const express = require('express');
const helmet = require('helmet');
const bodyParser = require('body-parser');

const genericRouter = require('./genericRoutes');
const app = express();

app.use(helmet());
//app.use(express.json({ limit: '10kb' }));
app.use(bodyParser.json())
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use('/', genericRouter);

module.exports = app;