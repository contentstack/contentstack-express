/*!
 * contentstack-express
 * copyright (c) Built.io Contentstack
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */
var EventEmitter = require('events').EventEmitter,
	express = require('express'),
	_ = require('lodash'),
	proto = require('./application'),
	sync = require('./../sync/index');

var req = express.request,
	res = express.response;

var contentstack = module.exports = createApplication;

/**
 * Override contentstack() and provide custom app instance
 */
function createApplication() {
	var app = function (req, res, next) {
		app.handle(req, res, next);
	};

	app = _.merge(app, EventEmitter.prototype);
	app = _.merge(app, proto);

	app.request = {__proto__: req, app: app};
	app.response = {__proto__: res, app: app};
	app.fuse();

	sync();

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

