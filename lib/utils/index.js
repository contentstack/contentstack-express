/*!
 * contentstack-sync
 * copyright (c) Contentstack.com
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */
let context = require('./context');
let logger = require('./logger');
let config = require('./../config')();
let utils = module.exports = {};

// context
utils.context = context;

// request access logger
utils.access = logger({
    console: config.get('logs.console'),
    type: 'access',
    path: config.get('path.logs')
});

// sync logger
utils.sync = logger({
    console: config.get('logs.console'),
    type: 'sync',
    path: config.get('path.logs')
});