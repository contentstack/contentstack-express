/*!
 * contentstack-express
 * Copyright (c) Contentstack
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */
var winston = require('winston');
var mkdirp = require('mkdirp');
var fs = require('graceful-fs');
var path = require('path');
var format = winston.format;
var transports = winston.transports;

var config = {
  levels: {
    error: 0,
    debug: 1,
    warn: 2,
    info: 4
  },
  colors: {
    error: 'red',
    debug: 'blue',
    warn: 'yellow',
    info: 'green'
  }
};

/**
 * Logs handler
 */
module.exports = function (logger) {
  try {
    // add logger
    var _logger = function (logger) {
      if(!fs.existsSync(logger.path)) {
        mkdirp.sync(logger.path);
      }

      return winston.createLogger({
        levels: config.levels,
        level: logger.level,
        // format: winston.format.json(),
        transports: [
          new transports.Console({
            level: (logger.console) ? 'info' : 'none',
            format: format.combine(
              // format.json(),
              format.timestamp(),
              format.printf((info) => {
                var ts = info.timestamp.slice(0, 19).replace('T', ' ');
                return `[${info.level} ${ts}]: ${typeof info.message === 'object' ? JSON.stringify(info.message): info.message}`;
              })
            )
          }),
          new transports.File({
            filename: path.join(logger.path, logger.type + '-logs.log'),
            level: logger.level || 'info',
            maxsize: logger.maxsize || 1048576,
            format: format.combine(
              format.timestamp(),
              format.json()
            )
          })
        ]
      });
    };

    // exitOnError enabled except EPIPE error.
    var ignoreEpipe = function (err) {
      return err.code !== 'EPIPE';
    };

    // initiate log's transport levels
    var log = _logger(logger);
    log.exitOnError = ignoreEpipe;

    return log;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error in loading logger ' + e.message);
  }
};
