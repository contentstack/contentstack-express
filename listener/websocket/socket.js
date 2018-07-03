/*!
 * contentstack-sync
 * copyright (c) Contentstack.com
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */
const io = require('socket.io-client'),
    _ = require('lodash');

let utils = require('./../../lib/utils/index'),
    helper = require('./helper'),
    pkg = require('../../package.json'),
    config = require('../../lib/config')();

module.exports = () => {
    let log = utils.sync,
        env,
        api_key = config.get('contentstack.api_key'),
        access_token = config.get('contentstack.access_token'),
        server = config.get('server') || "default",
        urls = {
            queue: config.get('contentstack.host') + '/' + config.get('contentstack.version') + config.get('contentstack.urls.publish_queue'),
            all: config.get('contentstack.host') + '/' + config.get('contentstack.version') + config.get('contentstack.urls.publish_queue') + 'all',
            environment: config.get('contentstack.host') + '/' + config.get('contentstack.version') + config.get('contentstack.urls.environments') + config.get('environment'),
            language: config.get('contentstack.host') + '/' + config.get('contentstack.version') + config.get('contentstack.urls.locales'),

            socket: config.get('listener.config.socket') + api_key
        },

        languages = [],
        headers = {
            api_key: api_key,
            access_token: access_token,
            'X-User-Agent': 'contentstack-express/' + pkg.version
        };
    return function(proceed) {
        try {
            if (api_key && access_token) {
                log.info("Running on", server, "server and", config.get('environment'), "environment...");
                log.info("Attempting connection to the Built.io Contentstack server...");
                let flag = true,
                    conn_id = Math.random(),
                    date = new Date(),
                    last = new Date(date.getTime() - (2 * 24 * 60 * 60 * 1000));
                let query = { query: 'api_key=' + api_key + "&conn_id=" + conn_id };
                // connect on startup
                let socket = io(urls.socket, query);
                socket.on('error', (err) => {
                    log.error("Connection failed. Error: " + err);
                });

                // handle global socket errors
                let socketGlobalNS = socket.io.socket('/');
                socketGlobalNS.on('error', (err) => {
                    log.error("Connection failed. Error(namespace): " + err);
                });

                let onConnect = () => {
                    if (socket) {
                        log.info("Connection ID: " + conn_id);
                        let delay;
                        socket.removeAllListeners(); // need to do this since we don't want multiple listeners to be registered
                        socket.on('reconnect', () => {
                            flag = true;
                            log.warn("Reconnected.");
                            onConnect();
                        }); // listen again since we are removing all listeners
                        socket.on('error', (err) => {
                            log.error("Connection failed. Error: " + helper.message(err));
                        });
                        socket.on('disconnect', (err) => {
                            last = new Date();
                            if (delay) clearInterval(delay);
                            log.error("Connection failed. Attempting to reconnect." + helper.message(err));
                        });
                        socket.on('reconnecting', () => {
                            log.info("Reconnecting.");
                        });
                        socket.on('reconnect_error', (err) => {
                            log.error("Reconnect error: " + helper.message(err));
                        });
                        socket.on('reconnect_failed', (err) => {
                            log.error("Reconnect failed: " + helper.message(err));
                        });

                        delay = setInterval(() => {
                            socket.emit('auth', { authtoken: access_token }, synchronizer);
                            log.warn("Resending authentication call.");
                        }, 2000);

                        let synchronizer = (err) => {
                            if (delay) clearInterval(delay);
                            let start = (env) => {
                                let query = {
                                    "environment": { "$in": [env.environment.uid] },
                                    "locale": { '$in': _.map(languages, 'code') },
                                    "$or": [{
                                            "approved": true,
                                            "rejected": false
                                        },
                                        {
                                            "action": "delete"
                                        }
                                    ],
                                    "publish_details": {
                                        "$elemMatch": {
                                            "status": -1,
                                            "name": server
                                        }
                                    }
                                };

                                socket.on('create', (data) => {
                                    if (helper.isValid(data.resource, env.environment.uid, server) && !data.resource.scheduled_at) {
                                        let msg = {
                                            body: {
                                                object: data.resource
                                            }
                                        };
                                        if (data.resource.type == 'asset' && data.resource.entry && data.resource.entry.is_dir && typeof data.resource.entry.is_dir === 'boolean') {
                                            proceed(msg, languages);
                                        } else if (data.resource.type != 'form' && data.resource.locale && data.resource.locale.length) {
                                            for (let j = 0, _j = data.resource.locale.length; j < _j; j++) {
                                                if (~_.findIndex(languages, { 'code': data.resource.locale[j] })) proceed(msg, languages[_.findIndex(languages, { 'code': data.resource.locale[j] })])
                                            }
                                        } else if (data.resource.type == 'form') {
                                            proceed(msg, languages);
                                        }
                                    }
                                });

                                socket.on('update', (data) => {
                                    if (!(data.resource && data.resource.length && data.resource[0].k == 'N' && data.resource[0].p.indexOf('job_id') > -1)) {
                                        let _url = urls.queue + data.objectuid;
                                        helper.queueEntry(_url, headers, (err, object) => {
                                            if (err) {
                                                log.error("Unable to fetch publish details. Error: " + helper.message(err));
                                            } else {
                                                if (helper.isValid(object, env.environment.uid, server)) {
                                                    let msg = {
                                                        body: {
                                                            object: object
                                                        }
                                                    };
                                                    if (object.type == 'asset' && object.entry && object.entry.is_dir && typeof object.entry.is_dir === 'boolean') {
                                                        proceed(msg, languages);
                                                    } else if (object.type != 'form' && object.locale && object.locale.length) {
                                                        for (let j = 0, _j = object.locale.length; j < _j; j++) {
                                                            if (~_.findIndex(languages, { 'code': object.locale[j] })) proceed(msg, languages[_.findIndex(languages, { 'code': object.locale[j] })])
                                                        }
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
                                    fetch: { query: query }
                                }, (err) => {
                                    // if there was an error in subscription (no permission to read on the object), 'error' will contain details
                                    if (!err) {
                                        log.info('Connection established successfully!');
                                        let _query = JSON.parse(JSON.stringify(query));
                                        _query.created_at = {
                                            "$gte": last.toISOString()
                                        };
                                        console.log("Query------->", _query)
                                        helper.queue(urls.all, _query, headers, (err, data) => {
                                            console.log("error ----- ------:::", err, data);
                                            if (err) {
                                                log.error("Unable to retrieve pending publish queue requests due to the following error. Check details and try again. Error: " + helper.message(err));
                                            } else {
                                                for (let i = 0, _i = data.length; i < _i; i++) {
                                                    let msg = {
                                                        body: {
                                                            object: data[i]
                                                        }
                                                    };
                                                    if (data[i].type == 'asset' && data[i].entry && data[i].entry.is_dir && typeof data[i].entry.is_dir === 'boolean') {
                                                        proceed(msg, languages);
                                                    } else if (data[i].type != 'form' && data[i].locale && data[i].locale.length) {
                                                        if (data[i].scheduled_at && (new Date(data[i].scheduled_at).toISOString() > new Date().toISOString()))
                                                            continue;
                                                        for (let j = 0, _j = data[i].locale.length; j < _j; j++) {
                                                            if (~_.findIndex(languages, { 'code': data[i].locale[j] })) proceed(msg, languages[_.findIndex(languages, { 'code': data[i].locale[j] })])
                                                        }
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
                                    helper.languages(urls.language, headers, { "only[BASE][]": 'code' }, (err, data) => {
                                        if (!err && data) {
                                            languages = data;
                                            config.set('languages', languages)
                                            if (env) {
                                                start(env);
                                            } else {
                                                helper.environment(urls.environment, headers, (err, data) => {
                                                    if (!err && data) {
                                                        env = data;
                                                        start(env);
                                                    } else {
                                                        log.error(helper.message(err));
                                                    }
                                                });
                                            }
                                        } else {
                                            log.error(helper.message(err));
                                        }
                                    })

                                } else {
                                    log.error("Connection authorization failed. Error: " + helper.message(err));
                                    process.exit(0);
                                }
                            }
                        };

                        socket.emit('auth', { authtoken: access_token }, synchronizer);
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
}