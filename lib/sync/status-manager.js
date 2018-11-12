/*!
 * contentstack-express
 * copyright (c) Contentstack
 * MIT Licensed
 */

'use strict'

/*!
 * Module dependencies
 */

const request = require('./request').queryContentstack;
const utils = require('../utils');

module.exports = function() {
  const config = utils.config;
  const log = utils.sync;
  const server = config.get('server');
  const url = `${config.get('contentstack.host')}/${config.get('contentstack.version')}${config.get('contentstack.urls.publish_queue')}`;

  return (data, response, callback) => {
    response.status = (typeof response.status !== 'number') ? parseInt(response.status) : response.status
    const body = {
      entry: {
        name: server,
        status: response.status,
        message: (response.status !== 3) ? `${response.status_label}: ${response.message}` : response.message
      }
    }

    try {
      log.info(JSON.stringify(body))
      if (!data.restore) {
        return request({
          uri: url + data.object.uid,
          method: 'PUT',
          json: body
        }, function(error, body) {
          if (error) {
            log.warn(`Unable to save status (${response.status_label}) on Contentstack.\nReceived ${JSON.stringify(error)}`)
            return callback(error)
          }
          log.info(`${response.status_label} status has been saved on Contentstack`)
          if (response.next) {
            return callback(null, data)
          }
          return callback()
        })
      } else {
        return callback(null)
      }
    } catch (error) {
      log.error(`Error in status-manager!\n${error}`)
      return callback(error)
    }
  }
}()