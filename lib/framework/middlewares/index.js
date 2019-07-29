/*!
 * contentstack-express
 * Copyright (c) Contentstack
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */
var domainContext = require('./domain-context'),
  init = require('./init'),
  boot = require('./boot'),
  responseTime = require('./response-time'),
  poweredBy = require('./powered-by'),
  requestLogger = require('./request-logger'),
  slashes = require('./connect-slashes'),
  smug = require('./smug'),
  matrix = require('./matrix'),
  errorHandler = require('./error-handler');

// domain-context
exports.domainContext = domainContext;
// init
exports.init = init;
// boot
exports.boot = boot;
// response-time
exports.responseTime = responseTime;
// powered-by
exports.poweredBy = poweredBy;
// request-logger
exports.requestLogger = requestLogger;
// connect-slash
exports.slashes = function(append, opt) {
  return slashes.call(null, append, opt);
};
// content-negotiation
exports.smug = smug;
// template-manager
exports.matrix = matrix;
// not-found
exports.notFound = function() {
  return function notFound(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  };
};

// error-handler
exports.errorHandler = errorHandler;