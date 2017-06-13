/*!
 * contentstack-express
 * copyright (c) Built.io Contentstack
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */
var utils = require('./../utils/index'),
	helper = require('./helper'),
	socket = require('./socket/index'),
	Sync = require('./sync');

var config = utils.config;

module.exports = function () {
	try {
		if (!(config.get('contentstack.api_key') && config.get('contentstack.access_token'))) {
			throw new Error("Built.io Contentstack details are missing.");
		}

		// initialize queue array
		var q = [],
			isProgress = false;

		// proceed next queue if present
		var next = function () {
			if (q.length > 0) {
				this.start(q.shift());
			} else {
				isProgress = false;
			}
		};

		// start sync-utility
		var sync = new Sync(next);

		next.bind(sync);

		// synchronize all requests through queue
		var proceed = function (sync) {
			return function (message, locale) {
				q.push({"message": message, "lang": locale});
				if (!isProgress) {
					sync.start(q.shift());
					isProgress = true;
				}
			};
		}.call(null, sync);

		socket(proceed);

	} catch (e) {
		console.error("Could not start the server. Error: " + e.message, e.stack);
		process.exit(0);
	}
};
