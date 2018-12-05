/*!
 * contentstack-express
 * copyright (c) Contentstack
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */
var debug = require('debug')('sync:status-manager');
var request = require('./request');
var utils = require('../utils');

/**
 * Status updater module
 * @return {Function} : Error first callback fn
 */
module.exports = function() {
  var config = utils.config;
  var log = utils.sync;
  var server = config.get('server');
  var url = `${config.get('contentstack.host')}/${config.get('contentstack.version')}${config.get('contentstack.urls.publish_queue')}`;
  debug(`Status manager url: ${url}`);
  return function(data, response, callback) {
    response.status = (typeof response.status !== 'number') ? parseInt(response.status) : response.status;
    var body = {
      entry: {
        name: server,
        status: response.status,
        message: (response.status !== 3) ? `${response.status_label}: ${response.message}` : response.message
      }
    };

    try {
      log.info(JSON.stringify(body));
      if (!data.restore) {
        return request({
          uri: `${url}${data.object.uid}`,
          method: 'PUT',
          json: body
        }, function(error) {
          if (error) {
            log.warn(`Unable to save status ('${response.status_label.toLowerCase()}') on Contentstack.\nReceived ${JSON.stringify(error)}`);
            return callback(error.message || `${error.error_message} - ${JSON.stringify(error.errors)}` || JSON.stringify(error));
          }
          log.info(`${response.status_label} status has been saved on Contentstack`);
          if (response.next) {
            return callback(null, data);
          }
          return callback();
        });
      } else {
        return callback(null);
      }
    } catch (error) {
      log.error(`Error in status-manager!\n${error}`);
      return callback(error);
    }
  };
}();