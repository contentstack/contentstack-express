exports.queryBuilder = function (query, language, content_type_id, callback) {
    var skipFormIds = ["_routes", "_content_types", "_assets"];
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