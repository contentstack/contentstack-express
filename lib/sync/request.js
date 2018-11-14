var https = require('https');
var request = require('request');
var chalk = require('chalk');
var config = require('../utils').config;
var package = require('../../package');

var warning = chalk.yellow;
var success = chalk.green;
var error = chalk.red;
var info = chalk.blue;
var log = console.log;

var keepAliveAgent = new https.Agent({ keepAlive: true });

function validate (req, cb, counter) {
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
			'X-User-Agent': 'contentstack-express/' + package.version
		};
	}

	// Keep sockets around even when there are no outstanding requests, 
	// so they can be used for future requests without having to reestablish a TCP connection
	// req.agent = keepAliveAgent
}

exports.queryContentstack = function(req, cb, counter) {
	try {
		validate(req, cb);
		if (typeof counter !== 'number') {
			counter = 0;
		}
		log(info(`${req.method.toUpperCase()}: ${req.uri || req.url}`));
		return request(req, function(err, response, body) {
			if (err) {
				return cb(err);
			}

			if (response.statusCode === 200 || response.statusCode === 201) {
				return cb(null, body);
			} else if (response.statusCode === 429 || response.statusCode >= 500) {
				// retry, with delay
				log(warning(`Recevied ${response.statusCode} status\nBody ${JSON.stringify(body)}`));
				counter++;
				return setTimeout(function(req, cb, counter) {
					log(warning(`Retrying ${req.uri || req.url} with ${counter} sec delay`));
					return self.getJSON(req, cb, counter);
				}, (counter * 100), req, cb, counter);
			} else {
				log(error(`Call failed\n${JSON.stringify(req)}`));
				log(error(`Response body\n${JSON.stringify(body)}`));
				return cb(body);
			}
		})
	} catch (error) {
		return cb(error);
	}
}