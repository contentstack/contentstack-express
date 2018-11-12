/*!
 * contentstack-express
 * copyright (c) Contentstack
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */
const request = require('../request');
const async = require('async');
const _ = require('lodash');
const utility = require('../../utils');
const helper = require('../helper');

var utils = module.exports = {};

utils.environment = (url, callback) => {
	return request({uri: url}, (error, response) => {
		if (error) {
			console.error((typeof error !== 'string') ? error.toString(): error);
			process.exit(1);
		}
		return callback(null, {environment: helper.deleteKeys(response.environment)});		
	});
};

utils.publish = (url, callback) => {
	return request({uri: url}, (error, response) => {
		if (error) {
			return callback(error);
		}
		return callback(null, response.entry);
	});
};

// Get publih queue entry
utils.queueEntry = (url, callback) => {
	return request({uri: url}, (error, response) => {
		if (error) {
			return callback(error);
		}
		return callback(null, response.entry);
	});
};

utils.queue = (requestObj, bucket, callback) => {
	return request(requestObj, (error, response) => {
		if (error) {
			return callback(error)
		}

	})
}

utils.queue = function (url, query, callback) {
	// Retrieve publish_queue from Contentstack
	var _queue = function (skip, cb) {
		return request({
			url: url,
			method: 'GET',
			headers: headers,
			qs: {
				query: JSON.stringify(query),
				asc: "created_at",
				skip: skip,
				limit: 100,
				include_count: true
			},
			json: true
		}, function (error, response, data) {
			if (error)
				return cb(error);
			else if (response.statusCode === 200) {
				return cb(null, data);
			} else {
				return cb(data);
			}
		});
	};
	// starts retrieving all pending requests
	_queue(0, function (err, data) {
		try {
			if (err) throw err;
			var __queue = [];
			if(data) __queue = __queue.concat(data.queue || []);
			if (data && data.count > 100) {
				var _getQueue = [];
				var totalRequests = Math.ceil(data.count / 100);
				for (var i = 1; i < totalRequests; i++) {
					_getQueue.push((function (i) {
						return function (_cb) {
							_queue(i * 100, _cb);
						}
					})(i));
				}
				async.series(_getQueue, function (_err, _data) {
					if (_err) {
						callback(_err, null);
					} else {
						for (var j = 0, _j = _data.length; j < _j; j++) {
							__queue = __queue.concat(_data[j].queue);
						}
						callback(null, __queue);
					}
				});
			} else {
				callback(null, __queue);
			}
		} catch (e) {
			callback(e, null);
		}
	});
};

utils.message = helper.message;

utils.isValid = function (object, env, server) {
	var publishDetails = (object && object._metadata) ? object._metadata.publish_details : object.publish_details;
	return (object && object.environment && object.environment.indexOf(env) > -1 && object.action.indexOf('cancelled') == -1 && publishDetails && publishDetails.length && _.findIndex(publishDetails, {name: server}) != -1);
};