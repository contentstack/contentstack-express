/*!
 * contentstack-express
 * copyright (c) Built.io Contentstack
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */
var domain = require('domain');

module.exports = function () {
	return function domainContext(req, res, next) {
		// create context for every request
		var context = domain.create();

		// add request response in context
		context.add(req);
		context.add(res);

		res.on('close', function () {
			context.dispose();
		});

		res.on('finish', function () {
			context.exit();
		});

		context.on('error', function (err) {
			// Once a domain is disposed, further errors from the emitters in that set will be ignored.
			next(err);
		});

		// run request in context
		context.run(next);
	};
};