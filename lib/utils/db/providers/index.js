/*!
 * contentstack-express
 * copyright (c) Built.io Contentstack
 * MIT Licensed
 */

'use strict';

/**
 * Module Dependencies.
 */
var config = require('./../../config/index');

var dataStore = function () {
    var cache = config.get('cache'),
        storageType = (cache) ? "nedb" : "FileSystem";
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
