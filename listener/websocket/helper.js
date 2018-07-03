/*!
 * contentstack-sync
 * copyright (c) Contentstack.com
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */
const request = require('request'),
    async = require('async'),
    _ = require('lodash');

let helper = require('./../../lib/helper');

let utils = module.exports = {};

// get message
utils.message = (err) => {
    if (typeof err == "object") {
        if (err.message) {
            return JSON.stringify(err.message);
        } else if (err.error_message) {
            return JSON.stringify(err.error_message);
        }
        return JSON.stringify(err);
    }
    return err;
};

// remove extra and unwanted keys from entry object
utils.deleteKeys = (_entry) => {
    let keys = ["ACL", "publish_details"],
        entry = _entry.object || _entry,
        d = new Date();

    entry.uid = (entry._metadata && entry._metadata.uid) ? entry._metadata.uid : entry.uid;
    entry.published_at = d.toISOString();
    return _.omit(entry, keys);
};

utils.environment = (url, headers, callback) => {
    let config = require('./../../lib/config')();
    request.get({ url: url, headers: headers, json: true }, (err, res, body) => {
        if (!err && res.statusCode == 200 && body.environment) {
            let _env = { environment: helper.deleteKeys(body.environment) };
            callback(null, _env);
        } else {
            callback(new Error('The environment \'' + config.get('environment') + '\' does not exist.'), null);
        }
    });
};
utils.languages = (url, headers, query, callback) => {
    request.get({ url: url, headers: headers, qs: query, json: true }, (err, res, body) => {
        if (!err && res.statusCode == 200) {
            callback(null, body.locales);
        } else {
            callback(new Error('The languages does not exist.'), null);
        }
    })
}
utils.publish = (url, headers, callback) => {
    request.get({ url: url, headers: headers, json: true }, (err, res, body) => {
        if (!err && res.statusCode == 200 && body.entry) {
            callback(null, body.entry);
        } else {
            callback(body, null);
        }
    });
};

// Get publih queue entry
utils.queueEntry = (url, headers, callback) => {
    request({
        url: url,
        headers: headers,
        json: true
    }, (err, res, body) => {
        if (!err && res.statusCode == 200 && body && body.entry) {
            callback(null, body.entry);
        } else {
            callback(err || body);
        }
    });
};

utils.queue = (url, query, headers, callback) => {
    // Retrieve publish_queue from Built.io Contentstack
    let _queue = (skip, cb) => {
        let _options = {
            url: url,
            qs: {
                query: JSON.stringify(query),
                asc: "created_at",
                skip: skip,
                limit: 100,
                include_count: true
            },
            headers: headers,
            json: true
        };
        request.get(_options, (err, res, data) => {
            if (!err && res.statusCode == 200) {
                cb(null, data);
            } else {
                cb(data, null);
            }
        });
    };
    // starts retrieving all pending requests
    _queue(0, (err, data) => {
        try {
            if (err) throw err;
            let __queue = [];
            if (data) __queue = __queue.concat(data.queue || []);
            if (data && data.count > 100) {
                let _getQueue = [];
                let totalRequests = Math.ceil(data.count / 100);
                for (let i = 1; i < totalRequests; i++) {
                    _getQueue.push(((i) => {
                        return function(_cb) {
                            _queue(i * 100, _cb);
                        }
                    })(i));
                }
                async.series(_getQueue, (_err, _data) => {
                    if (_err) {
                        callback(_err, null);
                    } else {
                        for (let j = 0, _j = _data.length; j < _j; j++) {
                            __queue = __queue.concat(_data[j].queue);
                        }
                        callback(null, __queue);
                    }
                });
            } else {
                callback(null, __queue);
            }
        } catch (e) {
            callback(e, null);
        }
    });
};



utils.isValid = (object, env, server) => {
    let publishDetails = (object && object._metadata) ? object._metadata.publish_details : object.publish_details;
    return (object && object.environment && object.environment.indexOf(env) > -1 && object.action.indexOf('cancelled') == -1 && publishDetails && publishDetails.length && _.findIndex(publishDetails, { name: server }) != -1);
};