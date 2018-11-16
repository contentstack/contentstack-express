/*!
 * contentstack-express
 * copyright (c) Contentstack
 * MIT Licensed
 */

'use strict';

/**
 * Module dependencies.
 */
var dataStore = require('./query-builder');
var cache = require('./inmemory');

/**
 * Expose `dataStore()`.
 */
module.exports = new dataStore();
