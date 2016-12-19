/*!
 * contentstack-express
 * copyright (c) Built.io Contentstack
 * MIT Licensed
 */

'use strict';

/**
 * Module dependencies.
 */
var dataStore = require('./query-builder/index'),
	cache = require('./inmemory/index');
/**
 * Expose `dataStore()`.
 */
exports = module.exports = new dataStore();
