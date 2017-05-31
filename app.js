/*!
 * framework
 * copyright (c) Roshan Gade <roshan.gade@raweng.com>
 * MIT Licensed
 */

'use strict';

/**
 * Module dependencies
 */
var contentstack = require('contentstack-express');
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;
var Stack = contentstack.Stack();

var app = contentstack(),
    config = contentstack.config,
    environment = config.get('environment'),
    server = config.get('server');

var port = process.env.PORT || config.get('port');

//app.enable('slashes');
app.set('slashes.options', {code: 302});
// app.enable("slashes");
//console.log("App", app.get("slashes"));

app.use("/test/static", contentstack.static(__dirname+"/static_test/", {redirect: false}));


    app.listen(port, function() {
        console.log('Server(%s) is running on "%s" environment over %d port', server, environment, port);
    });
// }
