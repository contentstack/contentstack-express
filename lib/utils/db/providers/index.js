/*!
 * contentstack-express
 * copyright (c) Built.io Contentstack
 * MIT Licensed
 */

'use strict';

/**
 * Module Dependencies.
 */
var config = require('../../config'),
    cache = config.get('cache'),
    storageType = (cache === true && process.env.SYNC !== 'false') ? 'nedb': 'FileSystem';
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
