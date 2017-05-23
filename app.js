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

// app
//     .extends().
//     use("/api", function customRoutes(req, res, next) {
//
//     });

// if(cluster.isMaster) {
//     // Fork workers.
//     for (var i = 0; i < numCPUs; i++) {
//         cluster.fork();
//     }
//
//     cluster.on('exit', (worker, code, signal) => {
//         console.log(`worker ${worker.process.pid} died`);
//     });
// } else {

//app
//    .error(function(err, req, res, next) {
//        console.log('Message : ', err.message);
//        next(err);
//    });

/*app.extends().use(function (req, res, next) {
    var tmpl = req.contentstack.get('template');
    var entry = req.contentstack.get('entry');
    // console.log(entry);
    tmpl = "pages/blog/index.html";
    req.contentstack.set('template', tmpl);
    if(tmpl && entry) {
        console.log("tmpl",tmpl);
        res.render(tmpl, {entry: entry}, function (err, html) {
            console.log("html", err, html);
            if(err) throw err;
            // if(!fs.existsSync(StaticFilePath)) {
            //     fs.writeFileSync(StaticFilePath, html, 'utf-8');
            // }
            res.send(html);
        });
    } else {
        next();
    }
});*/

    app.listen(port, function() {
        console.log('Server(%s) is running on "%s" environment over %d port', server, environment, port);
    });
// }
