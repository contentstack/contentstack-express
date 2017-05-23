/*!
 * contentstack-express
 * copyright (c) Built.io Contentstack
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */
var request = require('request'),
    utils = require('./../utils/index');

module.exports = function () {
    var config = utils.config,
        log = utils.sync,
        server = config.get('server'),
        url = config.get('contentstack.host') + config.get('contentstack.urls.publish_queue'),
        headers = {
            api_key: config.get('contentstack.api_key'),
            access_token: config.get('contentstack.access_token')
        };

    return function (data, response, callback) {
        var body = {
                entry: {
                    name: server,
                    status: Number(response.status),
                    message: (Number(response.status) !== 3) ? response.status_label + " : " +response.message : response.message
                }
            };

        try {
            log.info(JSON.stringify(body));
            if (!data.restore) {
                request.put({
                    url: url + data.object.uid,
                    headers: headers,
                    json: body
                }, function (err, res, body) {
                    if (!err && res.statusCode == 200) {
                        log.info("'" + response.status_label + "' status has been saved on Built.io Contentstack.");
                        if (response.next) {
                            callback(null, data);
                        } else {
                            callback();
                        }
                    } else {
                        log.warn("Unable to saved status (" + response.status_label + ") on Built.io Contentstack because of the following error: " + JSON.stringify(body));
                        callback(err);
                    }
                });
            } else {
                callback(null);
            }
        } catch (e) {
            log.error("Error: " + e.message);
        }
    }
}();
