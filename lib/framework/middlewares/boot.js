/*!
 * contentstack-express
 * copyright (c) Built.io Contentstack
 * MIT Licensed
 */

'use strict';
var _ = require('lodash');
/**
 * Defines request level and context API
 */
module.exports = function (utils) {
	var config = utils.config,
		allowedSetKeys = ['entry', 'template'],
		reservedKeys = ['originalUrl', 'parsedUrl', 'lang', 'content_type', 'query', 'url', 'response_type'].concat(allowedSetKeys);

	return function boot(req, res, next) {
        // setting the routing variable
        req._contentstack = req._contentstack || {};

        // routing API for getting informations
        req.contentstack = {
            get: function(key) {
                return ((key && typeof key === 'string') ? req._contentstack[key] : undefined);
            },
            set: function(key, value) {
				var force = arguments['2'] || false;
                if(key && typeof key === 'string' && value) {
                    if(~allowedSetKeys.indexOf(key) || force) {
                        req._contentstack[key] = value;
                    } else if(~reservedKeys.indexOf(key)) {
                        console.error(key+' is restricted key.');
                    }
                }
            }
        };

		// add getViewContext function to set and get data
		req.getViewContext = function () {
			req.entry = req.entry || {}; // to store the context data
			return {
				set: function (key, value) {
					if (typeof key !== 'string') throw new TypeError('req.getViewContext().set() requires key as string but got a ' + typeof key);
					if (req.entry[key]) {
						req.entry[key] = value;
					} else {
                        req.entry[key] = value;
                    }
				},
				get: function (key) {
					return req.entry[key];
				}
			};
		};
		next();
	};
};