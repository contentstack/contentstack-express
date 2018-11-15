/*!
 * contentstack-express
 * copyright (c) Contentstack
 * MIT Licensed
 */

'use strict';
/*!
 * Module dependencies
 */

var request = require('request');
var chalk = require('chalk');
var config = require('../utils').config;
var pkg = require('../../package');

var warning = chalk.yellow;
var success = chalk.green;
var error = chalk.red;
var info = chalk.blue;
var log = console.log;
var MAX_RETRY_LIMIT = 5;

function validate(req, cb) {
  if (typeof req !== 'object' || typeof cb !== 'function') {
    throw new Error(`Invalid params passed for request\n${JSON.stringify(arguments)}`);
  }
  if (typeof req.uri === 'undefined' && typeof req.url === 'undefined') {
    throw new Error(`Missing uri in request!\n${JSON.stringify(req)}`);
  }
  if (typeof req.method === 'undefined') {
    req.method = 'GET';
  }
  if (typeof req.json === 'undefined') {
    req.json = true;
  }
  if (typeof req.headers === 'undefined') {
    req.headers = {
      api_key: config.get('contentstack.api_key'),
      access_token: config.get('contentstack.access_token'),
      'X-User-Agent': 'contentstack-express/' + pkg.version
    };
  }
}

var makeCall = module.exports = function(req, cb, RETRY) {
  var self = this;
  try {
    validate(req, cb);
    if (typeof RETRY !== 'number') {
      RETRY = 1;
    } else if (RETRY > MAX_RETRY_LIMIT) {
      return cb(new Error(`Max retry limit exceeded!`));
    }
    log(info(`${req.method.toUpperCase()}: ${req.uri || req.url}`));
    return request(req, function(err, response, body) {
      if (err) {
        return cb(err);
      }
      if (response.statusCode >= 200 && response.statusCode <= 399) {
        return cb(null, body);
      } else if (response.statusCode === 429) {
        var timeDelay = Math.pow(Math.SQRT2, RETRY) * 100;
        log(warning(`API rate limit exceeded.\nReceived ${response.statusCode} status\nBody ${JSON.stringify(body)}`));
        log(warning(`Retrying ${req.uri || req.url} with ${timeDelay} sec delay`));
        return setTimeout(function (req, cb, RETRY) {
          return makeCall(req, cb, RETRY);
        }, timeDelay, req, cb, RETRY);
      } else if (response.statusCode >= 500) {
        // retry, with delay
        var timeDelay = Math.pow(Math.SQRT2, RETRY) * 100;
        log(warning(`Recevied ${response.statusCode} status\nBody ${JSON.stringify(body)}`));
        log(warning(`Retrying ${req.uri || req.url} with ${timeDelay} sec delay`));
        RETRY++;
        return setTimeout(function (req, cb, RETRY) {
          return makeCall(req, cb, RETRY);
        }, timeDelay, req, cb, RETRY);
      } else {
        log(error(`Request failed\n${JSON.stringify(req)}`));
        log(error(`Response received\n${JSON.stringify(body)}`));
        return cb(body);
      }
    })
  } catch (error) {
    console.error(error)
    return cb(error);
  }
};