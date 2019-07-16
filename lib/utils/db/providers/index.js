/*!
 * contentstack-express
 * Copyright (c) Contentstack
 * MIT Licensed
 */
'use strict';
/**
 * Module Dependencies.
 */
var config = require('../../config');
var cache = config.get('cache');
var storageType = (cache && process.env.SYNC !== 'false') ? 'nedb' : 'FileSystem';
var dataStore = function() {
  try {
    return require('./' + storageType);
  } catch (e) {
    throw new Error(`Error in loading db\n${e.message || e}`);
  }
};
/**
 * Expose `dataStore()`.
 */
module.exports = dataStore();