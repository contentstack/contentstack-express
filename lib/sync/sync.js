/*!
 * contentstack-sync
 * copyright (c) Contentstack.com
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */
const domain = require('domain'),
    async = require('async'),
    request = require("request"),
    _ = require('lodash'),
    events = require('events').EventEmitter;

let helper = require('./../helper'),
    status = require('./status-manager'),
    utils = require('./../utils/index'),
    prominent = require('./../observer.js'),
    observable = new prominent(),
    config = require('./../config')(),
    context = utils.context,
    log = utils.sync,
    api = config.get('contentstack'),
    headers,
    _types = config.get('contentstack.types'),
    _events = config.get('contentstack.events');


class Sync extends events {
    constructor(next) {
        super();
        // Remove memory-leak warning about max listeners
        this.setMaxListeners(0);

        // isRestore flag to determine sync is running indivisual
        // if (isRestore) utils.plugin.load();

        this.on("next", next);

        this.next = _.bind(this.next, this);
    }

    // start syncing data
    start(data) {
        headers = {
            api_key: config.get('contentstack.api_key'),
            access_token: config.get('contentstack.access_token')
        }
        const self = this;
        try {
            let _data = data.message.body;

            // create domain context and set context data
            let d = domain.create();

            // when uncaught error or exception found then send failed status to server and proceed next queue
            d.on("error", (err) => {
                log.error("Caught exception/error: " + helper.message(err), err.stack);
                let msg = "Error: Publishing/Unpublishing failed with the error(s): " + helper.message(err);
                status(_data, { "status": 3, "stats_label": "Falied", "message": msg }, self.next);
            });

            d.add(this);

            // run syncing process within domain context
            d.run(function() {
                let body = data.message.body,
                    event = (body.object.action != _events.unpublish && body.object.action != _events.delete) ? "Publish" : "Unpublish";

                log.info("'Request received' for " + event + " :: " + JSON.stringify(data.message.body));
                switch (_data.object.type) {
                    case _types.entry:
                        context.set("lang", data.lang.code);
                        self.entry(data.lang.code, _data);
                        break;
                    case _types.asset:
                        if (_data.object.entry && _data.object.entry.is_dir && typeof _data.object.entry.is_dir === "boolean" && _data.object.entry.is_dir === true) {
                            self.bulkAssetDelete(data.lang, _data);
                        } else {
                            context.set("lang", data.lang.code);
                            self.asset(data.lang.code, _data);
                        }

                        break;
                    case _types.form:
                    case _types.content_type:
                        self.form(data.lang, _data);
                        break;
                    default:
                        self.next();
                }
            });
        } catch (e) {
            log.error("Sync Start", e);
            self.next();
        }
    }

    // proceed to next queue
    next() {
        this.emit("next");
    }

    // publish / unpublish entry
    entry(lang, entry) {
        let self = this;
        try {
            let ctUID = (entry.object.form) ? entry.object.form.form_uid : entry.object.content_type.uid,
                entryUID = (entry.object.entry.entry_uid) ? entry.object.entry.entry_uid : entry.object.entry.uid,
                version = entry.object.entry.version,
                eventType = entry.object.action,
                remove = !(eventType != _events.unpublish && eventType != _events.delete),
                eventText = (remove) ? "Unpublish" : "Publish";

            async.waterfall([
                (callback) => {
                    status(entry, {
                        "status": "1",
                        "status_label": "In progress",
                        "message": "Starting the " + eventText + "ing process."
                    }, callback);
                },
                (callback) => {
                    if (remove) {
                        // remove entry from database
                        if (entry.object.content_type) {
                            callback(null, { entry: entry.object.entry, content_type: entry.object.contentType });
                        } else if (entry.object.form) {
                            callback(null, { entry: entry.object.entry, content_type: entry.object.form });
                        }
                    } else {
                        let d = new Date();
                        let _url = api.host + '/' + api.version + api.urls.content_types + ctUID + api.urls.entries + entryUID;
                        request.get({
                            url: _url,
                            qs: { locale: lang, version: version, include_content_type: true, r: d.getTime() },
                            headers: headers,
                            json: true
                        }, (err, res, body) => {
                            if (!err && res.statusCode == 200) {
                                if (body.entry && body.content_type) {
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
                (data, callback) => {
                    callback(null, { "entry": data.entry, "content_type": data.content_type });
                }
            ], (error, result) => {
                try {
                    result['content_type_uid'] = ctUID;
                    if (!error) {
                        if (!remove) {
                            // save entry to database
                            observable.publish(result, (data) => {
                                if (data && data !== undefined) {
                                    if (data.status !== -1) {
                                        status(entry, {
                                            "status": 2,
                                            "status_label": "Publish",
                                            "message": "Entry has been published successfully."
                                        }, self.next);
                                    } else {
                                        status(entry, {
                                            "status": 3,
                                            "status_label": "Fail",
                                            "message": "Error: " + eventText + "ing failed with the error(s): " + helper.message(data.error)
                                        }, self.next);
                                    }
                                } else {
                                    status(entry, {
                                        "status": 3,
                                        "status_label": "Fail",
                                        "message": "Error: " + eventText + "ing failed with the error(s): undefined"
                                    }, self.next);
                                }
                            });
                        } else {
                            //  Remove entry from database
                            if (eventType === _events.unpublish) {
                                observable.unpublish(result, (data) => {
                                    if (data && data !== undefined) {
                                        if (data.status !== -1) {
                                            status(entry, {
                                                "status": 0,
                                                "status_label": "Unpublish",
                                                "message": "Entry has been unpublished successfully."
                                            }, self.next);

                                        } else {
                                            status(entry, {
                                                "status": 3,
                                                "status_label": "Fail",
                                                "message": "Error: " + eventText + "ing failed with the error(s): " + helper.message(data.error)
                                            }, self.next);
                                        }
                                    } else {
                                        status(entry, {
                                            "status": 3,
                                            "status_label": "Fail",
                                            "message": "Error: " + eventText + "ing failed with the error(s): undefined"
                                        }, self.next);
                                    }
                                });

                            } else if (eventType === _events.delete) {
                                observable.delete(result, (data) => {
                                    if (data && data !== undefined) {
                                        if (data.status !== -1) {
                                            status(entry, {
                                                "status": 4,
                                                "status_label": "Delete",
                                                "message": "Entry has been deleted successfully",
                                            }, self.next);

                                        } else {
                                            status(entry, {
                                                "status": 3,
                                                "status_label": "Fail",
                                                "message": "Error: " + eventText + "ing failed with the error(s): " + helper.message(data.error)
                                            }, self.next);
                                        }
                                    } else {
                                        status(entry, {
                                            "status": 3,
                                            "status_label": "Fail",
                                            "message": "Error: " + eventText + "ing failed with the error(s): undefined"
                                        }, self.next);
                                    }
                                });
                            }
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

                    observable.onError();
                }
            });
        } catch (e) {
            log.error("Entry Error: " + e.message);
            self.next();
        }
    }

    // publish / unpublish asset
    asset(lang, asset) {
        let self = this;
        try {

            let assetUID = (asset.object.entry.entry_uid) ? asset.object.entry.entry_uid : asset.object.entry.uid,
                eventType = asset.object.action,
                remove = !(eventType != _events.unpublish && eventType != _events.delete),
                eventText = (remove) ? "Unpublish" : "Publish",
                _qs = {};

            if (asset.object.entry.version) _qs['version'] = asset.object.entry.version;
            if (asset.object.entry.locale) _qs['locale'] = asset.object.entry.locale;

            async.waterfall([
                (callback) => {
                    status(asset, {
                        "status": "1",
                        "status_label": "In progress",
                        "message": "Starting the " + eventText + "ing process."
                    }, callback);
                },
                (callback) => {
                    if (!remove) {
                        if (assetUID) {
                            let _url = api.host + '/' + api.version + api.urls.assets + assetUID;
                            request.get({ url: _url, headers: headers, json: true, qs: _qs }, (err, res, body) => {
                                if (!err && res.statusCode == 200) {
                                    if (body.asset) {
                                        body.asset.force_load = false;
                                        callback(null, body.asset);
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
                (data, callback) => {
                    callback(null, { "asset": data });
                },
                (data, callback) => {
                    if (assetUID) {
                        callback(null, data);
                    } else {
                        callback(null, null);
                    }
                }
            ], (error, result) => {
                try {
                    result['_uid'] = assetUID;
                    result['_content_type_uid'] = '_assets';
                    result['_locale'] = lang;
                    if (!error) {
                        if (eventType === _events.delete) {
                            observable.delete(result, (data) => {
                                if (data && data !== undefined) {
                                    if (data.status !== -1) {
                                        status(asset, {
                                            "status": 4,
                                            "status_label": "Delete",
                                            "message": "Asset has been deleted successfully",
                                        }, self.next);

                                    } else {
                                        status(asset, {
                                            "status": 3,
                                            "status_label": "Fail",
                                            "message": "Error: " + eventText + "ing failed with the error(s): " + helper.message(data.error)
                                        }, self.next);
                                    }
                                } else {
                                    status(asset, {
                                        "status": 3,
                                        "status_label": "Fail",
                                        "message": "Error: " + eventText + "ing failed with the error(s): undefined"
                                    }, self.next);
                                }

                            });

                        } else if (eventType === _events.unpublish) {
                            observable.unpublish(result, (data) => {
                                if (data && data !== undefined) {
                                    if (data.status !== -1) {
                                        status(asset, {
                                            "status": 0,
                                            "status_label": "Unpublish",
                                            "message": "Asset has been unpublished successfully."
                                        }, self.next);

                                    } else {
                                        status(asset, {
                                            "status": 3,
                                            "status_label": "Fail",
                                            "message": "Error: " + eventText + "ing failed with the error(s): " + helper.message(data.error)
                                        }, self.next);
                                    }
                                } else {
                                    status(asset, {
                                        "status": 3,
                                        "status_label": "Fail",
                                        "message": "Error: " + eventText + "ing failed with the error(s): undefined"
                                    }, self.next);
                                }

                            });
                        } else {
                            observable.publish(result, (data) => {
                                if (data && data !== undefined) {
                                    if (data.status !== -1) {
                                        status(asset, {
                                            "status": 2,
                                            "status_label": "Publish",
                                            "message": "Asset has been published successfully."
                                        }, self.next);
                                    } else {
                                        status(asset, {
                                            "status": 3,
                                            "status_label": "Fail",
                                            "message": "Error: " + eventText + "ing failed with the error(s): " + helper.message(data.error)
                                        }, self.next);
                                    }
                                } else {
                                    status(asset, {
                                        "status": 3,
                                        "status_label": "Fail",
                                        "message": "Error: " + eventText + "ing failed with the error(s): undefined"
                                    }, self.next);
                                }
                            });
                        }
                    } else {
                        status(asset, {
                            "status": 3,
                            "status_label": "Fail",
                            "message": "Error: " + eventText + "ing failed with the error(s): " + helper.message(error)
                        }, self.next);
                    }

                } catch (e) {
                    status(asset, {
                        "status": 3,
                        "status_label": "Fail",
                        "message": "Error: " + eventText + "ing failed with the error(s): " + e.message
                    }, self.next);

                    observable.onError();
                }
            });
        } catch (e) {
            log.error("Asset Error: " + e.message);
            self.next();
        }
    }

    // delete form
    form(languages, form) {
        let self = this;
        try {
            let ctUID = (form.object.form) ? form.object.form.form_uid : form.object.content_type.uid;
            async.series([
                    (callback) => {
                        status(form, {
                            "status": "1",
                            "status_label": "In progress",
                            "message": "Starting the deleting process."
                        }, callback);
                    },
                    (callback) => {
                        let calls = [];
                        for (let i in languages) {
                            calls.push((function(lang) {
                                return function(cb) {
                                    let result = {
                                        _uid: ctUID,
                                        _content_type_uid: '_content_types',
                                        _locale: lang.code,
                                    };
                                    observable.delete(result, (data) => {
                                        if (data && data !== undefined) {
                                            if (data.status !== -1) {
                                                status(form, {
                                                    "status": 4,
                                                    "status_label": "Delete",
                                                    "message": "Content Type deleted successfully.",
                                                }, self.next);

                                            } else {
                                                status(form, {
                                                    "status": 3,
                                                    "status_label": "Fail",
                                                    "message": "Error: Deleting failed with the error(s): " + helper.message(data.error)
                                                }, self.next);
                                            }
                                        } else {
                                            status(form, {
                                                "status": 3,
                                                "status_label": "Fail",
                                                "message": "Error: Deleting failed with the error(s): undefined"
                                            }, self.next);
                                        }
                                    });
                                    cb();
                                }
                            })(languages[i]));
                        }
                        async.series(calls, callback);
                    }
                ],
                (err) => {
                    if (err) {
                        status(form, {
                            "status": 3,
                            "status_label": "Fail",
                            "message": "Error: Deleting failed with the error(s): " + helper.message(err)
                        }, self.next);
                        observable.onError();
                    }
                });
        } catch (e) {
            log.error("Form Delete Error: " + e.message);
            self.next();
        }
    }

    // bulk asset delete operation
    bulkAssetDelete(languages, folder) {
        let self = this;
        try {
            let folderUid = (folder.object.entry.entry_uid) ? folder.object.entry.entry_uid : folder.object.entry.uid;
            async
            .series([
                    (callback) => {
                        status(folder, {
                            "status": "1",
                            "status_label": "In progress",
                            "message": "Starting the deleting process."
                        }, callback);
                    },
                    (callback) => {
                        let calls = [];
                        for (let i in languages) {
                            calls.push((function(language) {
                                return function(cb) {
                                    let _calls = [];
                                    let _data = {
                                        _content_type_uid: '_assets',
                                        _locale: language.code,
                                        parent_uid: folderUid
                                    }
                                    let folderkeys = {
                                        _uid: folderUid,
                                        _content_type_uid: '_assets',
                                        _locale: language.code
                                    }
                                    observable.findData(_data, (data) => {
                                        try {
                                            if (data.assets && data.assets.length) {
                                                let assetsIds = _.map(data.assets, 'uid');
                                                let limit = 100,
                                                    totalRequests = Math.ceil(assetsIds.length / limit),
                                                    _requests = [];
                                                for (let j = 0, _j = totalRequests; j < _j; j++) {
                                                    _requests.push(function(j) {
                                                        return function(_cb) {
                                                            let _assetsIds = assetsIds.slice((j * limit), (j * limit) + limit)
                                                            request({
                                                                url: api.host + '/' + api.version + api.urls.assets,
                                                                headers: headers,
                                                                method: "POST",
                                                                qs: { limit: limit },
                                                                json: {
                                                                    "_method": "GET",
                                                                    "query": { "uid": { "$in": _assetsIds } }
                                                                }
                                                            }, (err, res, body) => {
                                                                if (!err && res.statusCode == 200 && body && body.assets) {
                                                                    let __assetsIds = _.difference(_assetsIds, _.map(body.assets, "uid"));
                                                                    if (__assetsIds.length) {
                                                                        for (let i = 0, _i = __assetsIds.length; i < _i; i++) {
                                                                            _calls.push((function(assetUid) {
                                                                                return function(__cb) {
                                                                                    let result = {
                                                                                        _uid: assetUid,
                                                                                        _content_type_uid: '_assets',
                                                                                        _locale: language.code
                                                                                    };
                                                                                    observable.delete(result, (assetData) => {
                                                                                        if (assetData && assetData !== undefined) {
                                                                                            if (assetData.status !== -1) {
                                                                                                __cb(null, null);
                                                                                            }
                                                                                        }
                                                                                    });

                                                                                }
                                                                            })(__assetsIds[i]));
                                                                        }
                                                                    }
                                                                    async.series(_calls, (err) => {
                                                                        if (!err) {
                                                                            _cb();
                                                                        } else {
                                                                            cb(err)
                                                                        }
                                                                    });
                                                                } else {
                                                                    _cb(body);
                                                                }
                                                            });
                                                        }
                                                    }(j));
                                                }
                                                async.series(_requests, (err) => {
                                                    if (!err) {
                                                        observable.delete(folderkeys, (data) => {
                                                            if (data.status !== -1) {
                                                                status(folder, {
                                                                    "status": 4,
                                                                    "status_label": "Delete",
                                                                    "message": "Folder deleted successfully",
                                                                }, self.next);
                                                            } else {
                                                                status(folder, {
                                                                    "status": 3,
                                                                    "status_label": "Fail",
                                                                    "message": "Error: Deleting failed with the error(s): " + helper.message(data.error)
                                                                }, self.next);
                                                            }
                                                        })
                                                        cb()
                                                    }
                                                })
                                            } else {
                                                observable.delete(folderkeys, (data) => {
                                                    if (data.status !== -1) {
                                                        status(folder, {
                                                            "status": 4,
                                                            "status_label": "Delete",
                                                            "message": "Folder deleted successfully",
                                                        }, self.next);
                                                    } else {
                                                        status(folder, {
                                                            "status": 3,
                                                            "status_label": "Fail",
                                                            "message": "Error: Deleting failed with the error(s): " + helper.message(data.error)
                                                        }, self.next);
                                                    }
                                                })
                                                cb()
                                            }
                                        } catch (e) {
                                            log.error("Folder Delete Error: " + e.message);
                                            self.next();
                                        }
                                    });
                                }
                            })(languages[i]));
                        }
                        async.series(calls, (err) => {
                            if (err) {
                                callback(err);
                            } else {
                                callback(null, null);
                            }
                        });
                    }
                ],
                (err) => {
                    if (err) {
                        status(folder, {
                            "status": 3,
                            "status_label": "Fail",
                            "message": "Error: Deleting failed with the error(s): " + helper.message(err)
                        }, self.next);
                        observable.onError();
                    }
                });
        } catch (e) {
            log.error("Folder Delete Error: " + e.message);
            self.next();
        }
    }
}

module.exports = Sync;