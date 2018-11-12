/*!
 * contentstack-express
 * copyright (c) Contentstack
 * MIT Licensed
 */

'use strict';

/**
 * Module Dependencies.
 */
var config = require('../../config'),
    cache = config.get('cache'),
    storageType = (cache && process.env.SYNC !== 'false') ? 'nedb': 'FileSystem';
var dataStore = function () {
    try {
        return require('./' + storageType);
    } catch (e) {
        console.error("Error in datastore loading ...", e.message);
    }
};

/**
 * Expose `dataStore()`.
 */
module.exports = dataStore();
