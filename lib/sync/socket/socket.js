/*!
 * contentstack-express
 * copyright (c) Built.io Contentstack
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */
var io = require('socket.io-client'),
	_ = require('lodash'),
	utils = require('./../../utils/index'),
	helper = require('./helper');

module.exports = function () {
	var config = utils.config,
		log = utils.sync, env;

	var api_key = config.get('contentstack.api_key'),
		access_token = config.get('contentstack.access_token'),
		server = config.get('server'),
		urls = {
			queue: config.get('contentstack.host') + config.get('contentstack.urls.publish_queue'),
			all: config.get('contentstack.host') + config.get('contentstack.urls.publish_queue') + 'all',
			environment: config.get('contentstack.host') + config.get('contentstack.urls.environments') + config.get('environment'),
			socket: config.get('contentstack.socket') + api_key
		},
		languages = config.get('languages'),
		headers = {
			api_key: api_key,
			access_token: access_token
		};

	return function (proceed) {
		try {
			if (api_key && access_token) {
				log.info("Attempting connection to the Built.io Contentstack server...");
				var flag = true,
					conn_id = Math.random(),
					date = new Date(),
					last = new Date(date.getTime() - (2 * 24 * 60 * 60 * 1000));

				var query = {query: 'api_key=' + api_key + "&conn_id=" + conn_id};

				// connect on startup
				var socket = io(urls.socket, query);

				socket.on('error', function (err) {
					log.error("Connection failed. Error: " + err);
				});

				// handle global socket errors
				var socketGlobalNS = socket.io.socket('/');
				socketGlobalNS.on('error', function (err) {
					log.error("Connection failed. Error(namespace): " + err);
				});

				var onConnect = function () {
					if (socket) {
                        log.info("Connection ID: "+conn_id);
						var delay;
						socket.removeAllListeners(); // need to do this since we don't want multiple listeners to be registered
						socket.on('reconnect', function () {
							flag = true;
							log.warn("Reconnected.");
							onConnect();
						});// listen again since we are removing all listeners
						socket.on('error', function (err) {
							log.error("Connection failed. Error: " + helper.message(err));
						});
						socket.on('disconnect', function (err) {
							last = new Date();
							if (delay) clearInterval(delay);
							log.error("Connection failed. Attempting to reconnect." + helper.message(err));
						});
						socket.on('reconnecting', function () {
							log.info("Reconnecting.");
						});
						socket.on('reconnect_error', function (err) {
							log.error("Reconnect error: " + helper.message(err));
						});
						socket.on('reconnect_failed', function (err) {
							log.error("Reconnect failed: " + helper.message(err));
						});

						delay = setInterval(function () {
							socket.emit('auth', {authtoken: access_token}, synchronizer);
							log.warn("Resending authentication call.");
						}, 2000);

						var synchronizer = function (err) {
							if (delay) clearInterval(delay);
							var start = function (env) {
								var query = {
									"environment": {"$in": [env.environment.uid]},
									"locale": {'$in': _.pluck(languages, 'code')},
									"$or": [
										{
											"approved": true,
											"rejected": false
										},
										{
											"action": "delete"
										}
									],
									"_metadata.publish_details": {
										"$elemMatch": {
											"status": -1,
											"name": server
										}
									}
								};
								socket.on('create', function (data) {
									var lang;
									if (helper.isValid(data.resource, env.environment.uid, server) && !data.resource.scheduled_at) {
										var msg = {
											body: {
												object: data.resource
											}
										};
										if (data.resource.type != 'form' && data.resource.locale && data.resource.locale.length && ~_.findIndex(languages, 'code', data.resource.locale[0])) {
											lang = languages[_.findIndex(languages, 'code', data.resource.locale[0])];
											proceed(msg, lang);
										} else if (data.resource.type == 'form') {
											proceed(msg, languages);
										}
									}
								});
								socket.on('update', function (data) {
									if (!(data.resource && data.resource.length && data.resource[0].k == 'N' && data.resource[0].p.indexOf('job_id') > -1)) {
										var _url = urls.queue + data.objectuid;
										helper.queueEntry(_url, headers, function (err, object) {
											if (err) {
												log.error("Unable to fetch publish details. Error: " + helper.message(err));
											} else {
												var lang;
												if (helper.isValid(object, env.environment.uid, server)) {
													var msg = {
														body: {
															object: object
														}
													};
													if (object.type != 'form' && object.locale && object.locale.length && ~_.findIndex(languages, 'code', object.locale[0])) {
														lang = languages[_.findIndex(languages, 'code', object.locale[0])];
														proceed(msg, lang);
													} else if (object.type == 'form') {
														proceed(msg, languages);
													}
												}
											}
										});
									}
								});
								socket.emit('subscribe', {
									channel: 'notifications._cms_publish_queue.object',
									fetch: {query: query}
								}, function (err, data) {
									// if there was an error in subscription (no permission to read on the object), 'error' will contain details
									if (!err) {
										log.info('Connection established successfully!');
										var _query = JSON.parse(JSON.stringify(query));
										_query.created_at = {
											"$gte": last.toISOString()
										};
										helper.queue(urls.all, _query, headers, function (err, data) {
											if (err) {
												log.error("Unable to retrieve pending publish queue requests due to the following error. Check details and try again. Error: " + helper.message(err));
											} else {
												var lang;
												for (var i = 0, _i = data.length; i < _i; i++) {
													var msg = {
														body: {
															object: data[i]
														}
													};
													if (data[i].type != 'form' && data[i].locale && data[i].locale.length && ~_.findIndex(languages, 'code', data[i].locale[0])) {
														if (data[i].scheduled_at && (new Date(data[i].scheduled_at).toISOString() > new Date().toISOString()))
															continue;
														lang = languages[_.findIndex(languages, 'code', data[i].locale[0])];
														proceed(msg, lang);
													} else if (data[i].type == 'form') {
														proceed(msg, languages);
													}
												}
											}
										});
									} else {
										log.error("Connection failed. Error: " + helper.message(err));
										process.exit(0);
									}
								});
							};
							if (flag) {
								flag = false;
								if (!err) {
									log.info("Connection authorized");
									if (env) {
										start(env);
									} else {
										helper.environment(urls.environment, headers, function (err, data) {
											if (!err && data) {
												env = data;
												start(env);
											} else {
												log.error(helper.message(err));
											}
										});
									}
								} else {
									log.error("Connection authorization failed. Error: " + helper.message(err));
									process.exit(0);
								}
							}
						};

						socket.emit('auth', {authtoken: access_token}, synchronizer);
					}
				};
				socket.once('connect', onConnect);
			} else {
				throw new TypeError("Check Built.io Contentstack settings.");
			}
		} catch (e) {
			log.error("Connection failed. Error: " + e.message);
			process.exit(0);
		}
	};
};
