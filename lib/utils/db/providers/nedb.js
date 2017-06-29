/*!
 * contentstack-express
 * copyright (c) Built.io Contentstack
 * MIT Licensed
 */

'use strict';

/**
 * Module Dependencies.
 */
var datastore = require('nedb'),
    path = require('path'),
    fs = require('graceful-fs'),
    events = require('events').EventEmitter,
    util = require('util'),
    _ = require('lodash'),
    async = require('async'),
    config = require('./../../config/index'),
    languages = config.get('languages'),
    assetDownloadFlag = config.get('assets.download'),
    helper = require('./../helper'),
    InMemory = require('./../inmemory/index'),
    fileStorage = require('./FileSystem'),
    assetRouteName = "_assets",
    skipForms = ["_routes", "_content_types"];

var nedbStorage = function () {
    // Inherit methods from EventEmitter
    events.call(this);

    // Remove memory-leak warning about max listeners
    this.setMaxListeners(0);

    // Keep track of spawned child processes
    this.childProcesses = [];

    this.db = {};

    var self = this,
        databases = {};
    for (var l = 0, lTotal = languages.length; l < lTotal; l++) {
        databases[languages[l]['code']] = (function (language) {
            return function (cb) {
                self.db[language.code] = new datastore({inMemoryOnly: true});
                var model = language.contentPath;
                if (fs.existsSync(model)) {
                    fs.readdir(model, function (err, files) {
                        if (err) {
                            cb(err, null);
                        } else {
                            var loadDatabase = [];
                            for (var i = 0, total = files.length; i < total; i++) {
                                var fileName = files[i].replace('.json', '');
                                if (skipForms.indexOf(fileName) === -1) {
                                    loadDatabase.push(function (i, filePath) {
                                        return function (_cb) {
                                            fs.readFile(path.join(model, filePath), 'utf-8', function (err, data) {
                                                if (err) _cb(err);
                                                data = JSON.parse(data);
                                                self.db[language.code].insert(data, _cb);
                                            });
                                        }
                                    }(i, files[i]));
                                }
                            }
                            async.parallel(loadDatabase, function (err, res) {
                                if (err) {
                                    cb(err, res);
                                } else {
                                    self.db[language.code].ensureIndex({
                                        fieldName: '_uid',
                                        unique: true,
                                        sparse: true
                                    }, cb);
                                }
                            });
                        }
                    });
                } else {
                    cb(null, {});
                }
            }
        }(languages[l]))
    }

    async.parallel(databases, function (err, res) {
        if (err) {
            console.error("Database Couldn't load :" + err.message);
            process.exit(0);
        }
    });

    // Bind `this` context for all `nedbStorage.prototype.*` methods
    this.findOne = _.bind(this.findOne, this);
    this.find = _.bind(this.find, this);
    this.count = _.bind(this.count, this);
    this.insert = _.bind(this.insert, this);
    this.bulkInsert = _.bind(this.bulkInsert, this);
    this.upsert = _.bind(this.upsert, this);
    this.remove = _.bind(this.remove, this);
};
// Extend from EventEmitter to allow hooks to listen to stuff
util.inherits(nedbStorage, events);

// include references
nedbStorage.prototype.includeReferences = function (data, _locale, references, parentID, callback) {
    var self = this,
        calls = [];
    if (_.isEmpty(references)) references = {}
    var _includeReferences = function (data) {
        for (var _key in data) {
            if (data.uid) parentID = data.uid
            if (typeof data[_key] == "object") {
                if (data[_key] && data[_key]["_content_type_id"]) {
                    calls.push(function (_key, data) {
                        return (function (_callback) {
                            var _uid = (data[_key]["_content_type_id"] === assetRouteName && data[_key]["values"] && typeof data[_key]["values"] === 'string') ? data[_key]["values"] : {"$in": data[_key]["values"]};
                            var query = {
                                    "_content_type_uid": data[_key]["_content_type_id"],
                                    "_uid": _uid,
                                    "locale": _locale
                                },
                                _calls = [];

                            if (query._content_type_uid !== assetRouteName) {
                                query["_uid"]["$in"] = _.filter(query["_uid"]["$in"], function (uid) {
                                    var flag = helper.checkCyclic(uid, references)
                                    return !flag
                                });
                            }
                            _calls.push(function (field, query) {
                                return (function (cb) {
                                    self.find(query, {}, function (_err, _data) {
                                        if (!_err || (_err.code && _err.code === 422)) {
                                            if (_data && (_data.entries || _data.assets)) {
                                                // to remove the wrapper from the result set
                                                _data = _data.entries || _data.assets;

                                                var __data = [];
                                                if (query._uid && query._uid.$in) {
                                                    for (var a = 0, _a = query._uid.$in.length; a < _a; a++) {
                                                        var _d = _.find(_data, {uid: query._uid.$in[a]});
                                                        if (_d) __data.push(_d);
                                                    }
                                                    data[field] = __data;
                                                } else {
                                                    data[field] = (_data && _data.length) ? _data[0] : {};
                                                }
                                            } else {
                                                data[field] = [];
                                            }
                                            return setImmediate(function () {
                                                return cb(null, data)
                                            });
                                        } else {
                                            return setImmediate(function () {
                                                return cb(_err, null);
                                            });
                                        }

                                    }, _.clone(references, true), parentID);
                                });
                            }(_key, query));
                            async.series(_calls, function (__err, __data) {
                                return setImmediate(function () {
                                    return _callback(__err, __data);
                                });
                            });
                        });
                    }(_key, data));
                } else {
                    _includeReferences(data[_key]);
                }
            }
        }
    };

    var recursive = function (data, callback) {
        _includeReferences(data);
        if (calls.length) {
            async.series(calls, function (e, d) {
                if (e) throw e;
                calls = [];
                return setImmediate(function () {
                    return recursive(data, callback);
                });
            });
        } else {
            callback(null, data);
        }
    };

    try {
        recursive(data, callback);
    } catch (e) {
        callback(e, null);
    }
};


// find single entry
nedbStorage.prototype.findOne = function (query, callback) {
    try {
        var _query = _.clone(query, true),
            self = this,
            locale;
        if (_query && typeof _query == "object") {
            locale = _query.locale;
            var remove = _query._remove || false,
                includeReference = (typeof _query.include_references == 'undefined' || _query.include_references == true) ? true : false,
                options = {};
            // to remove the unwanted keys from query
            _query = helper.filterQuery(_query);
            this.db[locale].findOne(_query).sort({"_data.published_at": -1}).exec(function (err, data) {
                try {
                    if (err) throw err;
                    if (data && data._data) {
                        // check if data exists then only search for more
                        var _data = (remove) ? data : data._data,
                            __data = (!remove) ? {entry: _.clone(_data, true)} : _data;
                        if (includeReference) {
                            self.includeReferences(__data, locale, undefined, undefined, callback);
                        } else {
                            callback(null, __data);
                        }
                    } else {
                        helper.generateCTNotFound(locale, query._content_type_uid);
                        callback(null, {entry: null});
                    }
                } catch (e) {
                    callback(e);
                }
            });
        } else {
            throw new Error("query parameter should be an object.");
        }
    } catch (e) {
        callback(e, null);
    }
};

// find and sort(optional) entries using query
nedbStorage.prototype.find = function (query, options, callback) {
    try {
        var references = (_.isPlainObject(arguments[3]) && !_.isEmpty(arguments[3])) ? arguments[3] : {}
        var parentID = (_.isString(arguments[4])) ? arguments[4] : undefined
        if (query && typeof query == "object" && typeof options == "object") {
            var self = this,
                _query = _.clone(query, true),
                includeReference = (typeof _query.include_references == 'undefined' || _query.include_references == true) ? true : false,
                calls = {},
                locale = _query.locale,
                count = _query.include_count,
                queryObject;

            // to remove the unwanted keys from query and create reference query
            _query = helper.filterQuery(_query);

            // find assets if _content_type_uid is  "_assets"
            if (!assetDownloadFlag && _query._content_type_uid === assetRouteName) {
                var results = InMemory.get(locale, _query._content_type_uid, _query);
                var _data = {assets: (results && results.length) ? results : []}
                callback(null, _data);
            } else {
                queryObject = self.db[locale].find(_query).sort(options.sort || {"_data.published_at": -1});
                if (options.limit) queryObject.skip((options.skip || 0)).limit(options.limit);
                calls['entries'] = function (_cb) {
                    queryObject.exec(_cb);
                };
                if (count) {
                    calls['count'] = function (_cb) {
                        self.db[locale].count(_query, _cb);
                    }
                }
                async.parallel(calls, function (err, result) {
                    try {
                        if (err) throw err;
                        if (result && result.entries && result.entries.length) {
                            var _data = _.clone(result, true);
                            _data.entries = _.pluck(_data.entries, "_data");
                            if (includeReference) {
                                if (parentID) {
                                    let tempResult = _data.entries
                                    references[parentID] = references[parentID] || []
                                    references[parentID] = _.uniq(references[parentID].concat(_.pluck(tempResult, "uid")))
                                }
                                self.includeReferences(_data, locale, references, parentID, callback);
                            } else {
                                callback(null, _data);
                            }
                        } else {
                            helper.generateCTNotFound(locale, query._content_type_uid);
                            callback(null, result);
                        }
                    } catch (e) {
                        callback(e);
                    }
                });
            }
        } else {
            throw new Error("query and options parameters should be objects.");
        }
    } catch (e) {
        callback(e, null);
    }
};

// find entries count
nedbStorage.prototype.count = function (query, callback) {
    try {
        if (query && typeof query == "object") {
            var locale = query.locale;
            // to remove the unwanted keys from query and create reference query
            query = helper.filterQuery(query);
            this.db[locale].count(query, function (err, count) {
                try {
                    if (err) {
                        throw err;
                    } else {
                        if (count === 0) {
                            helper.generateCTNotFound(locale, query._content_type_uid);
                        }
                        callback(null, {"entries": count});
                    }
                } catch (e) {
                    callback(e, null);
                }
            });
        } else {
            throw new Error("query parameter should be an object.");
        }
    } catch (e) {
        callback(e, null);
    }
};

// add entry in to db
nedbStorage.prototype.insert = function (data, callback) {
    try {
        var self = this,
            contentTypeId = data._content_type_uid.toString(),
            language = data.locale;
        fileStorage.insert(data, function (err, result) {
            try {
                if (err) throw err;
                // remove the unwanted keys from the local-storage data
                data = helper.filterQuery(data, true);
                data._uid = data._uid || data._data.uid;
                if (contentTypeId == "_routes" || contentTypeId == "_content_types" || contentTypeId == assetRouteName) {
                    callback(null, result);
                } else {
                    self.db[language].insert(data, function (error) {
                        callback(error, result);
                    });
                }
            } catch (e) {
                callback(e, null);
            }
        });
    } catch (e) {
        callback(e, null);
    }
};

// find entry, if found then update else insert
nedbStorage.prototype.upsert = function (data, callback) {
    try {
        var self = this,
            language = data.locale;
        fileStorage.upsert(data, function (err, result) {
            if (err) throw err;
            if (data._content_type_uid === "_routes" || data._content_type_uid === assetRouteName) {
                callback(null, result);
            } else {
                // remove the unwanted keys
                data = helper.filterQuery(data, true);
                data._uid = data._uid || data._data.uid;
                self.db[language].update({_uid: data._uid}, data, {upsert: true}, function (error) {
                    callback(error, result);
                });
            }
        });
    } catch (e) {
        callback(e, null);
    }
};

// delete entry from db
nedbStorage.prototype.remove = function (query, callback) {
    try {
        var self = this,
            language = query.locale;
        fileStorage.remove(query, function (err, result) {
            if (err) throw err;
            // to remove the unwanted keys from query and create reference query
            query = helper.filterQuery(query);
            if (query._content_type_uid === "_routes" || query._content_type_uid === assetRouteName) {
                callback(null, result);
            } else {
                self.db[language].remove(query, {}, function (error) {
                    callback(error, result);
                });
            }
        });
    } catch (e) {
        callback(e, null);
    }
};

// bulk insert entries to db
nedbStorage.prototype.bulkInsert = function (query, callback) {
    try {
        var self = this;
        fileStorage.bulkInsert(query, function (err, result) {
            if (err) throw err;
            if (query._content_type_uid === "_routes") {
                callback(null, result);
            } else {
                var entries = query.entries || [],
                    calls = [],
                    language = query.locale;
                for (var i = 0, total = entries.length; i < total; i++) {
                    calls.push(function (entry) {
                        return function (cb) {
                            self.db[language].update({_uid: (entry.uid || entry.entry.uid)}, {
                                _data: entry,
                                _uid: (entry.uid || entry.entry.uid),
                                _content_type_uid: query._content_type_uid
                            }, {upsert: true}, cb);
                        }
                    }(entries[i]));
                }
                async.parallelLimit(calls, 5, callback);
            }
        });
    } catch (e) {
        callback(e, null);
    }
};

exports = module.exports = new nedbStorage();
