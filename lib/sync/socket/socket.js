/*!
 * contentstack-express
 * copyright (c) Contentstack
 * MIT Licensed
 */
'use strict';

/*!
 * Module dependencies
 */
const io = require('socket.io-client');
const _ = require('lodash');
const utils = require('../../utils');
const helper = require('./helper');
const pkg = require('../../../package');

module.exports = function() {
  const config = utils.config;
  const log = utils.sync;
  const api_key = config.get('contentstack.api_key');

  const server = config.get('server');
  const urls = {
    queue: `${config.get('contentstack.host')}/${config.get('contentstack.version')}${config.get('contentstack.urls.publish_queue')}`,
    all: `${config.get('contentstack.host')}/${config.get('contentstack.version')}${config.get('contentstack.urls.publish_queue')}all`,
    environment: `${config.get('contentstack.host')}/${config.get('contentstack.version')}${config.get('contentstack.urls.environments')}${config.get('environment')}`,
    socket: `${config.get('contentstack.socket')}${api_key}`
  };
  const languages = config.get('languages');
  let env;
  return function (proceed, clearQueues) {
    try {
      log.info('Attempting connection to the Contentstack server...');
      const flag = true;
      const conn_id = Math.random();
      const date = new Date();
      const last = new Date(date.getTime() - (2 * 24 * 60 * 60 * 1000));
      const query = { query: 'api_key=' + api_key + '&conn_id=' + conn_id };
      // connect on startup
      const socket = io(urls.socket, query);
      socket.on('error', function(err) {
        log.error(`Connection failed.\n${err}`);
      });

      // handle global socket errors
      const socketGlobalNS = socket.io.socket('/');
      socketGlobalNS.on('error', function(err) {
        log.error(`Connection failed.\n${err}`);
      });

      const onConnect = function() {
        if (socket) {
          log.info(`Connection ID: ${conn_id}`);
          var delay;
          socket.removeAllListeners(); // need to do this since we don't want multiple listeners to be registered
          socket.on('reconnect', function() {
            flag = true;
            log.warn('Reconnected.');
            // Use this, for clearning sync queues to avoid double writes
            if (typeof clearQueues === 'function') {
              clearQueues('all');
            }
            onConnect();
          }); 
          // listen again since we are removing all listeners
          socket.on('error', function(err) {
            log.error(`Connection failed.\n${helper.message(err)}`);
          });

          socket.on('disconnect', function(err) {
            last = new Date(date.getTime() - (2 * 24 * 60 * 60 * 1000));
            if (delay) {
              clearInterval(delay);
            }
            log.error(`Connection failed. Attempting to reconnect.\n${helper.message(err)}`);
          });

          socket.on('reconnecting', function() {
            log.info('Reconnecting.');
          });

          socket.on('reconnect_error', function(err) {
            log.error(`Reconnect error.\n${helper.message(err)}`);
          });

          socket.on('reconnect_failed', function(err) {
            log.error(`Reconnect failed.\n${helper.message(err)}`);
          });

          delay = setInterval(function() {
            socket.emit('auth', { authtoken: access_token }, synchronizer);
            log.warn('Resending authentication call.');
          }, 2000);

          const synchronizer = function(err) {
            if (delay) {
              clearInterval(delay);
            }
            const start = function(env) {
              const query = {
                environment: {
                  $in: [env.environment.uid]
                },
                $and: [
                  {
                    $or: [
                      {
                        locale: { 
                          $in: _.map(languages, 'code') 
                        }
                      },
                      {
                        type: 'release'
                      }
                    ]
                  }
                ],
                $or: [
                  {
                    approved: true,
                    rejected: false
                  },
                  {
                    action: 'delete'
                  }
                ],
                publish_details: {
                  $elemMatch: {
                    status: -1,
                    name: server
                  }
                }
              };

              socket.on('create', function(data) {
                if (helper.isValid(data.resource, env.environment.uid, server) && !data.resource.scheduled_at) {
                  const msg = {
                    body: {
                      object: data.resource
                    }
                  };
                  if (data.resource.type === 'asset' && data.resource.entry && data.resource.entry.is_dir && typeof data.resource.entry.is_dir === 'boolean') {
                    proceed(msg, languages);
                  } else if (data.resource.type !== 'form' && data.resource.locale && data.resource.locale.length) {
                    for (let j = 0, _j = data.resource.locale.length; j < _j; j++) {
                      const idx = _.findIndex(languages, {code: data.resource.locale[j]});
                      if (~idx) {
                        proceed(msg, languages[idx])
                      }
                    }
                  } else if (data.resource.type === 'form') {
                    proceed(msg, languages);
                  } else if (data.resource.type === 'release' && typeof data.resource.approved === 'boolean' && typeof data.resource.approved) {
                    proceed(data.resource);
                  }
                }
              });
              socket.on('update', function(data) {
                console.log('@scheduled publish data..')
                console.log(JSON.stringify(data))
                if (!(data.resource && data.resource.length && data.resource[0].k === 'N' && data.resource[0].p.indexOf('job_id') > -1)) {
                  const _url = urls.queue + data.objectuid;
                  helper.queueEntry(_url, function(err, object) {
                    if (err) {
                      log.error(`Unable to fetch publish details.\n${helper.message(err)}`);
                    } else {
                      console.log('@scheduled publish data after hitting publish queue..')
                      console.log(JSON.stringify(object))
                      if (helper.isValid(object, env.environment.uid, server)) {
                        const msg = {
                          body: {
                            object: object
                          }
                        };
                        if (object.type == 'asset' && object.entry && object.entry.is_dir && typeof object.entry.is_dir === 'boolean') {
                          proceed(msg, languages);
                        } else if (object.type !== 'form' && object.locale && object.locale.length) {
                          for (let j = 0, _j = object.locale.length; j < _j; j++) {
                            const idx = _.findIndex(languages, {code: object.locale[j]})
                            if (~idx) {
                              proceed(msg, languages[idx]);
                            }
                          }
                        } else if (object.type == 'form') {
                          proceed(msg, languages);
                        } else if (object.type === 'release' && typeof object.approved === 'boolean' && typeof object.approved) {
                          proceed(object);
                        }
                      }
                    }
                  });
                }
              });
              socket.emit('subscribe', {
                channel: 'notifications._cms_publish_queue.object',
                fetch: { query: query }
              }, function(err, data) {
                if (!err) {
                  log.info('Connection established successfully!');
                  const requestObject = {
                    uri: urls.all,
                    query: {
                      qs: JSON.parse(JSON.stringify(query)),
                      created_at: { 
                        $gte: last.toISOString() 
                      },
                      asc: 'created_at',
                      skip: 0,
                      limit: 100,
                      include_count: true
                    }
                  };
                  helper.queue(requestObject, [], function(err, data) {
                    if (err) {
                      log.error(`Unable to retrieve pending publish queue requests due to the following error.\nCheck details and try again.\n${helper.message(err)}`);
                    } else {
                      for (let i = 0, _i = data.length; i < _i; i++) {
                        const msg = {
                          body: {
                            object: data[i]
                          }
                        };
                        if (data[i].type === 'asset' && data[i].entry && data[i].entry.is_dir && typeof data[i].entry.is_dir === 'boolean') {
                          proceed(msg, languages);
                        } else if (data[i].type !== 'form' && data[i].locale && data[i].locale.length) {
                          if (data[i].scheduled_at && (new Date(data[i].scheduled_at).toISOString() > new Date().toISOString())) {
                            continue;
                          }
                          for (let j = 0, _j = data[i].locale.length; j < _j; j++) {
                            const idx = _.findIndex(languages, 'code', data[i].locale[j]);
                            if (~idx) {
                              proceed(msg, languages[idx])
                            }
                          }
                        } else if (data[i].type === 'form') {
                          proceed(msg, languages);
                        } else if (data[i].type === 'release' && typeof data[i].approved === 'boolean' && typeof data[i].approved) {
                          proceed(data[i]);
                        }
                      }
                    }
                  });
                } else {
                  log.error(`Connection failed.\n${helper.message(err)}`);
                  process.exit(1);
                }
              });
            };
            if (flag) {
              flag = false;
              if (!err) {
                log.info('Connection authorized');
                if (env) {
                  start(env);
                } else {
                  helper.environment(urls.environment, function(err, data) {
                    if (!err && data) {
                      env = data;
                      start(env);
                    } else {
                      log.error(helper.message(err));
                    }
                  });
                }
              } else {
                log.error(`Connection authorization failed.\n${helper.message(err)}`);
                process.exit(0);
              }
            }
          };
          socket.emit('auth', { authtoken: access_token }, synchronizer);
        }
      };
      socket.once('connect', onConnect);
    } catch (socketError) {
      log.error(`Connection failed.\n${socketError}`);
      process.exit(1);
    }
  };
};