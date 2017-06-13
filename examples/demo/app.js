/*!
 * framework
 * copyright (c) Roshan Gade <roshan.gade@raweng.com>
 * MIT Licensed
 */

'use strict';

/**
 * Module dependencies
 */
var contentstack = require("./../../contentstack.js"); // replace path with 'contentstack-express' on your environment

var app = contentstack(),
    config = contentstack.config,
    environment = config.get('environment'),
    server = config.get('server');

var port = process.env.PORT || config.get('port');

app.listen(port, function() {
        console.log('Server(%s) is running on "%s" environment over %d port', server, environment, port);
    });
