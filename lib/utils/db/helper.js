/*!
 * contentstack-express
 * copyright (c) Built.io Contentstack
 * MIT Licensed
 */

'use strict';

/**
 * Module Dependencies.
 */

var _ = require('lodash'),
    when = require('when'),
    fs = require('fs'),
    path = require('path'),
    async = require('async'),
    context = require('./../context'),
    config = require('./../config/index'),
    Result = require('./query-builder/result'),
    languages = config.get('languages'),
    cache = config.get('cache'),
    skipFormIds = (cache == true && process.env.SYNC !== "false") ? ["_routes", "_content_types"] : [];

var utility = {};

module.exports = exports = utility;

/*
 * generateCTNotFound
 * @description  : generateCTNotFound generates ContentType Error not found.
 * @params       : locale     {string} - locale
 *                 contentTypeUID {string} - contentTypeUID
 * @return       : isCyclic {boolean}
 */
exports.generateCTNotFound = function (locale, contentTypeUID) {
    var model = utility.getContentPath(locale);
    var jsonPath = path.join(model, contentTypeUID + ".json");
    var error = null

    if (!jsonPath || !fs.existsSync(jsonPath)) {
        error = new Error("The Content Type uid '" + contentTypeUID + "' was not found or is invalid");
        error.code = 194
        throw error
    }
}

/*
 * checkCyclic
 * @description  : checkCyclic is used to determine the cyclic reference in given mapping
 * @params       : uid     {string} - uid to be avaluated
 *                 mapping {object} - mapping from which it is to be searched
 * @return       : isCyclic {boolean}
 */
exports.checkCyclic = function checkCyclic(uid, mapping) {
    var flag = false
    var list = [uid]
    var getParents = function (child) {
        let parents = []
        for (let key in mapping) {
            if (~mapping[key].indexOf(child)) {
                parents.push(key)
            }
        }
        return parents
    }
    for (let i = 0; i < list.length; i++) {
        var parent = getParents(list[i])
        if (~parent.indexOf(uid)) {
            flag = true
            break
        }
        list = _.uniq(list.concat(parent))

    }
    return flag
}

// _query to overrite the search on reference
exports.filterQuery = function (_query, build) {
    // remove the unwanted keys from the query
    var __keys = ["locale", "_remove", "include_references", "include_count", "_include_previous", "_include_next"];
    for (var i = 0, total = __keys.length; i < total; i++) {
        delete _query[__keys[i]];
    }

    // search for the reference
    var _filterQuery = function (query) {
        for (var key in query) {
            var _keys = (key) ? key.split('.') : [],
                _index = (_keys && _keys.length) ? _keys.indexOf('uid') : -1;
            if (_index > 1) {
                var _value = query[key];
                _keys[_index] = "values";
                var _key = _keys.join('.');
                query[_key] = _value;
                delete query[key];
            } else if (query[key] && typeof query[key] == "object") {
                _filterQuery(query[key]);
            }
        }
    };

    if (!build) _filterQuery(_query);
    return _query;
};

exports.merge = function (destination, source) {
    if (source && destination) {
        for (var key in source) {
            if (source[key]) destination[key] = source[key];
        }
    }
    return destination;
}

exports.filterSchema = function (_forms, _remove) {
    var _keys = ['schema'].concat(_remove || []);
    var _removeKeys = function (object) {
        for (var i = 0, total = _keys.length; i < total; i++) {
            delete object[_keys[i]];
        }
        return object;
    };

    if (_forms && _forms instanceof Array) {
        for (var i = 0, total = _forms.length; i < total; i++) {
            if (_forms[i] && _forms[i]['_data']) {
                _forms[i]['_data'] = _removeKeys(_forms[i]['_data']);
            }
        }
    } else if (_forms && typeof _forms == "object") {
        _forms['_data'] = _removeKeys(_forms['_data']);
    }
    return _forms;
};

exports.findReferences = function (contentType) {
    if (contentType && contentType.schema && contentType.schema.length) {
        var _data = {},
            _keys = ["title", "uid", "schema", "options", "singleton", "references", "created_at", "updated_at"];

        var _removeKeys = function (contentType) {
            for (var _field in contentType) {
                if (_keys.indexOf(_field) == -1) {
                    delete contentType[_field];
                }
            }
            return contentType;
        }

        var _findReferences = function (_schema, parent) {
            for (var i = 0, total = _schema.length; i < total; i++) {
                var parentKey;
                if (_schema[i] && _schema[i]['data_type'] && _schema[i]['data_type'] == "reference") {
                    var field = ((parent) ? parent + ":" + _schema[i]['uid'] : _schema[i]['uid']);
                    _data[field] = _schema[i]['reference_to'];
                } else if (_schema[i] && _schema[i]['data_type'] && _schema[i]['data_type'] == "group" && _schema[i]['schema']) {
                    _findReferences(_schema[i]['schema'], ((parent) ? parent + ":" + _schema[i]['uid'] : _schema[i]['uid']));
                }
            }
        };

        contentType = _removeKeys(contentType);

        _findReferences(contentType.schema, "_data");
        // adding or recalculating the references of the form
        contentType['references'] = _data;
    }
    return contentType;
};

exports.filterEntries = function (content_type_id, fields, _entries) {
    if (_entries && fields && fields.length) {
        var _default = ['uid'];

        fields = _.uniq(fields.concat(_default));

        var _filterData = function (_entry) {
            var entry = {"_uid": _entry["_uid"], "_data": {}, "_content_type_uid": content_type_id};
            for (var f = 0, _f = fields.length; f < _f; f++) {
                entry["_data"][fields[f]] = _entry["_data"][fields[f]];
            }
            return entry;
        };

        if (_entries instanceof Array) {
            for (var i = 0, total = _entries.length; i < total; i++) {
                _entries[i] = _filterData(_entries[i]);
            }
        } else if (_entries && typeof _entries == "object") {
            _entries = _filterData(_entries);
        }
    }
    return _entries;
};

exports.queryBuilder = function (query, language, content_type_id, callback) {
    var skipFormIds = ["_routes", "_content_types"];
    if (query && Object.keys(query).length && content_type_id && skipFormIds.indexOf(content_type_id) === -1) {
        var Inmemory = require('./inmemory/index'),
            schema = Inmemory.get(language, "_content_types", {_uid: content_type_id}),
            references = {};

        if (schema && schema.length) {
            schema = schema[0];
            references = schema.references || {};
        }

        // check if the reference exists in the system
        if (Object.keys(references).length > 0) {
            var requests = [];
            for (var filterField in query) {
                requests.push(function (filterField) {
                    return function (_callback) {
                        var _calls = {};
                        var _filterField = filterField.toString();
                        var refQuery, refForm;

                        for (var refField in references) {
                            var newRefField = refField.replace(/:/g, ".");
                            if (filterField.indexOf(newRefField) === 0) {
                                // processing the new query param
                                _filterField = _filterField.split('.');
                                _filterField[_filterField.length - 1] = "uid";
                                _filterField = _filterField.join(".");

                                refForm = references[refField];
                                refQuery = refQuery || {};
                                var newFilterField = filterField.replace(newRefField, "_data");  // remove this entry, replacement if system going to attach the "_data."
                                refQuery[newFilterField] = query[filterField];
                                delete query[filterField];
                            }
                        }

                        if (refQuery && Object.keys(refQuery).length) {
                            _calls[_filterField] = (function (refQuery, content_type_id) {
                                return function (_cb) {
                                    var RefData = Inmemory.get(language, content_type_id, refQuery),
                                        RefQuery = {"$in": []};
                                    if (RefData && RefData.length) RefQuery = {"$in": _.pluck(RefData, "uid")};
                                    _cb(null, RefQuery);
                                }
                            }(refQuery, refForm));
                        } else if (_.isArray(query[filterField])) {
                            var __calls = [];
                            for (var i = 0, total = query[filterField].length; i < total; i++) {
                                __calls.push(function (filterQuery) {
                                    return function (__cb) {
                                        utility.queryBuilder(filterQuery, language, content_type_id, __cb);
                                    }
                                }(query[filterField][i]));
                            }

                            _calls[filterField] = (function (__calls) {
                                return function (_cb) {
                                    async.parallel(__calls, _cb);
                                }
                            }(__calls));
                        }

                        if (Object.keys(_calls).length) {
                            async.parallel(_calls, _callback);
                        } else {
                            var _temp = {};
                            _temp[filterField] = query[filterField];
                            _callback(null, _temp);
                        }
                    }
                }(filterField));
            }

            async.parallel(requests, function (err, result) {
                var __query = {};
                for (var i = 0, total = result.length; i < total; i++) {
                    _.merge(__query, result[i]);
                }
                callback(null, __query);
            });
        } else {
            callback(null, query);
        }
    } else {
        callback(null, query);
    }
};

// generate the Result object
exports.resultWrapper = function (result) {
    if (result && typeof result.entries !== 'undefined') {
        if (result.entries && result.entries.length) {
            for (var i = 0, _i = result.entries.length; i < _i; i++) {
                result.entries[i] = Result(result.entries[i]);
            }
        } else if (result.entries && typeof result.entries === 'number') {
            result = {entries: result.entries};
        } else {
            result.entries = [];
        }
    } else if (result && typeof result.entry !== 'undefined') {
        result.entry = Result(result.entry);
    } else {
        result = {"_write_operation_": result};
    }
    return result;
};

// spread the result object
exports.spreadResult = function (result) {
    var _results = [];
    if (result && typeof result === "object" && Object.keys(result).length) {
        if (typeof result.entries !== 'undefined') {
            if (typeof result.entries !== 'number') {
                _results.push(result.entries);
            } else {
                _results = result;
            }
        }
        if (typeof result.schema !== 'undefined') _results.push(result.schema);
        if (typeof result.count !== 'undefined') _results.push(result.count);
        if (typeof result.entry !== 'undefined') _results = result.entry;
        if (typeof result._write_operation_ !== 'undefined') _results = result._write_operation_;
    }
    return _results;
};

exports.getContentPath = function (langCode) {
    var idx = _.findIndex(languages, {"code": langCode});
    if (~idx) {
        return languages[idx]['contentPath'];
    } else {
        console.error("Language doesn't exists");
    }
};

// create the promise for the query
exports.getPromise = function (queryObject) {
    var datastore = require('./providers/index');
    var Inmemory = require('./inmemory/index');
    var deferred = when.defer();
    try {
        var result,
            options,
            _query,
            self = queryObject,
            isJson = (typeof self.json === 'function') ? true : false,
            isSingle = (self._uid || self.single) ? true : false,
            callback = function (operation) {
                return function (err, data) {
                    try {
                        self._locale = self._operation = self._uid = self.single = self.json = null;
                        if (err) throw err;
                        if (!isJson) data = utility.resultWrapper(data);
                        data = utility.spreadResult(data);
                        return deferred.resolve(data);
                    } catch (err) {
                        return deferred.reject(err);
                    }
                }
            };
        /*
         * setting the locale, setting the options, setting the default sort option to publish_at descending
         */
        self._locale = self._locale || context.get("lang") || "en-us";

        if (self._query._bulk_insert) {
            self._operation = 'bulkinsert';
        }
        switch (self._operation) {
            case 'upsert' :
            case 'remove' :
            case 'insert' :
                _query = _.clone(self.object, true);
                _query = _.merge(_query, {_content_type_uid: self.content_type_id, locale: self._locale});

                if (self._uid || (_query._data && _query._data.uid)) _query._uid = self._uid || _query._data.uid;
                datastore[self._operation](_query, callback(self._operation));
                break;
            case 'bulkinsert' :
                _query = _.clone(self._query, true);
                _query = _.merge(_query, {_content_type_uid: self.content_type_id, locale: self._locale});
                datastore["bulkInsert"](_query, callback(self._operation));
                break;
            case 'fetch' :
            case 'count' :
            case 'find' :
                options = self._options || {};
                options.sort = options.sort || {"_data.published_at": -1};
                _query = _.clone(self._query, true);

                utility.queryBuilder(_query, self._locale, self.content_type_id, function (err, resultQuery) {
                    if (err) throw err;
                    _query = resultQuery;

                    //creating query based on the chain methods
                    _query = _.merge(_query, {_content_type_uid: self.content_type_id, locale: self._locale});
                    if (self._uid) _query = _.merge(_query, {_uid: self._uid});

                    if (skipFormIds.indexOf(self.content_type_id) === -1) {
                        if (self.include_count) _query.include_count = true;
                        if (self._uid || self.single) {
                            datastore.findOne(_query, callback(self._operation));
                        } else if (self._count) {
                            datastore.count(_query, callback(self._operation));
                        } else {
                            datastore.find(_query, options, callback(self._operation));
                        }
                    } else {
                        var results = Inmemory.get(self._locale, self.content_type_id, _query);
                        // entry/entries are added because to get the data under the result wrapper
                        if (self._uid || self.single) {
                            results = (results && results.length) ? results[0] : null;
                            results = {'entry': results};
                        } else if (self._count) {
                            results = results || []
                            results = {'entries': results.length};
                        } else {
                            results = {'entries': results || []};
                            if (self.include_count) results.count = results.entries.length;
                        }
                        callback(self._operation)(null, results);
                    }
                });
                break;
        }
        return deferred.promise;
    } catch (err) {
        console.error("gerer : ", err.message)
        return deferred.reject(err);
    }
}