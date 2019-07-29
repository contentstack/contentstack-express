/*!
 * contentstack-express
 * Copyright (c) Contentstack
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */
var config = require('./config'),
  db = require('./db'),
  context = require('./context'),
  logger = require('./logger'),
  plugin = require('./plugin');
var providers = require('./db/providers');
var utils = module.exports = {};

// export configuration
utils.config = config;

// expose database methods
utils.db = db;

// expose provider
utils.providers = providers;

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

// debugger for users
// utils.debug = logger({
//   console: config.get('logs.console'),
//   type: 'application',
//   level: 'info',
//   json: config.get('logs.json') || false,
//   path: config.get('path.logs')
// });

utils.debug = logger({
  console: config.get('logs.console'),
  type: 'application',
  path: config.get('path.logs')
});

// plugin
utils.plugin = plugin;