/*!
 * contentstack-sync
 * copyright (c) Contentstack.com
 * MIT Licensed
 */

'use strict';

/**
 * Module Dependencies.
 */
let request = require('request'),
    Q = require('q');

/*
 * Application defined variables
 * */

module.exports = (options) => {
    let deferred = Q.defer();
    options.method = options.method || "GET";
    request(options, (err, response, body) => {
        if (err || body.error_code || body.error_message) {
            deferred.reject(err || body);
        } else {
            deferred.resolve(body);
        }
    });
    return deferred.promise;
};
