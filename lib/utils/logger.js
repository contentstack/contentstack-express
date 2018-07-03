/*!
 * contentstack-sync
 * copyright (c) Contentstack.com
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */
const winston = require('winston'),
    mkdirp = require('mkdirp'),
    fs = require('graceful-fs'),
    path = require('path');

/**
 * Logs handler
 */
module.exports = (logger) => {
    try {
        // add logger
        let _logger = (logger) => {
            if (!fs.existsSync(logger.path)) mkdirp.sync(logger.path);
            winston.loggers.add(logger.type + '-logger', {
                console: {
                    level: (logger.console) ? 'info' : 'none'
                },
                file: {
                    level: 'info',
                    timestamp: true,
                    json: logger.json,
                    maxsize: 2097152,
                    filename: path.join(logger.path, logger.type + "-logs.log"),
                }
            });
            return winston.loggers.get(logger.type + '-logger');
        };

        // exitOnError enabled except EPIPE error.
        let ignoreEpipe = (err) => {
            return err.code !== 'EPIPE';
        };

        // initiate log's transport levels
        let log = _logger(logger);
        log.exitOnError = ignoreEpipe;

        return log;
    } catch (e) {
        console.error('Error in loading logger.' + e.message);
    }
};
