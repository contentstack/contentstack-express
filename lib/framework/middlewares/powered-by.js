/*!
 * contentstack-express
 * copyright (c) Built.io Contentstack
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */
var onHeaders = require('on-headers');

/**
 * Set powered by in response header
 */
module.exports = function (poweredBy) {
	poweredBy = (!poweredBy || poweredBy == true) ? 'Built.io Contentstack' : poweredBy;
	return function xPoweredBy(req, res, next) {
		onHeaders(res, function () {
			res.setHeader('x-powered-by', poweredBy);
		});
		next();
	};
};