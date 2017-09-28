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
Sync.prototype.next = function () {
    this.emit("next");
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
                            callback(err.message || err);
                        });
                } else {
                    var d = new Date();
                    var _url = api.host + '/' + api.version + api.urls.content_types + ctUID + api.urls.entries + entryUID;
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
            // If its a publish call, finds assets and updates mapper + handles asset fetching and updating
            function (data, callback) {
                if (!remove) {
                    // Eval if these methods need to be added onto the Sync prototype
                    async.parallel([
                        self.updateMapper(lang.code, data),
                        self.processAssets(lang, data)
                        ], function (err, success) {
                            if(err)
                                return callback(err);
                            else
                                return callback(err, success[1]);
                        });
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
                                            upsert();
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


/**
 * Updates the assets mapping file
 * @param  {Object} data    : data.entry contains the entry that was published
 *                          : data.content_type contains the content_type it belongs to
 * @return {Function}       : Error first callback, indicating the status of the method's success
 */

Sync.prototype.updateMapper = function (lang, data) {
    return function (callback) {
        try {
            /**
             * asset_paths should return the paths of all the 'file' fields in the schema
             * { Note: find way to avoid doing this everytime }
             *
             * Array of Strings
             *     [
             *         f1.f2.f3.asset_uid,
             *         f8.f9.asset_uid
             *     ]
             */
            
            var asset_paths = findReferences(data.content_type.schema);

            /**
             * [p1, p2, p3]
             * Getting: [{a1: p1, a2: p1, a3: p1}, {a1: p2}, {a3: p3}]
             * Expected: [{a1: p1}, {a2: p1}, {a3: p1}, {a1: p2}, {a3: p3}]
             *     :: Resolved ::
             */

            var _mapped_assets = _.compact(_.flatten(asset_paths.map(function (path) {
                var _tmpAssets = _.get(data.entry, path);
                // If asset is single object
                if(_.isPlainObject(_tmpAssets)) {
                    var _obj = {};
                    _obj['uid'] = _tmpAssets.uid;
                    _obj['path'] = path;
                    return _obj;
                } else if (_.isArray(_tmpAssets)) { 
                    // If asset is multiple at the path
                    return _tmpAssets.map(function (asset) {
                        var _obj = {};
                        _obj['uid'] = asset.uid;
                        _obj['path'] = path;
                        return _obj;
                    });
                }
            })));

            /**
             * Structure expected:
             *     {
             *         'a1': ['p1', 'p2'],
             *         'a2': [],
             *         'a3': ['p1', 'p3.p4']
             *     }
             */

            var wrapper = {};
            _mapped_assets.map(function (mapped_asset) {
                if(_.has(wrapper, mapped_asset.uid))
                    wrapper[mapped_asset.uid].push(mapped_asset.path);
                else {
                    wrapper[mapped_asset.uid] = [];
                    wrapper[mapped_asset.uid].push(mapped_asset.path);
                }
            });

            var mapper_path = path.join(config.get('storage.options.basedir'), lang, 'data', '_assetMapper.json'),
                mapped_assets = {};

            if(fs.existsSync(mapper_path))
                mapped_assets = JSON.parse(fs.readFileSync(mapper_path));
            
            /**
             *  Check if the current content_type has been mapped
             *    - If mapped, create a key with entry's uid as key and set the _mapped_assets as value
             *    - Else, create a key with content type's ID, create entry uid as its key and set the _mapped_assets as value
             */
            
             /**
              * Final structure: _assetMapper.json
              *     [
              *         'content_type_uid': {
              *             'entry_uid': {
              *                 'asset_uid': ['path1', 'path2.path3'],
              *                 'asset_uid': []
              *             }
              *         },
              *         'content_type_uid': {
              *             ..
              *         }
              *     ]
              */

            if(_.has(mapped_assets, data.content_type.uid)) {
                mapped_assets[data.content_type.uid][data.entry.uid] = wrapper;
            } else {
                mapped_assets[data.content_type.uid] = {};
                mapped_assets[data.content_type.uid][data.entry.uid] = wrapper;
            }


            // Write data back onto the same file
            // This thing is blocking, make it async
            // TODO :: Embed Assets ::
            fs.writeFile(mapper_path, JSON.stringify(mapped_assets), function (err) {
                if(err)
                    return callback(err);
                return callback(null, null);
            });
        } catch (err) {
            return callback(err);
        }
    }
} 


/**
 * Handle finding asset IDS, in files and RTE, and get assets
 * @param  {Object} data    : data.entry contains the entry that was published
 *                          : data.content_type contains the content_type it belongs to
 * @return {Function}       : Error first callback, indicating the status of the method's success
 */

Sync.prototype.processAssets = function (lang, data) {
    return function (callback) {
        try {
            // This thing returns RTE asset IDS as well, let's update this
            // TODO :: Embed Assets ::
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
                            if (!_data[i].download_id) {
                                __a[_data[i].uid] = _data[i];
                            } else {
                                __a[_data[i].download_id] = _data[i];
                            }
                        }
                        data.entry = helper.replaceAssetsUrl(__a, data.content_type, data.entry);
                        return callback(null, data);
                    } else {
                        return callback(err, null);
                    }
                })
            } else {
                return callback(null, data);
            }
        } catch (err) {
            return callback(err);
        }
    }
}


/**
 * Finds reference fields in schema and notes them
 * @param  {Object} schema    : Schema to be traversed
 * @param  {String} uid       : Help's to check self referencing content types
 */
  
function findReferences (schema) {
    var assetPaths = [];
    traverseSchemaWithPath(schema, function(path, field) {
        if(field.data_type === 'file') {
            assetPaths.push(path);
        }
    }, false);

    return assetPaths;
}

function traverseSchemaWithPath(schema, fn, path) {
    path = path || '';
    function getPath(uid) {
       return (path === '') ? uid: [path, uid].join('.');
    }

    var promises = schema.map(function(field) {
        var pth = getPath(field.uid);

        if(field.data_type === 'group')
            return traverseSchemaWithPath(field.schema, fn, pth);
        return fn(pth, field);
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

        if (asset.object.entry.version) _qs['version'] = asset.object.entry.version;
        if (asset.object.entry.locale) _qs['locale'] = asset.object.entry.locale;

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
                        self.fetchAssetDetails(assetUID, _qs).then(function (assetMetadata) {
                            self.updateAssetReferences(assetUID, asset.object.locale, remove, assetMetadata).then(function () {
                                return callback(null, assetMetadata);
                            })
                        }).catch(function (err) {
                            return callback(err);
                        });
                    } else {
                        // TODO :: Embed Assets :: Not sure why it came here!
                        return callback(null, null);
                    }
                } else {
                    // // TODO:: ASSET UID is provided as of now. As one file read operation is required to provide data.
                    return callback(null, assetUID);
                }
            },
            function (data, callback) {
                var _action = (remove) ? 'beforeUnpublish': 'beforePublish';
                helper.executePlugins({type: _types.asset, asset: data, language: lang, action: _action}, callback);
            },
            function (data, callback) {
                if (assetUID) {
                    if (eventType === _events.delete) {
                        helper.deleteAssets(data.asset, lang, function (err, data) {
                            if(!err) {
                                console.log('Removing asset from mapper');
                                // Asset is being unpublished - remove it from mapper
                                self.updateAssetReferences(assetUID, asset.object.locale, remove, undefined).then(function () {
                                    return callback(null, null);
                                });
                                // return callback(null, null);
                            } else {
                                return callback(err);
                            }
                        })
                    } else {
                        helper.getAssets(data.asset, lang, remove, callback);
                    }
                } else {
                    return callback(null, null);
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
                if (!err && res.statusCode == 200) {
                    if (body.asset) {
                        body.asset.force_load = false;
                        return resolve(body.asset);
                    } else {
                        return reject(helper.message(body));
                    }
                } else if (res && res.statusCode == 404) {
                    return reject(new Error('Asset does not exist.'));
                } else {
                    return reject((err || helper.message(body)));
                }
            });
        } catch (err) {
            return reject(err);
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

Sync.prototype.updateAssetReferences = function (uid, locales, remove, metadata) {
    var self = this;
    return new Promise(function (resolve, reject) {
        try {
            /**
             * Common
             *     1. Read Mapper file
             *     2. Find the 'Content Types' & 'Entry Uids' where it has been referred
             *         IMP: while finding group the paths where the asset is referred in the entry
             *         
             * Un-Publish
             *     - Remove the asset from entries where it has been referred
             *     
             * Publish
             *    Group by content types
             *       - Traverse each entry in which the asset has been referred
             *       - Update it with the metadata 
             */
            
            async.eachLimit(locales, 1, function (lang, cb) {

                // Step 1: Read Mapper file
                var _pth = path.join(config.get('storage.options.basedir'), lang, 'data', '_assetMapper.json');

                if(fs.existsSync(_pth)) {
                    fs.readFile(_pth, function(err, data) {
                        try {
                            if(err)
                                return callback(err);
                            var _data = _.cloneDeep(JSON.parse(data)),
                                asset_references = [];

                            // Step 2: Find the 'Content Types' & 'Entry Uids' where it has been referred
                            var content_type_ids = Object.keys(_data);
                            content_type_ids.map(function (content_type_id) {
                                var entry_ids = Object.keys(_data[content_type_id]);
                                entry_ids.map(function (entry_id) {
                                    if(remove) {
                                        // Remove the mapping from here : since the asset is being un-published/deleted
                                        if(_.has(_data[content_type_id][entry_id], uid))
                                            delete _data[content_type_id][entry_id][uid];
                                    } else {
                                        // This will return the paths in that entry, where the current asset has been referred
                                        // var paths = _.compact(_.map(asset_ids, uid));
                                        var paths = _data[content_type_id][entry_id][uid];
                                        if(!_.isEmpty(paths)) {
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

                            if(remove) {
                                // Re-write it back onto the file and return 
                                fs.writeFile(_pth, JSON.stringify(_data), function (err) {
                                    if(err)
                                        return cb(err);
                                    return cb();
                                });
                                // asset_references would be empty, only when the asset being published, isn't referred anywhere
                                if(_.isEmpty(asset_references)) {
                                    return cb();
                                } else {
                                    // Group entries based on their content_type_uid, for optimization
                                    /**
                                     * Current
                                     *     [
                                     *         {
                                     *             entry_uid: 'e1',
                                     *             path: ['p1', 'p2'],
                                     *             content_type_uid: 'content_type_alpha'
                                     *         },
                                     *         {
                                     *             entry_uid: 'e2',
                                     *             path: ['p1', 'p2'],
                                     *             content_type_uid: 'content_type_alpha'
                                     *         },
                                     *         {
                                     *             entry_uid: 'e3',
                                     *             path: ['p1', 'p2'],
                                     *             content_type_uid: 'content_type_beta'
                                     *         }
                                     *     ]
                                     *
                                     * Expected
                                     *     [
                                     *         'content_type_alpha': [
                                     *         {
                                     *             entry_uid: 'e1',
                                     *             path: ['p1', 'p2']
                                     *         },
                                     *         {
                                     *             entry_uid: 'e2',
                                     *             path: ['p1', 'p2']
                                     *         }
                                     *         ],
                                     *         ....
                                     *     ]
                                     *
                                     * Settling for:
                                     *     {
                                              content_type_alpha: [
                                                {
                                                  entry_uid: 'e1',
                                                  path: [
                                                    Object
                                                  ],
                                                  content_type_uid: 'content_type_alpha'
                                                },
                                                {
                                                  entry_uid: 'e2',
                                                  path: [
                                                    Object
                                                  ],
                                                  content_type_uid: 'content_type_alpha'
                                                }
                                              ],
                                              content_type_beta: [
                                                {
                                                  entry_uid: 'e3',
                                                  path: [
                                                    Object
                                                  ],
                                                  content_type_uid: 'content_type_beta'
                                                }
                                              ]
                                            }
                                     */
                                    var grouped = _.groupBy(asset_references, 'content_type_uid');
                                    async.eachLimit(grouped, 1, function (grp, _cb) {
                                        self.updateReferences(grp, metadata, lang, _cb);
                                    }, function (err) {
                                        if(err)
                                            return cb(err);
                                        return cb();
                                    });
                                }
                            }
                        } catch (err) {
                            return cb(err);
                        }
                    });
                } else {
                    console.log('Should not have come here');
                    return resolve();
                }

            }, function (err) {
                if(err)
                    return reject(err);
                return resolve();
            });
        } catch (err) {
            return reject(err);
        }
    });
}


/**
 * Updates each entry where the published asset has been referred
 * @param  {Object}   asset_reference       : asset_reference.entry_uid {String} contains the uid of the entry to be updated
 *                                          : asset_reference.path {Object|Array} contains the path where all the asset has been referred
 *                                          : asset_reference.content_type_uid contains the path of the content type of the entry
 * @param  {Function} callback              : Return function
 * @return {Function}                       : Error first callback, returns the status of the function's operation
 */

Sync.prototype.updateReferences = function (asset_reference, metadata, lang, callback) {
    // Using '0'th index, since all the objects of asset_reference are same
    var document_path = path.join(config.get('storage.options.basedir'), lang, 'data', asset_reference[0].content_type_uid + '.json');
    if(fs.existsSync(document_path)) {
        fs.readFile(document_path, function (err, content) {
            try {
                if(err)
                    return callback(err);
                // var entries = _.map(JSON.parse(content), '_data');
                var entries = JSON.parse(content);
                entries = _.map(entries, function (entry) {
                    asset_reference.map(function (obj, index, collection) {
                        if(entry._data.uid === obj.entry_uid) {
                            obj.path.map(function (pth) {
                                var _pth = ['_data', pth].join('.'),
                                    assets = _.get(entry, _pth);
                                if(_.isPlainObject(assets)) {
                                    assign(entry, _pth, (assets.uid === metadata.uid) ? metadata: assets);
                                } else if (_.isArray(assets) && !_.isEmpty(assets)) {
                                    assets.map(function (asset, index, collection) {
                                        if(asset.uid === metadata.uid) {
                                            assets[index] = metadata;
                                        }
                                    });
                                } else {

                                }
                            });
                        }
                    });
                    return entry;
                });

                // Re-write data back onto the disk
                fs.writeFile(document_path, JSON.stringify(entries), function (err) {
                    if(err)
                        return callback(err);
                    return callback();
                });
            } catch (err) {
                return callback(err);
            }
        });
    } else {
        return callback(new Error('Could not find', asset_reference.content_type_uid, 'document!'));
    }
}

// delete form
Sync.prototype.form = function (languages, form) {
    var self = this;
    try {
        var ctUID = (form.object.form) ? form.object.form.form_uid : form.object.content_type.uid;
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

// bulk asset delete operation
Sync.prototype.bulkAssetDelete = function (languages, folder) {
    var self = this;
    try {
        var folderUid = (folder.object.entry.entry_uid) ? folder.object.entry.entry_uid : folder.object.entry.uid;
        async
            .series([
                function (callback) {
                    status(folder, {
                        "status": "1",
                        "status_label": "In progress",
                        "message": "Starting the deleting process."
                    }, callback);
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
                                                                                helper.deleteAssets(assetUid, language, __cb);
                                                                            }
                                                                        })(__assetsIds[i]));
                                                                    }
                                                                }
                                                                async.series(_calls, function (err, data) {
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

                                            async.series(_requests, function (err, data) {
                                                if (!err) {
                                                    cb()
                                                }
                                            })
                                        } else {
                                            cb();
                                        }
                                    }, function (err) {
                                        cb(err);
                                    });
                            }
                        })(languages[i]));
                    }
                    async.series(calls, function (err, data) {
                        if (err) {
                            callback(err);
                        } else {
                            callback(null, null);
                        }
                    });
                }],
            function (err, data) {
                if (err) {
                    status(folder, {
                        "status": 3,
                        "status_label": "Fail",
                        "message": "Error: Deleting failed with the error(s): " + helper.message(err)
                    }, self.next);
                } else {
                    status(folder, {
                        "status": "4",
                        "status_label": "Delete",
                        "message": "Folder deleted successfully."
                    }, self.next);
                }
            });
    } catch (e) {
        log.error("Folder Delete Error: " + e.message);
        self.next();
    }
};