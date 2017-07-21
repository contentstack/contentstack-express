/*!
 * contentstack-express
 * copyright (c) Built.io Contentstack
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */
var request = require('request'),
	async = require('async'),
	_ = require('lodash'),
	utility = require('./../../utils/index'),
	helper = require('./../helper');

var utils = module.exports = {};

utils.environment = function (url, headers, callback) {
	var config = utility.config;
	request.get({url: url, headers: headers, json: true}, function (err, res, body) {
		if (!err && res.statusCode == 200 && body.environment) {
			var _env = {environment: helper.deleteKeys(body.environment)};
			callback(null, _env);
		} else {
			callback(new Error('The environment \''+config.get('environment')+'\' does not exist.'), null);
		}
	});
};

utils.publish = function (url, headers, callback) {
	request.get({url: url, headers: headers, json: true}, function (err, res, body) {
		if (!err && res.statusCode == 200 && body.entry) {
			callback(null, body.entry);
		} else {
			callback(body, null);
		}
	});
};

// Get publih queue entry
utils.queueEntry = function (url, headers, callback) {
    request({
            url: url,
            headers: headers,
            json: true
        }, function(err, res, body) {
            if (!err && res.statusCode == 200 && body && body.entry) {
                callback(null, body.entry);
            } else {
                callback(err || body);
            }
        });
};

utils.queue = function (url, query, headers, callback) {
	// Retrieve publish_queue from Built.io Contentstack
	var _queue = function (skip, cb) {
		var _options = {
			url: url,
			qs: {
				query: JSON.stringify(query),
				asc: "created_at",
				skip: skip,
				limit: 100,
				include_count: true
			},
			headers: headers,
			json: true
		};
		request.get(_options, function (err, res, data) {
			if (!err && res.statusCode == 200) {
				cb(null, data);
			} else {
				cb(data, null);
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
	return (object && object.environment && object.environment.indexOf(env) > -1 && object.action.indexOf('cancelled') == -1 && object._metadata && object._metadata.publish_details && object._metadata.publish_details.length && _.findIndex(object._metadata.publish_details, {name: server}) != -1);
};
