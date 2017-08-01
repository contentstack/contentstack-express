/*!
 * contentstack-express
 * copyright (c) Built.io Contentstack
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */
var util = require('util'),
    events = require('events').EventEmitter,
    path = require('path'),
    fs = require('graceful-fs'),
    domain = require('domain'),
    async = require('async'),
    request = require("request"),
    _ = require('lodash'),
    helper = require('./helper'),
    status = require('./status-manager'),
    utils = require('./../utils/index');

var config = utils.config,
    context = utils.context,
    db = utils.db,
    log = utils.sync,
    contentTypesUid = '_content_types';

var api = config.get('contentstack'),
    headers = {
        api_key: config.get('contentstack.api_key'),
        access_token: config.get('contentstack.access_token')
    },
    languages = config.get('languages'),
    _types = config.get('contentstack.types'),
    _events = config.get('contentstack.events');

function Sync(next, isRestore) {
    // Inherit methods from EventEmitter
    events.call(this);

    // Remove memory-leak warning about max listeners
    this.setMaxListeners(0);

    // isRestore flag to determine sync is running indivisual
    if (isRestore) utils.plugin.load();

    this.on("next", next);

    this.next = _.bind(this.next, this);
}

util.inherits(Sync, events);

module.exports = Sync;

// start syncing data
Sync.prototype.start = function (data) {
    var self = this;
    try {
        var _data = data.message.body;

        // create domain context and set context data
        var d = domain.create();

        // when uncaught error or exception found then send failed status to server and proceed next queue
        d.on("error", function (err) {
            log.error("Caught exception/error: " + helper.message(err), err.stack);
            var msg = "Error: Publishing/Unpublishing failed with the error(s): " + helper.message(err);
            status(_data, {"status": 3, "stats_label": "Falied", "message": msg}, self.next);
        });

        d.add(this);

        // run syncing process within domain context
        d.run(function () {
            var body = data.message.body,
                event = (body.object.action != _events.unpublish && body.object.action != _events.delete) ? "Publish" : "Unpublish";

            log.info("'Request received' for " + event + " :: " + JSON.stringify(data.message.body));

            switch (_data.object.type) {
                case _types.entry:
                    context.set("lang", data.lang.code);
                    self.entry(data.lang, _data);
                    break;
                case _types.asset:
                    context.set("lang", data.lang.code);
                    self.asset(data.lang, _data);
                    break;
                case _types.form:
                    self.form(data.lang, _data);
                    break;
                default:
                    self.next();
            }
        });
    } catch (e) {
        log.error("Sync Start", e.message);
        self.next();
    }
};

// proceed to next queue
Sync.prototype.next = function () {
    this.emit("next");
};

// publish / unpublish entry
Sync.prototype.entry = function (lang, entry) {
    var self = this;
    try {
        var ctUID = entry.object.form.form_uid,
            entryUID = entry.object.entry.entry_uid,
            version = entry.object.entry.version,
            eventType = entry.object.action,
            remove = !(eventType != _events.unpublish && eventType != _events.delete),
            eventText = (remove) ? "Unpublish" : "Publish";

        async.waterfall([
            function (callback) {
                status(entry, {
                    "status": "1",
                    "status_label": "In progress",
                    "message": "Starting the " + eventText + "ing process."
                }, callback);
            },
            function (callback) {
                if (remove) {
                    db.ContentType(ctUID)
                        .language(lang.code)
                        .Entry(entryUID)
                        .toJSON()
                        .fetch()
                        .then(function (entry) {
                            db.ContentType(contentTypesUid)
                                .language(lang.code)
                                .Entry(ctUID)
                                .toJSON()
                                .fetch()
                                .then(function (contentType) {
                                    callback(null, {entry: entry, content_type: contentType});
                                }, function (err) {
                                    callback(err);
                                });
                        }, function (err) {
                            callback(err);
                        });
                } else {
                    var d = new Date();
                    var _url = api.host + api.urls.content_types + ctUID + api.urls.entries + entryUID;
                    request.get({
                        url: _url,
                        qs: {locale: lang.code, version: version, include_content_type: true, r: d.getTime()},
                        headers: headers,
                        json: true
                    }, function (err, res, body) {
                        if (!err && res.statusCode == 200) {
                            if (body.entry && body.content_type) {
                                body.entry = helper.updateReferences({
                                    schema: body.content_type.schema,
                                    entry: helper.deleteKeys(body.entry)
                                }).entry;
                                callback(null, body);
                            } else {
                                callback(new Error("Something went wrong. Please check the logs for more details."));
                            }
                        } else {
                            callback(body, null);
                        }
                    });
                }
            },
            function (data, callback) {
                if (!remove) {
                    var arrOfAssets = helper.getAssetsIds(data);
                    if (arrOfAssets && arrOfAssets.length) {
                        var _assets = [];
                        for (var i = 0, _i = arrOfAssets.length; i < _i; i++) {
                            _assets.push(function (i) {
                                return function (_cb) {
                                    helper.getAssets(arrOfAssets[i], lang, false, _cb);
                                }
                            }(i));
                        }
                        async.series(_assets, function (err, _data) {
                            if (!err) {
                                var __a = {};
                                for (var i = 0; i < _data.length; i++) {
                                    __a[_data[i].uid] = _data[i];
                                    data.entry = helper.replaceAssetsUrl(__a, data.content_type, data.entry);
                                }
                                callback(null, data);
                            } else {
                                callback(err, null);
                            }
                        })
                    } else {
                        callback(null, data);
                    }
                } else {
                    callback(null, data);
                }
            },
            function (data, callback) {
                var _action = (remove) ? 'beforeUnpublish' : 'beforePublish';
                helper.executePlugins({
                    type: 'entry',
                    entry: data.entry || {},
                    content_type: data.content_type,
                    language: lang,
                    action: _action
                }, callback);
            }
        ], function (error, result) {
            try {
                if (!error) {
                    if (!remove) {
                        var upsert = function () {
                            result.entry = helper.updateUrl(result.entry, result.content_type, true);
                            db.ContentType(ctUID)
                                .language(lang.code)
                                .Entry(entryUID)
                                .update(result.entry)
                                .then(function (data) {
                                    status(entry, {
                                        "status": 2,
                                        "status_label": "Publish",
                                        "message": "Entry has been published successfully."
                                    }, self.next);
                                }, function (err) {
                                    status(entry, {
                                        "status": 3,
                                        "status_label": "Fail",
                                        "message": "Error: " + eventText + "ing failed with the error(s): " + helper.message(err)
                                    }, self.next);
                                });
                        };
                        db.ContentType(contentTypesUid)
                            .language(lang.code)
                            .Entry(ctUID)
                            .toJSON()
                            .fetch()
                            .then(function (data) {
                                if (!data || (data.updated_at && data.updated_at !== result.content_type.updated_at)) {
                                    db
                                        .ContentType(contentTypesUid)
                                        .language(lang.code)
                                        .Entry(ctUID)
                                        .update(result.content_type)
                                        .then(function () {
                                            var _content_type = result.content_type;
                                            if (!data || (data.options === _content_type.options) || (data.options && _content_type.options && data.options.url_pattern === _content_type.options.url_pattern && data.options.url_prefix === _content_type.options.url_prefix)) {
                                                upsert();
                                            } else if (!_content_type.singleton && _content_type.options && ((!data.options && !_.isUndefined(_content_type.options.url_pattern)) || (data.options && data.options.url_pattern !== _content_type.options.url_pattern) || (data.options && data.options.url_prefix !== _content_type.options.url_prefix))) {
                                                async
                                                    .parallel({
                                                        routes: function (bulkCallback) {
                                                            // bulk update the entries as url pattern updates
                                                            db.ContentType("_routes")
                                                                .language(lang.code)
                                                                .Query()
                                                                .toJSON()
                                                                .find()
                                                                .spread(function (entries) {
                                                                    // update the urls value of the entries
                                                                    entries = helper.updateUrl(entries, result.content_type);
                                                                    db.ContentType("_routes")
                                                                        .language(lang.code)
                                                                        .Entry()
                                                                        .Query()
                                                                        .query({
                                                                            "_bulk_insert": true,
                                                                            "entries": entries
                                                                        })
                                                                        .update()
                                                                        .then(function () {
                                                                            bulkCallback();
                                                                        }, function (err) {
                                                                            bulkCallback({
                                                                                "status": 3,
                                                                                "status_label": "Fail",
                                                                                "message": "Error: " + eventText + "ing failed with the error(s): " + helper.message(err)
                                                                            });
                                                                        });
                                                                }, function (err) {
                                                                    bulkCallback({
                                                                        "status": 3,
                                                                        "status_label": "Fail",
                                                                        "message": "Error: " + eventText + "ing failed with the error(s): " + helper.message(err)
                                                                    });
                                                                });
                                                        },
                                                        allEntries: function (bulkCallback) {
                                                            db.ContentType(ctUID)
                                                                .language(lang.code)
                                                                .Query()
                                                                .excludeReference()
                                                                .toJSON()
                                                                .find()
                                                                .spread(function (ctEntries) {
                                                                    // update the urls value of the entries
                                                                    ctEntries = helper.updateUrl(ctEntries, result.content_type, true);
                                                                    db.ContentType(ctUID)
                                                                        .language(lang.code)
                                                                        .Entry()
                                                                        .Query()
                                                                        .query({
                                                                            "_bulk_insert": true,
                                                                            "entries": ctEntries
                                                                        })
                                                                        .update()
                                                                        .then(function () {
                                                                            bulkCallback();
                                                                        }, function (err) {
                                                                            bulkCallback({
                                                                                "status": 3,
                                                                                "status_label": "Fail",
                                                                                "message": "Error: " + eventText + "ing failed with the error(s): " + helper.message(err)
                                                                            });
                                                                        });
                                                                }, function (err) {
                                                                    bulkCallback({
                                                                        "status": 3,
                                                                        "status_label": "Fail",
                                                                        "message": "Error: " + eventText + "ing failed with the error(s): " + helper.message(err)
                                                                    });
                                                                });
                                                        }
                                                    }, function (bulkError, bulktResult) {
                                                        if (bulkError) {
                                                            status(entry, bulkError, self.next);
                                                        } else {
                                                            setTimeout(function () {
                                                                upsert();
                                                            }, 20000);
                                                        }
                                                    });
                                            } else {
                                                upsert();
                                            }
                                        }, function (err) {
                                            status(entry, {
                                                "status": 3,
                                                "status_label": "Fail",
                                                "message": "Error: " + eventText + "ing failed with the error(s): " + helper.message(err)
                                            }, self.next);
                                        });
                                } else {
                                    upsert();
                                }
                            }, function (err) {
                                status(entry, {
                                    "status": 3,
                                    "status_label": "Fail",
                                    "message": "Error: " + eventText + "ing failed with the error(s): " + helper.message(err)
                                }, self.next);
                            });
                    } else {
                        db.ContentType(ctUID)
                            .language(lang.code)
                            .Entry(entryUID)
                            .remove()
                            .then(function (data) {
                                var sts = 0,
                                    msg = "Entry has been unpublished successfully.",
                                    status_label = "Unpublish";
                                if (eventType == api.events.delete) {
                                    sts = 4;
                                    status_label = "Delete";
                                    msg = "Entry has been deleted successfully.";
                                    eventText = "Delet";
                                }
                                status(entry, {"status": sts, "status_label": status_label, "message": msg}, self.next);
                            }, function (err) {
                                status(entry, {
                                    "status": 3,
                                    "status_label": status_label,
                                    "message": "Error: " + eventText + "ing failed with the error(s): " + helper.message(err)
                                }, self.next);
                            });
                    }
                } else {
                    if (error.stack)
                        log.error(error.stack);
                    throw new Error(helper.message(error));
                }
            } catch (e) {
                status(entry, {
                    "status": 3,
                    "status_label": "Fail",
                    "message": "Error: " + eventText + "ing failed with the error(s): " + e.message
                }, self.next);
            }
        });
    } catch (e) {
        log.error("Entry Error: " + e.message);
        self.next();
    }
};

// publish / unpublish asset
Sync.prototype.asset = function (lang, asset) {
    var self = this;
    try {
        var assetUID = asset.object.entry.entry_uid,
            eventType = asset.object.action,
            remove = !(eventType != _events.unpublish && eventType != _events.delete),
            eventText = (remove) ? "Unpublish" : "Publish",
            _qs = {};

        if (asset.object.entry.version) _qs['version'] = asset.object.entry.version;
        if (asset.object.entry.locale)  _qs['locale'] = asset.object.entry.locale;

        async.waterfall([
            function (callback) {
                status(asset, {
                    "status": "1",
                    "status_label": "In progress",
                    "message": "Starting the " + eventText + "ing process."
                }, callback);
            },
            function (callback) {
                if (!remove) {
                    if (assetUID) {
                        var _url = api.host + api.urls.assets + assetUID;
                        request.get({url: _url, headers: headers, json: true, qs: _qs}, function (err, res, body) {
                            if (!err && res.statusCode == 200) {
                                if (body.upload) {
                                    body.upload.force_load = false;
                                    callback(null, body.upload);
                                } else {
                                    callback(helper.message(body), null);
                                }
                            } else if (res && res.statusCode == 404) {
                                callback("Asset does not exists.", null);
                            } else {
                                callback((err || helper.message(body)), null);
                            }
                        });
                    } else {
                        callback(null, null);
                    }
                } else {
                    // TODO:: ASSET UID is provided as of now. As one file read operation is required to provide data.
                    callback(null, assetUID);
                }
            },
            function (data, callback) {
                var _action = (remove) ? 'beforeUnpublish' : 'beforePublish';
                helper.executePlugins({type: _types.asset, asset: data, language: lang, action: _action}, callback);
            },
            function (data, callback) {
                if (assetUID) {
                    if (eventType === _events.delete) {
                        helper.deleteAssets(data.asset, lang, function (err, data) {
                            if (err) {
                                callback(err);
                            } else {
                                callback(null, data);
                            }
                        });
                    } else {
                        helper.getAssets(data.asset, lang, remove, callback);
                    }
                } else {
                    callback(null, null);
                }
            }
        ], function (error, data) {
            try {
                var sts = 2,
                    msg = "Asset has been published successfully.",
                    status_label = "Publish";
                if (eventType == _events.delete) {
                    sts = 4;
                    msg = "Asset has been deleted successfully.";
                    eventText = "Delet";
                    status_label = "Delete";
                } else if (eventType == _events.unpublish) {
                    sts = 0;
                    msg = "Asset has been unpublished successfully.";
                    status_label = "Unpublish";
                }
                if (error) {
                    sts = 3;
                    status_label = "Fail";
                    msg = "Error: " + eventText + "ing failed with the error(s): " + helper.message(error);
                }
                status(asset, {"status": sts, "status_label": status_label, "message": msg}, self.next);
            } catch (e) {
                sts = 3;
                msg = "Error: " + eventText + "ing failed with the error(s): " + e.message;
                status(asset, {"status": sts, "status_label": "Fail", "message": msg}, self.next);
            }
        });
    } catch (e) {
        log.error("Asset Error: " + e.message);
        self.next();
    }
};

// delete form
Sync.prototype.form = function (languages, form) {
    var self = this;
    try {
        var ctUID = form.object.form.form_uid;
        async.series([
                function (callback) {
                    status(form, {
                        "status": "1",
                        "status_label": "In progress",
                        "message": "Starting the deleting process."
                    }, callback);
                },
                function (callback) {
                    var calls = [];
                    for (var i in languages) {
                        calls.push((function (lang) {
                            return function (cb) {
                                db.ContentType(ctUID)
                                    .language(lang.code)
                                    .Entry()
                                    .remove()
                                    .then(function (entries) {
                                        db.ContentType(contentTypesUid)
                                            .language(lang.code)
                                            .Entry(ctUID)
                                            .remove()
                                            .then(function (contentType) {
                                                cb();
                                            }, function (err) {
                                                cb(err);
                                            });
                                    }, function (err) {
                                        cb(err);
                                    });
                            }
                        })(languages[i]));
                    }
                    async.series(calls, callback);
                }],
            function (err, data) {
                if (err) {
                    status(form, {
                        "status": 3,
                        "status_label": "Fail",
                        "message": "Error: Deleting failed with the error(s): " + helper.message(err)
                    }, self.next);
                } else {
                    status(form, {
                        "status": "4",
                        "status_label": "Delete",
                        "message": "Content Type deleted successfully."
                    }, self.next);
                }
            });
    } catch (e) {
        log.error("Form Delete Error: " + e.message);
        self.next();
    }
};
