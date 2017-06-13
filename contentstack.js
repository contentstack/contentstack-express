/*!
 * contentstack-express
 * copyright (c) Built.io Contentstack
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */
var framework = require('./lib/framework/index'),
	utils = require('./lib/utils/index');

/**
 * @method config
 * @description Get configuration using get() method.
 */
framework.config = utils.config;

/**
 * @method Stack
 * @description SDK for CRUD operations, i.e. find(), findOne(), insert(), upsert() and remove().
 */
framework.Stack = function() {
	return utils.db;
}

/**
 * @method logger
 * @description Add debug logs such as info(), warn(), error(), etc.
 */
framework.logger = utils.debug;

/**
 * Expose framework
 */
module.exports = framework;
