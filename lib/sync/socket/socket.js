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

let inProgress = false;
const scheduledQueue = [];

module.exports = function() {
  const config = utils.config;
  const log = utils.sync;
  const api_key = config.get('contentstack.api_key');
  const access_token = config.get('contentstack.access_token');
  const server = config.get('server');
  const urls = {
    queue: `${config.get('contentstack.host')}/${config.get('contentstack.version')}${config.get('contentstack.urls.publish_queue')}`,
    all: `${config.get('contentstack.host')}/${config.get('contentstack.version')}${config.get('contentstack.urls.publish_queue')}all`,
    environment: `${config.get('contentstack.host')}/${config.get('contentstack.version')}${config.get('contentstack.urls.environments')}${config.get('environment')}`,
    socket: `${config.get('contentstack.socket')}${api_key}`
  };
  const languages = config.get('languages');

  let env;

  return (proceed, clearQueues) => {
    try {
      log.info('Attempting connection to the Contentstack server...');
      
      const conn_id = Math.random();
      const date = new Date();
      const query = { query: 'api_key=' + api_key + '&conn_id=' + conn_id };
      
      let last = new Date(date.getTime() - (2 * 24 * 60 * 60 * 1000));
      let flag = true;

      // connect on startup
      const socket = io(urls.socket, query);
      socket.on('error', err => {
        log.error(`Connection failed.\n${err}`);
      });

      // handle global socket errors
      const socketGlobalNS = socket.io.socket('/');
      socketGlobalNS.on('error', err => {
        log.error(`Connection failed.\n${err}`);
      });

      const onConnect = () => {
        if (socket) {
          log.info(`Connection ID: ${conn_id}`);
          var delay;
          socket.removeAllListeners(); // need to do this since we don't want multiple listeners to be registered
          socket.on('reconnect', () => {
            flag = true;
            log.warn('Reconnected.');
            // Use this, for clearning sync queues to avoid double writes
            if (typeof clearQueues === 'function') {
              clearQueues('all');
            }
            onConnect();
          }); 
          // listen again since we are removing all listeners
          socket.on('error', err => {
            log.error(`Connection failed.\n${helper.message(err)}`);
          });

          socket.on('disconnect', err => {
            last = new Date(date.getTime() - (2 * 24 * 60 * 60 * 1000));
            if (delay) {
              clearInterval(delay);
            }
            log.error(`Connection failed. Attempting to reconnect.\n${helper.message(err)}`);
          });

          socket.on('reconnecting', () => {
            log.info('Reconnecting.');
          });

          socket.on('reconnect_error', err => {
            log.error(`Reconnect error.\n${helper.message(err)}`);
          });

          socket.on('reconnect_failed', err => {
            log.error(`Reconnect failed.\n${helper.message(err)}`);
          });

          delay = setInterval(() => {
            socket.emit('auth', { authtoken: access_token }, synchronizer);
            log.warn('Resending authentication call...');
          }, 2000);

          const synchronizer = err => {
            if (delay) {
              clearInterval(delay);
            }
            const start = env => {
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

              socket.on('create', data => {
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
              socket.on('update', data => {
                if (!(data.resource && data.resource.length && data.resource[0].k === 'N' && data.resource[0].p.indexOf('job_id') > -1)) {
                  scheduledQueue.push(data);
                  if (!inProgress)  {
                    inProgress = true;
                    getPublishQueueDetails(scheduledQueue.shift(), urls.queue, env, server, languages, proceed);
                  }
                }
              });
              socket.emit('subscribe', {
                channel: 'notifications._cms_publish_queue.object',
                fetch: { query: query }
              }, (err, data) => {
                if (!err) {
                  log.info('Connection established successfully!');
                  const _query = JSON.parse(JSON.stringify(query));
                  _query.created_at = {
                    $gte: last.toISOString()
                  };

                  const requestObject = {
                    uri: urls.all,
                    method: 'POST',
                    json: {
                      _method: 'GET',
                      query: _query,
                      asc: 'created_at',
                      skip: 0,
                      limit: 100,
                      include_count: true
                    }
                  };

                  helper.queue(requestObject, [], (err, data) => {
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
                  helper.environment(urls.environment, (err, data) => {
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

function getPublishQueueDetails (data, url, env, server, languages, proceed) {
  const _url = `${url}${data.objectuid}`;
  helper.queueEntry(_url, (err, object) => {
    if (err) {
      console.error(err);
      // log.error(`Unable to fetch publish details.\n${helper.message(err)}`);
    } else {
      if (helper.isValid(object, env.environment.uid, server)) {
        const msg = {
          body: {
            object: object
          }
        };
        if (object.type === 'asset' && object.entry && object.entry.is_dir && typeof object.entry.is_dir === 'boolean') {
          proceed(msg, languages);
        } else if (object.type !== 'form' && object.locale && object.locale.length) {
          for (let j = 0, _j = object.locale.length; j < _j; j++) {
            const idx = _.findIndex(languages, {code: object.locale[j]});
            if (~idx) {
              proceed(msg, languages[idx]);
            }
          }
        } else if (object.type === 'form') {
          proceed(msg, languages);
        } else if (object.type === 'release' && typeof object.approved === 'boolean' && typeof object.approved) {
          proceed(object);
        }
      }
    }

    // if there are still pending scheduled items, process them
    inProgress = false;
    if (scheduledQueue.length) {
      inProgress = true;
      getPublishQueueDetails(scheduledQueue.shift(), url, env, server, languages, proceed);
    }
  });
}