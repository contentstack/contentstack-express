/*!
 * contentstack-express
 * copyright (c) Contentstack
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */
var request = require('../request');
var async = require('async');
var _ = require('lodash');
var utility = require('../../utils');
var helper = require('../helper');

var utils = module.exports = {};

utils.environment = function(url, callback) {
	return request({uri: url}, function(error, response) {
		if (error) {
			console.error((typeof error !== 'string') ? error.toString(): error);
			process.exit(1);
		}
		return callback(null, {environment: helper.deleteKeys(response.environment)});
	});
};

utils.publish = function(url, callback) {
	return request({uri: url}, function(error, response) {
		if (error) {
			return callback(error);
		}
		return callback(null, response.entry);
	});
};

// Get publih queue entry
utils.queueEntry = function(url, callback) {
	return request({uri: url}, function(error, response) {
		if (error) {
			return callback(error);
		}
		return callback(null, response.entry);
	});
};

utils.queue = function (requestObj, bucket, callback) {
	return request(requestObj, function(error, response) {
		if (error) {
			return callback(error);
		}
		if (response.queue) {
			bucket = bucket.concat(response.queue);
			requestObj.json.skip += 100;
			// response.count does not exist when queue is empty
			if (typeof response.count === 'undefined' || requestObj.json.skip > response.count) {
				return callback(null, bucket);
			} else {
				return utils.queue(requestObj, bucket, callback);
			}
		} else {
			return callback(null, bucket);
		}
	});
};

utils.message = helper.message;

utils.isValid = function (object, env, server) {
	var publishDetails = (object && object._metadata) ? object._metadata.publish_details : object.publish_details;
	return (object && object.environment && object.environment.indexOf(env) > -1 && object.action.indexOf('cancelled') === -1 && publishDetails && publishDetails.length && _.findIndex(publishDetails, {name: server}) != -1);
};