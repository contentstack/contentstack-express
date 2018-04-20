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
    statusUpdater = require('./status-manager'),
    utils = require('./../utils/index'),
    InMemory = require('../utils/db/inmemory');

var config = utils.config,
    context = utils.context,
    db = utils.db,
    log = utils.sync,
    contentTypesUid = '_content_types',
    _routes = '_routes';

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
            self.updateEntityStatus({isItem: _data.hasOwnProperty('item'), status: 3, event: 'publishing/unpublishing', message: helper.message(err)});
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
                    if (_data.object.entry && _data.object.entry.is_dir && typeof _data.object.entry.is_dir === "boolean" && _data.object.entry.is_dir === true) {
                        self.bulkAssetDelete(data.lang, _data);
                    } else {
                        context.set("lang", data.lang.code);
                        self.asset(data.lang, _data);
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
        log.error("Sync Start", e.message);
        self.next();
    }
};

// proceed to next queue
Sync.prototype.next = function (objekt) {
    this.emit("next", objekt);
};

// publish / unpublish entry
Sync.prototype.entry = function (lang, entry) {
    var self = this;
    try {
        var ctUID = (entry.object.form) ? entry.object.form.form_uid : entry.object.content_type.uid,
            entryUID = (entry.object.entry.entry_uid) ? entry.object.entry.entry_uid : entry.object.entry.uid,
            version = entry.object.entry.version,
            eventType = entry.object.action,
            remove = !(eventType != _events.unpublish && eventType != _events.delete),
            eventText = (remove) ? "Unpublish" : "Publish";
        var isItem = entry.hasOwnProperty('item');

        async.waterfall([
            function (callback) {
                if (!isItem)
                    return self.updateEntityStatus({isItem: false, objekt: entry, status: 1, event: eventType.toLowerCase(), callback: callback});
                else
                    return callback(null);
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
                                    return callback(null, {entry: entry, content_type: contentType});
                                }, function (err) {
                                    return callback(err);
                                });
                        }, function (err) {
                            return callback(err.message || err);
                        });
                } else {
                    var d = new Date();
                    var _url = api.host + '/' + api.version + api.urls.content_types + ctUID + api.urls.entries + entryUID;
                    request.get({
                        url: _url,
                        qs: {
                            locale: (entry.object && entry.object.entry && entry.object.entry.hasOwnProperty('locale')) ? entry.object.entry.locale: lang.code,
                            version: version, 
                            include_content_type: true, r: d.getTime()
                        },
                        headers: headers,
                        json: true
                    }, function (error, response, body) {
                        if (error) {
                            return callback(error);
                        } else if (response.statusCode !== 200 || (typeof body === 'object' && !body.hasOwnProperty('entry') || !body.hasOwnProperty('content_type'))) {
                            return callback((body && body.hasOwnProperty("error_message")) ? body.error_message: JSON.stringify(body));
                        } else {
                            body.entry = helper.updateReferences({
                                schema: body.content_type.schema,
                                entry: helper.deleteKeys(body.entry)
                            }).entry;
                            return callback(null, body);                            
                        }
                    });
                }
            },
            // If its a publish call, finds assets and updates mapper + handles asset fetching and updating
            function (data, callback) {
                if (!remove) {
                    return self.processAssets(lang, data, callback);
                } else {
                    return callback(null, data);
                }
            },
            function (data, callback) {
                var _action = (remove) ? 'beforeUnpublish' : 'beforePublish';
                helper.executePlugins({
                    type: 'entry',
                    entry: data.entry,
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
                            db.ContentType(ctUID)
                                .language(lang.code)
                                .Entry(entryUID)
                                .update(result.entry)
                                .then(function (data) {
                                    var _updateMapping = self.updateMapper(lang.code, _.cloneDeep(result), 'entries', remove);
                                    _updateMapping(function (error, success) {
                                        if (error)
                                            return self.updateEntityStatus({isItem: isItem, objekt: entry, status: 3, event: eventType.toLowerCase(), message: helper.message(error)});
                                        return self.updateEntityStatus({isItem: isItem, type: 'Entry', objekt: entry, status: 2, event: eventType.toLowerCase()});
                                    });
                                }, function (error) {
                                    return self.updateEntityStatus({isItem: isItem, objekt: entry, status: 3, event: eventType.toLowerCase(), message: helper.message(error)});
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
                                            upsert();
                                        }, function (error) {
                                            return self.updateEntityStatus({isItem: isItem, objekt: entry, status: 3, event: eventType.toLowerCase(), message: helper.message(error)});
                                        });
                                } else {
                                    upsert();
                                }
                            }, function (error) {
                                return self.updateEntityStatus({isItem: isItem, objekt: entry, status: 3, event: eventType.toLowerCase(), message: helper.message(error)});
                            });
                    } else {
                        db.ContentType(ctUID)
                            .language(lang.code)
                            .Entry(entryUID)
                            .remove()
                            .then(function (data) {
                                var _updateMapping = self.updateMapper(lang.code, _.cloneDeep(result), 'entries', remove);
                                _updateMapping(function (error, success) {
                                    if (error) {
                                        return self.updateEntityStatus({isItem: isItem, objekt: entry, status: 3, event: eventType.toLowerCase(), message: helper.message(error)});
                                    } else {
                                        var status = (eventType === api.events.delete) ? 4: 0;
                                        return self.updateEntityStatus({isItem: isItem, objekt: entry, status: status, type: 'Entry'})
                                    }
                                });
                            }, function (error) {
                                return self.updateEntityStatus({isItem: isItem, objekt: entry, status: 3, event: eventType.toLowerCase(), message: helper.message(error)});
                            });
                    }
                } else {
                    if (error.stack)
                        log.error(error.stack);
                    throw new Error(error);
                }
            } catch (error) {
                return self.updateEntityStatus({isItem: isItem, objekt: entry, status: 3, event: eventType.toLowerCase(), message: helper.message(error)});
            }
        });
    } catch (error) {
        log.error("Entry Error: " + helper.message(error));
        self.next();
    }
};

/**
 * Updates the status of the object being processed
 * @param  {boolean} isItem  : Indicates if the object passed is part of a release
 * @param  {object}  objekt  : Object that's being processed
 * @param  {number}  status  : The status to be updated
 * @param  {string}  event   : The event that's being fired
 * @param  {string}  message : Message in case of error
 * @return {function}        : Return error first callback
 */

Sync.prototype.updateEntityStatus = function (arg) {
    if (arg.isItem) {
        if (arg.objekt && arg.objekt.item) {
            arg.objekt.item.status = arg.status;
            if (arg.message)
                arg.objekt.item.error = arg.message;
        }
        return this.next(arg.objekt.item);
    }

    switch (arg.status) {
        case 0:
            return statusUpdater(arg.objekt, {
                status: arg.status,
                status_label: "Unpublish",
                message: arg.type + " has been unpublished successfully!"
            }, this.next);
            break;
        case 1:
            return statusUpdater(arg.objekt, {
                status: arg.status,
                status_label: "In-progress",
                message: "Starting the '" + arg.event + "' process."
            }, arg.callback);
            break;
        case 2:
            return statusUpdater(arg.objekt, {
                status: arg.status,
                status_label: "Publish",
                message: arg.type + " has been published successfully!"
            }, this.next);
            break;
        case 3:
            return statusUpdater(arg.objekt, {
                status: arg.status,
                status_label: "Fail",
                message: "Error: '" + arg.event + "' failed with the error's: " + arg.message
            }, this.next);
            break;
        case 4:
            return statusUpdater(arg.objekt, {
                status: arg.status,
                status_label: "Delete",
                message: arg.type + " has been deleted successfully!"
            }, this.next);
            break;
        default:
    }
}

/**
 * Updates the assets mapping file
 * @param  {Object} data    : data.entry contains the entry that was published
 *                          : data.content_type contains the content_type it belongs to
 * @return {Function}       : Error first callback, indicating the status of the method's success
 */

Sync.prototype.updateMapper = function (lang, data, objekt, remove) {
    var self = this;
    return function (callback) {
        try {
            if (data.hasOwnProperty('entry') && data.entry === null) return callback(null, null);
            var wrapper = {}, mapped_assets;
            // Exec this when an entry has been published
            if (objekt === 'entries' && typeof remove === 'boolean' && !remove) {
                var asset_paths = [],
                    _mapped_assets = [];

                asset_paths = findReferences(data.content_type.schema);
                _mapped_assets = _.compact(_.flattenDeep(asset_paths.map(function (path) {
                    var _tmpAssets = self.getAssets(data.entry, path.split('.'));
                    return _tmpAssets.map(function (sub_obj) {
                        // If asset is single object
                        if (_.isPlainObject(sub_obj) && _.has(sub_obj, 'uid')) {
                            var _obj = {};
                            _obj['uid'] = sub_obj.uid;
                            _obj['path'] = path;
                            return _obj;
                        } else if (_.isArray(sub_obj)) {
                            // If asset is multiple at the path
                            return sub_obj.map(function (_sub_sub_obj) {
                                if (_.has(_sub_sub_obj, 'uid')) {
                                    var _obj = {};
                                    _obj['uid'] = _sub_sub_obj.uid;
                                    _obj['path'] = path;
                                    return _obj;
                                }
                            });
                        }
                    });
                })));

                _mapped_assets.map(function (mapped_asset) {
                    if (_.has(wrapper, mapped_asset.uid))
                        wrapper[mapped_asset.uid].push(mapped_asset.path);
                    else {
                        wrapper[mapped_asset.uid] = [];
                        wrapper[mapped_asset.uid].push(mapped_asset.path);
                    }
                });

                for (var key in wrapper) {
                    wrapper[key] = _.uniq(wrapper[key]);
                }
            }

            /**
             * Using Query builder instead of direct i/o on fs
             */
            mapped_assets = InMemory.get(lang, '_assetMapper', {}, true);
            mapped_assets = (_.isArray(mapped_assets) && mapped_assets.length) ? mapped_assets[0]['_data'] : {};

            return self._updateMapper(lang, data, objekt, remove, mapped_assets, wrapper).then(function () {
                return callback(null, null);
            }).catch(function (err) {
                return callback(err);
            });
        } catch (err) {
            return callback(err);
        }
    }
}

Sync.prototype.getAssets = function (entry, pathArr) {
    var _pathArrLen = pathArr.length, objs = [];

    function _get(obj, _path, i) {
        if (_.isArray(obj)) {
            obj.map(function (sub) {
                _get(sub, _path, i);
            });
        } else if (_.isPlainObject(obj, _path) && _.has(obj, _path)) {
            if (i === _pathArrLen - 1)
                objs.push(obj[_path]);
            else {
                i++;
                return _get(obj[_path], pathArr[i], i);
            }
        }
    }

    _get(entry, pathArr[0], 0);
    return objs;
}

/**
 * Updates the mapper with the published entry
 * @param  {String} lang            : locale of the published entry
 * @param  {Object} data            : json data of the published entry
 * @param  {Object} mapped_assets   : previously mapped asset details
 * @param  {Object} wrapper         : object containing the current entry's asset mapping details
 * @return {Function}               : promise method to indicate the status of the function's process
 */

Sync.prototype._updateMapper = function (lang, data, objekt, remove, mapped_assets, wrapper) {
    return new Promise(function (resolve, reject) {
        if (remove) {
            if (objekt === 'entries') {
                if (_.has(mapped_assets, data.content_type.uid)) {
                    if (_.has(mapped_assets[data.content_type.uid], data.entry.uid))
                        delete mapped_assets[data.content_type.uid][data.entry.uid];
                    else
                        return resolve();
                } else {
                    return resolve();
                }

            } else if (objekt === 'content_type') {
                if (_.has(mapped_assets, data.content_type.uid))
                    delete mapped_assets[data.content_type.uid];
                else
                    return resolve();
            } else {
                return reject(new Error('Should\'nt have come here'));
            }
        } else {
            if (_.has(mapped_assets, data.content_type.uid)) {
                mapped_assets[data.content_type.uid][data.entry.uid] = wrapper;
            } else {
                mapped_assets[data.content_type.uid] = {};
                mapped_assets[data.content_type.uid][data.entry.uid] = wrapper;
            }
        }

        db.ContentType('_assetMapper').language(lang).Entry('assetMapper').update(mapped_assets).then(function (result) {
            // Update mapper onto InMemory
            InMemory.set(lang, '_assetMapper', null, [{
                _data: mapped_assets,
                _uid: 'assetMapper',
                _content_type_uid: '_assetMapper'
            }], true);
            return resolve();
        }, function (err) {
            return reject(new Error('Error upserting asset mapper file!'));
        });
    });
}

/**
 * Handle finding asset IDS, in files and RTE, and get assets
 * @param  {Object} data    : data.entry contains the entry that was published
 *                          : data.content_type contains the content_type it belongs to
 * @return {Function}       : Error first callback, indicating the status of the method's success
 */

Sync.prototype.processAssets = function (lang, data, callback) {
    try {
        var arrOfAssets = helper.getAssetsIds(data, lang.code);
        if (arrOfAssets && arrOfAssets.length) {
            var _assets = [];
            for (var i = 0, _i = arrOfAssets.length; i < _i; i++) {
                _assets.push(function (i) {
                    return function (_cb) {
                        return helper.getAssets(arrOfAssets[i], lang, false, _cb);
                    }
                }(i));
            }
            async.series(_assets, function (err, _data) {
                if (!err) {
                    var __a = {};
                    for (var i = 0; i < _data.length; i++) {
                        if (!_data[i].download_id) {
                            __a[_data[i].uid] = _data[i];
                        } else {
                            __a[_data[i].download_id] = _data[i];
                        }
                    }
                    data.entry = helper.replaceAssetsUrl(__a, data.content_type, data.entry, lang);
                    return callback(null, data);
                } else {
                    return callback(err, null);
                }
            })
        } else {
            return callback(null, data);
        }
    } catch (error) {
        return callback(error);
    }

}


/**
 * Finds reference fields in schema and notes them
 * @param  {Object} schema    : Schema to be traversed
 * @param  {String} uid       : Help's to check self referencing content types
 */

function findReferences(schema) {
    var assetPaths = [];
    traverseSchemaWithPath(schema, function (path, field) {
        if (field.data_type === 'file') {
            assetPaths.push(path);
        } else if (!field.hasOwnProperty('data_type')) {
        }
    }, false);
    return assetPaths;
}

function traverseSchemaWithPath(schema, fn, path) {
    path = path || '';
    function getPath(uid) {
        return (path === '') ? uid : [path, uid].join('.');
    }

    var promises = schema.map(function (field) {
        var pth = getPath(field.uid);

        if (field.data_type === 'group') {
            return traverseSchemaWithPath(field.schema, fn, pth);
        } else if (field.data_type === 'blocks') {
            for (var i = 0, _i = field.blocks.length; i < _i; i++) {
                // Update 'pth'. Add field's parent ID to modular block path
                traverseSchemaWithPath(field.blocks[i].schema, fn, pth + "." + field.blocks[i].uid);
            }
        } else {
            return fn(pth, field);
        }
    });
    return _.flatten(_.compact(promises));
}

// publish / unpublish asset
Sync.prototype.asset = function (lang, asset) {
    var self = this;
    try {
        var assetUID = (asset.object.entry.entry_uid) ? asset.object.entry.entry_uid : asset.object.entry.uid,
            eventType = asset.object.action,
            remove = !(eventType != _events.unpublish && eventType != _events.delete),
            eventText = (remove) ? "Unpublish" : "Publish",
            _qs = {};
        var isItem = asset.hasOwnProperty('item');
        if (asset.object.entry.version) _qs['version'] = asset.object.entry.version;
        if (asset.object.entry.locale) _qs['locale'] = asset.object.entry.locale;

        async.waterfall([
            function (callback) {
                if (!isItem)
                    return self.updateEntityStatus({isItem: false, objekt: asset, status: 1, event: eventText.toLowerCase(), callback: callback});
                else
                    return callback(null);
            },
            function (callback) {
                if (!remove) {
                    if (assetUID) {
                        self.fetchAssetDetails(assetUID, _qs).then(function (assetMetadata) {
                            self.updateAssetReferences(assetUID, asset.object.locale, remove, assetMetadata, eventType).then(function () {
                                return callback(null, assetMetadata);
                            }).catch(function (err) {
                                return callback(err);
                            })
                        }).catch(function (err) {
                            return callback(err);
                        });
                    } else {
                        return callback(null, null);
                    }
                } else {
                    self.updateAssetReferences(assetUID, asset.object.locale, remove, {}, eventType).then(function () {
                        return callback(null, assetUID);
                    });
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
                            if (!err) {
                                self.updateAssetReferences(assetUID, asset.object.locale, remove, {}, eventType).then(function () {
                                    return callback(null, null);
                                });
                            } else {
                                return callback(err);
                            }
                        })
                    } else {
                        return helper.getAssets(data.asset, lang, remove, callback);
                    }
                } else {
                    return callback(null, null);
                }
            }
        ], function (error, data) {
            try {
                if (error)
                    throw error;
                var status = 2;
                if (eventType === _events.delete) {
                    status = 4;
                } else if (eventType == _events.unpublish) {
                    status = 0;
                }
                return self.updateEntityStatus({isItem: isItem, type: 'Asset', objekt: asset, status: status});
            } catch (error) {
                return self.updateEntityStatus({isItem: isItem, type: 'Asset', objekt: asset, message: helper.message(error), status: 3});
            }
        });
    } catch (error) {
        log.error("Asset Error: " + helper.message(error));
        self.next();
    }
};


/**
 * Get published asset details
 * @param  {String} _url    : API to fetch the published assets details
 * @param  {Object} _qs     : Contains the locale & version details of the asset
 * @return {Function}       : Error first callback, returns the status of the function's operation
 */

Sync.prototype.fetchAssetDetails = function (uid, _qs) {
    return new Promise(function (resolve, reject) {
        try {
            var _url = api.host + '/' + api.version + api.urls.assets + uid;
            request.get({
                url: _url,
                headers: headers,
                json: true,
                qs: _qs
            }, function (err, res, body) {
                if (!err && res.statusCode === 200) {
                    if (body.asset) {
                        body.asset.force_load = false;
                        return resolve(body.asset);
                    } else {
                        return reject(helper.message(body));
                    }
                } else if (res && res.statusCode === 404) {
                    return reject((body && body.error_message) ? body.error_message: "Asset was not found.");
                } else {
                    return reject((err || helper.message(body)));
                }
            });
        } catch (error) {
            return reject(error);
        }
    });
}


/**
 * Handles updating the entries where the current asset is referred
 * @param  {String} uid                     : Asset uid
 * @param  {Object} qs                      : qs.locale contains the locale where the action is to be performed
 *                                          : qs.version contains the version of the asset
 * @param  {Boolean} remove                 : Flag, which determines if the asset is for publish/unpublish
 * @param  {Object/undefined} metadata      : Type 'Object' when asset is being published, 'undefined' otherwise
 * @return {Function}                       : Error first callback, returns the status of the function's operation
 */

Sync.prototype.updateAssetReferences = function (uid, locales, remove, metadata, eventType) {
    var self = this;
    return new Promise(function (resolve, reject) {
        try {
            var _locale_objs = config.get('languages');

            async.eachLimit(locales, 1, function (lang, cb) {
                var _data = {},
                    _mapped_assets = [],
                    asset_references = [];

                // Step 1: Read Mapper file

                // Build asset._internal_url for asset if its an publish event
                if (!remove) {
                    var assetsConf = config.get('assets'),
                        _lang_obj = {},
                        paths = {};
                    /**
                     * Generate the published asset's _internal_url
                     */

                    // Get the current lang object
                    _lang_obj = _.find(_locale_objs, {code: lang});

                    // Generate the full assets url from the given url
                    function getAssetUrl(assetUrl) {
                        assetUrl = assetsConf.relative_url_prefix + assetUrl;
                        if (!(_lang_obj.relative_url_prefix === "/" || _lang_obj.host)) {
                            assetUrl = _lang_obj.relative_url_prefix.slice(0, -1) + assetUrl;
                        }
                        return assetUrl;
                    }

                    // Used to generate asset path from keys using asset
                    function urlFromObject(_asset) {
                        var values = [],
                            _keys = assetsConf.keys;

                        for (var a = 0, _a = _keys.length; a < _a; a++) {
                            if (_keys[a] == "uid") {
                                values.push((_asset._metadata && _asset._metadata.object_id) ? _asset._metadata.object_id : _asset.uid);
                            } else if (_asset[_keys[a]]) {
                                values.push(_asset[_keys[a]]);
                            } else {
                                throw new TypeError("'" + _keys[a] + "' key is undefined in asset object.");
                            }
                        }
                        return values;
                    }

                    paths = urlFromObject(metadata);
                    metadata._internal_url = getAssetUrl(paths.join('/'));
                }

                // Get assets from InMemory, avoid using Query-Builder (uses FS i/o)
                _mapped_assets = InMemory.get(lang, '_assetMapper', {}, true);
                _mapped_assets = (_.isArray(_mapped_assets) && _mapped_assets.length) ? _.cloneDeep(_mapped_assets[0]['_data']) : {};

                _data = _.cloneDeep(_mapped_assets);

                // Step 2: Find the 'Content Types' & 'Entry Uids' where it has been referred
                //         Track in _assetMapper
                asset_references = trackAssets(_data, uid, false);

                // Step 3: Return if the asset is not referred anywhere
                if (_.isEmpty(asset_references))
                    return cb();

                // Step 4: If remove, update the mapper file for the specified language
                //         Else, find content_type, update each entry where it has been referred, and upsert it backonto the disk
                return self.realignMapperDocument(uid, _data, asset_references, remove, metadata, lang, eventType, cb);
            }, function (err) {
                if (err)
                    return reject(err);
                return resolve();
            });
        } catch (err) {
            return reject(err);
        }
    });
}

Sync.prototype.realignMapperDocument = function (asset_uid, _data, asset_references, remove, metadata, lang, eventType, cb) {
    var self = this;
    // Group entries based on their content_type_uid, for optimization
    var grouped = _.groupBy(asset_references, 'content_type_uid');
    async.eachLimit(grouped, 1, function (grp, _cb) {
        self.updateReferences(asset_uid, grp, remove, lang, metadata, eventType, _cb);
    }, function (err) {
        if (err)
            return cb(err);

        if (remove && eventType === 'delete') {
            var flag = trackAssets(_data, asset_uid, remove);
            if (!flag)
                return cb();
            db.ContentType('_assetMapper').language(lang).Entry('assetMapper').update(_data).then(function (result) {
                return cb();
            }, function (err) {
                return cb(new Error('Error upserting asset mapper file!'));
            });
        } else {
            return cb();
        }
    });
}

function trackAssets(_data, uid, remove) {
    var content_type_ids = Object.keys(_data),
        delFlag = false,
        asset_references = [];

    content_type_ids.map(function (content_type_id) {
        var entry_ids = Object.keys(_data[content_type_id]);
        entry_ids.map(function (entry_id) {
            if (remove) {
                // Remove the mapping from here : since the asset is being un-published/deleted
                if (_.has(_data[content_type_id][entry_id], uid)) {
                    delFlag = true;
                    delete _data[content_type_id][entry_id][uid];
                }
            } else {
                // This will return the paths in that entry, where the current asset has been referred
                var paths = _data[content_type_id][entry_id][uid];
                if (!_.isEmpty(paths)) {
                    asset_references.push({
                        entry_uid: entry_id,
                        // The path where the asset would be found in the specified entry
                        path: paths,
                        content_type_uid: content_type_id
                    });
                }
            }
        });
    });

    if (remove)
        return delFlag;
    return asset_references;
}

/**
 * Updates each entry where the published asset has been referred
 * @param  {Object}   asset_reference       : asset_reference.entry_uid {String} contains the uid of the entry to be updated
 *                                          : asset_reference.path {Object|Array} contains the path where all the asset has been referred
 *                                          : asset_reference.content_type_uid contains the path of the content type of the entry
 * @param  {Function} callback              : Return function
 * @return {Function}                       : Error first callback, returns the status of the function's operation
 */

Sync.prototype.updateReferences = function (asset_uid, asset_reference, remove, lang, metadata, eventType, callback) {
    var self = this;
    db.ContentType(asset_reference[0].content_type_uid).Query().toJSON().language(lang).excludeUnpublishDeletion().excludeReference().find().spread(function (result) {
        var entries = (result.length) ? result : [];
        if (_.isEmpty(entries))
            return callback();
        entries = _.map(entries, function (entry) {
            asset_reference.map(function (obj, index, collection) {
                if (entry.uid === obj.entry_uid) {
                    obj.path.map(function (pth) {
                        var assets = self.getAssets(entry, pth.split('.'));
                        _modify_referred_assets(assets, remove, asset_uid, metadata, eventType);
                    });
                }
            });
            return entry;
        });

        // Remove empty && null objects left behind by _modify_referred_assets
        if(eventType === 'delete')
            cleanEntries(entries);

        // Bulk insert the data back onto the fs
        db.ContentType(asset_reference[0].content_type_uid).language(lang).Entry().Query().query({
            _bulk_insert: true,
            'entries': entries
        }).update().then(function () {
            return callback();
        }, function (err) {
            return callback(new Error('Data corruption during asset mapper bulk insert operation!'));
        });
    }, function (err) {
        return callback(new Error('Could not retrive asset mapper contents. Skipping asset mapper'));
    });
}


function _modify_referred_assets(assets, remove, asset_uid, metadata, eventType) {
    function _modify(objekt) {
        if (_.isPlainObject(objekt)) {
            if (_.has(objekt, 'filename') && _.has(objekt, 'uid')) {
                if (!remove && objekt.uid === metadata.uid) {
                    Object.assign(objekt, metadata);
                } else if (remove && objekt.uid === asset_uid) {
                    if (eventType === 'delete') {
                        for (var key in objekt)
                            delete objekt[key];
                    } else {
                        for(var key in objekt) {
                            if(key !== 'filename' && key !== 'uid')
                                delete objekt[key];
                        }
                    }
                }
            } else {
                for (var key in objekt) {
                    _modify(objekt[key]);
                }
            }
        } else if (_.isArray(objekt)) {
            objekt.map(function (_objekt) {
                _modify(_objekt);
            });
        }
    }

    _modify(assets);
}

/**
 * Cleans json arrays with empty sub-objects and null values, left behind on deletion
 * @param  {Object} entry   - entries, who's json needs cleaning
 */

function cleanEntries (entry) {
    function _cleanEntries (objekt, parent, key) {
        if(_.isPlainObject(objekt)) {
            if(Object.keys(objekt).length === 0) {
                if(_.isArray(parent)) {
                    for(var i = 0; i < parent.length; i++) {
                        if((typeof parent[i] === 'object' && Object.keys(parent[i]).length === 0) || parent[i] === null) {
                            parent.splice(i, 1);
                            i--;
                        }
                    }
                } else {
                    parent[key] = null;
                }
            }

            for(var __key in objekt)
                _cleanEntries(objekt[__key], objekt, __key);
        } else if(_.isArray(objekt) && objekt.length) {
            objekt.map(function (_objekt, index) {
                _cleanEntries(_objekt, objekt, index);
            });
        }
    }
    _cleanEntries(entry, {entry: entry}, 'entry');
}

// delete form
Sync.prototype.form = function (languages, form) {
    var self = this;
    try {
        var ctUID = (form.object.form) ? form.object.form.form_uid : form.object.content_type.uid;
        async.series([
                function (callback) {
                    return self.updateEntityStatus({isItem: false, objekt: form, status: 1, event: 'deleteing', callback: callback});
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
                                                db.ContentType(_routes)
                                                    .language(lang.code)
                                                    .Query()
                                                    .toJSON()
                                                    .find()
                                                    .spread(function (routeEntries) {
                                                        if (routeEntries && routeEntries.length) {
                                                            var _entries = _.reject(routeEntries, {
                                                                content_type: {
                                                                    uid: ctUID
                                                                }
                                                            });
                                                            db.ContentType(_routes)
                                                                .language(lang.code)
                                                                .Entry()
                                                                .Query()
                                                                .query({"_bulk_insert": true, "entries": _entries})
                                                                .update()
                                                                .then(function () {
                                                                    cb();
                                                                }, function (err) {
                                                                    cb(err);
                                                                })
                                                        } else {
                                                            cb();
                                                        }
                                                    }, function (err) {
                                                        cb(err);
                                                    });
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
                },
                function (callback) {
                    var calls = [];
                    if (_.isArray(languages)) {
                        languages.map(function (lang) {
                            calls.push(self.updateMapper(lang.code, {content_type: {uid: ctUID}}, 'content_type', true));
                        });
                    } else if (_.isPlainObject(languages)) {
                        calls.push(self.updateMapper(languages.code, {content_type: {uid: ctUID}}, 'content_type', true));
                    }
                    async.series(calls, callback);
                }],
            function (error, data) {
                if (error) {
                    return self.updateEntityStatus({isItem: false, objekt: form, status: 3, event: 'deleting', message: helper.message(error)});
                } else {
                    return self.updateEntityStatus({isItem: false, objekt: form, status: 4, type: 'Content type'});
                }
            });
    } catch (error) {
        log.error("Form Delete Error: " + helper.message(error));
        self.next();
    }
};

// bulk asset delete operation
Sync.prototype.bulkAssetDelete = function (languages, folder) {
    var self = this;
    try {
        var folderUid = (folder.object.entry.entry_uid) ? folder.object.entry.entry_uid : folder.object.entry.uid;
        async
            .series([
                    function (callback) {
                        return self.updateEntityStatus({isItem: false, objekt: folder, status: 1, event: 'deleting', callback: callback});
                    },
                    function (callback) {
                        var calls = [];
                        for (var i in languages) {
                            calls.push((function (language) {
                                return function (cb) {
                                    var _calls = [];
                                    db
                                        .Assets()
                                        .language(language.code)
                                        .Query()
                                        .where('parent_uid', folderUid)
                                        .toJSON()
                                        .find()
                                        .spread(function (data) {
                                            if (data && data.length) {
                                                var assetsIds = _.pluck(data, 'uid');
                                                var limit = 100,
                                                    totalRequests = Math.ceil(assetsIds.length / limit),
                                                    _requests = [];
                                                for (var j = 0, _j = totalRequests; j < _j; j++) {
                                                    _requests.push(function (j) {
                                                        return function (_cb) {
                                                            var _assetsIds = assetsIds.slice((j * limit), (j * limit) + limit)
                                                            request({
                                                                url: api.host + '/' + api.version + api.urls.assets,
                                                                headers: headers,
                                                                method: "POST",
                                                                qs: {limit: limit},
                                                                json: {
                                                                    "_method": "GET",
                                                                    "query": {"uid": {"$in": _assetsIds}}
                                                                }
                                                            }, function (err, res, body) {
                                                                if (!err && res.statusCode == 200 && body && body.assets) {
                                                                    var __assetsIds = _.difference(_assetsIds, _.pluck(body.assets, "uid"));
                                                                    if (__assetsIds.length) {
                                                                        for (var i = 0, _i = __assetsIds.length; i < _i; i++) {
                                                                            _calls.push((function (assetUid) {
                                                                                return function (__cb) {
                                                                                    helper.deleteAssets(assetUid, language, function (error, result) {
                                                                                        if(error)
                                                                                            return __cb(error);
                                                                                        return self.updateAssetReferences(assetUid, [language.code], true, {}, 'delete').then(function () {
                                                                                            return __cb(null, result);
                                                                                        }).catch(function (error) {
                                                                                            return __cb(error, null);
                                                                                        });
                                                                                    });
                                                                                }
                                                                            })(__assetsIds[i]));
                                                                        }
                                                                    }
                                                                    async.series(_calls, function (error, data) {
                                                                        return _cb(error, data);
                                                                    });
                                                                } else {
                                                                    return _cb(body, null);
                                                                }
                                                            });
                                                        }
                                                    }(j));
                                                }
                                                async.series(_requests, function (error, data) {
                                                    return cb(error, data);
                                                })
                                            } else {
                                                return cb(null, null);
                                            }
                                        }, function (error) {
                                            return cb(error, null);
                                        });
                                }
                            })(languages[i]));
                        }
                        async.series(calls, function (error, data) {
                            if (error) {
                                return callback(error);
                            } else {
                                return callback(null, null);
                            }
                        });
                    }],
                function (error, data) {
                    if (error)
                        return self.updateEntityStatus({isItem: false, objekt: folder, status: 3, event: 'deleting', message: helper.message(error)});
                    return self.updateEntityStatus({isItem: false, objekt: folder, status: 4, type: 'Folder'});
                });
    } catch (error) {
        log.error("Folder Delete Error: " + helper.message(error));
        self.next();
    }
};