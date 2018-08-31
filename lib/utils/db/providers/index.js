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
    storageType = (cache && process.env.SYNC !== 'false') ? 'nedb': 'FileSystem';
var dataStore = function () {
    try {
        return require('./' + storageType);
    } catch (e) {
    	console.error(e)
        console.error('Error in loading database', e.message);
        process.exit(1);
    }
};

/**
 * Expose `dataStore()`.
 */
module.exports = dataStore();
