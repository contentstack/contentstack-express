const https = require('https')
const request = require('request')
const chalk = require('chalk')
const config = require('../utils').config
const package = require('../../package')

const warning = chalk.yellow
const success = chalk.green
const error = chalk.red
const info = chalk.blue
const log = console.log

const keepAliveAgent = new https.Agent({ keepAlive: true })

function validate (req, cb, counter) {
	if (typeof req !== 'object' || typeof cb !== 'function') {
		log(error(`Invalid params passed for request\n${JSON.stringify(arguments)}`))
		process.exit(1)
	}

	if (typeof req.method === 'undefined') {
		log(info(`Setting request verb as 'GET'`))
		req.method = 'GET'
	}

	if (typeof req.uri === 'undefined' && typeof req.url === 'undefined') {
		log(error(`Missing uri in request!\n${JSON.stringify(req)}`))
		process.exit(1)
	}

	if (typeof req.json === 'undefined') {
		req.json = true
	}

	if (typeof req.headers === 'undefined') {
		log(info(`Setting headers for ${req.uri || req.url}`))
		req.headers = {
			api_key: config.get('contentstack.api_key'),
			access_token: config.get('contentstack.access_token'),
			'X-User-Agent': 'contentstack-express/' + package.version
		}
	}

	// Keep sockets around even when there are no outstanding requests, 
	// so they can be used for future requests without having to reestablish a TCP connection
	req.agent = keepAliveAgent

	log(success(`Request object validated successfully!`))
}

exports.queryContentstack = (req, cb, counter) => {
	validate(req, cb)
	let self = this
	if (typeof counter !== 'number') {
		counter = 0
	}
	return request(req, (err, response, body) => {
		if (err) {
			return cb(err)
		}

		if (response.statusCode === 200 || response.statusCode === 201) {
			return cb(null, body)
		} else if (response.statusCode === 429 || response.statusCode >= 500) {
			// retry, with delay
			log(warning(`Recevied ${response.statusCode} status\nBody ${JSON.stringify(body)}`))
			counter++
			return setTimeout((req, cb, counter) => {
				log(warning(`Retrying ${req.uri || req.url} with ${counter} sec delay`))
				return self.getJSON(req, cb, counter)
			}, (counter * 1000), req, cb, counter)
		} else {
			log(error(`Call failed\n${req.uri}`))
			return cb(body)
		}
	})
}