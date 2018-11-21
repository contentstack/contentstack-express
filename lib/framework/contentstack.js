/*!
 * contentstack-express
 * copyright (c) Contentstack
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */

var EventEmitter = require('events').EventEmitter;
var express = require('express');
var _ = require('lodash');
var proto = require('./application');
var sync = require('../sync');
var req = express.request;
var res = express.response;
var contentstack = module.exports = createApplication;

/**
 * Override contentstack() and provide custom app instance
 */
function createApplication() {
  var app = function(req, res, next) {
    app.handle(req, res, next);
  };
  app = _.merge(app, EventEmitter.prototype);
  app = _.merge(app, proto);
  app.request = {
    __proto__: req,
    app: app
  };
  app.response = {
    __proto__: res,
    app: app
  };
  app.fuse();
  // Load `SYNC` only if it hasn't been explicitly stated
  if (process.env.SYNC !== 'false') {
    sync();
  }
  return app;
}

/**
 * Expose the prototypes.
 */
contentstack.application = proto;
contentstack.request = req;
contentstack.response = res;
/**
 * Expose router
 */
contentstack.Router = require('./router');
contentstack.Route = express.Route;
/**
 * Expose middleware
 */
contentstack.query = express.query;
contentstack.static = express.static;