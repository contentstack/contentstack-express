/*!
 * contentstack-express
 * copyright (c) Contentstack
 * MIT Licensed
 */

'use strict';

/**
 * Module Dependencies.
 */
var sift = require('sift').default;
var path = require('path');
var fs = require('graceful-fs');
var _ = require('lodash');
var async = require('async');
var atomicFS = require('write-file-atomic');

var config = require('../../config');
var helper = require('../helper');
var InMemory = require('../inmemory');
var assetRouteName = '_assets';
var cachedStructures = ['_content_types', '_routes', '_assets'];
var referenceDepth = config.get('storage.options.referenceDepth');
var configDefaultRefDepth = (referenceDepth && referenceDepth.defaultRoutes && typeof referenceDepth.defaultRoutes === 'number') ? referenceDepth.defaultRoutes : undefined;

/**
 * Filesystem database
 */
var fileStorage = function() {};

fileStorage.prototype.processMultipleCT = function (multiReferences, locale, references, parentID, inMemory, callback, referenceDepth) {
  const self = this
  const callbacks = []
  const queries = {}
  let contents = []
  multiReferences.forEach(function (ref) {
    if (queries.hasOwnProperty(ref._content_type_id)) {
      if (typeof ref.values === 'object') {
        queries[ref._content_type_id]._uid.$in = queries[ref._content_type_id]._uid.$in.concat(ref.values)
      } else {
        queries[ref._content_type_id]._uid.$in.push(ref.values)
      } 
    } else {
      queries[ref._content_type_id] = {
        _content_type_uid: ref._content_type_id,
        _uid: {
          $in: (typeof ref.values === 'string') ? [ref.values]: ref.values
        },
        locale: locale,
        _remove: true
      }
    }
  })

  for (const ct in queries) {
    queries[ct]._uid.$in = _.filter(queries[ct]._uid.$in, function (uid) {
      var flag = helper.checkCyclic(uid, references)
      return !flag
    })

    if (queries[ct]._uid.$in.length === 0) {
      delete queries[ct]
    } else {
      callbacks.push(function () {
        return (function (cb) {
          return self.find(queries[ct], {}, function (error, data) {
            if (error) {
              return cb(error)
            }

            contents = contents.concat(data)
            return cb()
          }, _.clone(references, true), parentID, inMemory, _.clone(referenceDepth))
        })
      }())
    }
  }

  return async.series(callbacks, function (error) {
    if (error) {
      return callback(error)
    }

    let uids = _.map(multiReferences, 'values')
    uids = _.flatten(uids)
    const output = []
    uids.forEach(function (uid) {
      for (let i = 0, j = contents.length; i < j; i++) {
        if (contents[i].uid === uid) {
          output.push(contents[i])
          break
        }
      }
    })
    return callback(null, output)
  })
}

/**
 * Bind entry references
 * @param  {Object}   data            : Content type entry collection
 * @param  {String}   _locale         : Language code
 * @param  {Object}   references      : References mapped so far
 * @param  {String}   parentID        : Parent hierarcy - used to avoid cyclic references
 * @param  {Object}   _inMemory       : Content type's loaded so far
 * @param  {Function} callback        : Error first callback
 * @param  {Number}   referenceDepth  : Reference depth achieved so far
 * @return {Object}                   : Content type collection, with references
 */
fileStorage.prototype.includeReferences = function(data, _locale, references, parentID, _inMemory, callback, referenceDepth) {
  var self = this,
    calls = [];
  if (_.isEmpty(references)) references = {};
  var _includeReferences = function(data) {
    for (var _key in data) {
      if (data.uid) parentID = data.uid;
      if (typeof data[_key] === 'object') {
        if (data[_key] instanceof Array && data[_key].length && data[_key][0].hasOwnProperty('_content_type_id')) {
          if (typeof referenceDepth === 'undefined' || referenceDepth.currentDepth < referenceDepth.definedDepth) {
            calls.push(function (_key, data) {
              return (function (_callback) {
                return self.processMultipleCT(data[_key], _locale, references, parentID, _inMemory, function (error, output) {
                  if (error) {
                    return setImmediate(function () {
                      return _callback(error)
                    })
                  }
                  data[_key] = output
                  return setImmediate(function () {
                    return _callback(null, data)
                  })
                }, referenceDepth)
              })
            }(_key, data))
          }
        } else if (data[_key] && data[_key]['_content_type_id']) {
          if (typeof referenceDepth === 'undefined' || referenceDepth.currentDepth < referenceDepth.definedDepth) {
            calls.push(function(_key, data) {
              return (function(_callback) {
                var _uid = (data[_key]['_content_type_id'] === assetRouteName && data[_key]['values'] && typeof data[_key]['values'] === 'string') ? data[_key]['values'] : {
                  $in: data[_key]['values']
                };
                var query = {
                  _content_type_uid: data[_key]['_content_type_id'],
                  _uid: _uid,
                  locale: _locale,
                  _remove: true
                };
                if (query._content_type_uid !== assetRouteName) {
                  query['_uid']['$in'] = _.filter(query['_uid']['$in'], function(uid) {
                    var flag = helper.checkCyclic(uid, references);
                    return !flag;
                  });
                }
                return self.find(query, {}, function(_err, _data) {
                  if (!_err || (_err.code && _err.code === 422)) {
                    if (_data || (_data && _data.assets)) {
                      var __data = [];
                      if (query._uid && query._uid.$in) {
                        for (var a = 0, _a = query._uid.$in.length; a < _a; a++) {
                          var _d = _.find((_data.assets) ? _data.assets : _data, {
                            uid: query._uid.$in[a]
                          });
                          if (_d) __data.push(_d);
                        }
                        data[_key] = __data;
                      } else {
                        data[_key] = (_data.assets && _data.assets.length) ? _data.assets[0] : {};
                      }
                    } else {
                      data[_key] = [];
                    }
                    return setImmediate(function() {
                      return _callback(null, data);
                    });
                  } else {
                    return setImmediate(function() {
                      return _callback(_err);
                    });
                  }
                }, _.clone(references, true), parentID, _inMemory, _.clone(referenceDepth));
              });
            }(_key, data));
          } else {
            data[_key] = [];
          }
        } else {
          _includeReferences(data[_key]);
        }
      }
    }
  };
  var recursive = function(data, callback) {
    _includeReferences(data);
    if (calls.length) {
      async.series(calls, function(error) {
        if (error) {
          return callback(error);
        }
        // reset calls
        calls = [];
        return setImmediate(function() {
          return recursive(data, callback);
        });
      });
    } else {
      return callback(null, data);
    }
  };
  try {
    recursive(data, callback);
  } catch (error) {
    return callback(error);
  }
};

/**
 * Fetch a single entry
 * @param  {Object}   query     : Query filter
 * @param  {Function} _callback : Error first callback
 * @return {Object}             : Single-filtered entry
 */
fileStorage.prototype.findOne = function(query, _callback) {
  try {
    if (query && typeof query === 'object') {
      var self = this;
      var _query = _.clone(query);
      var language = _query.locale;
      var model = helper.getContentPath(language);
      var remove = _query._remove || false;
      var includeReference = (typeof _query.include_references === 'undefined' || _query.include_references === true) ? true : false;
      var contentTypeId = _query._content_type_uid;
      var jsonPath = (contentTypeId) ? path.join(model, contentTypeId + '.json') : null;
      var referenceDepth;
      if (_query._referenceDepth || configDefaultRefDepth) {
        referenceDepth = {
          definedDepth: (_query._referenceDepth) ? _query._referenceDepth : configDefaultRefDepth,
          currentDepth: 0
        };
      }
      // to remove the unwanted keys from query and create reference query
      _query = helper.filterQuery(_query);
      if (jsonPath && fs.existsSync(jsonPath)) {
        fs.readFile(jsonPath, 'utf-8', function(err, models) {
          try {
            if (err) throw err;
            var data;
            models = JSON.parse(models);
            if (contentTypeId !== '_routes') {
              var _inMemory = {
                [language]: {
                  [contentTypeId]: models
                }
              };
            }
            if (models && models.length) data = sift(_query, models);
            if (data && data.length) {
              var _data = (remove) ? data[0] : data[0]._data,
                __data = (!remove) ? {
                  entry: _.clone(_data, true)
                } : _data;
              if (includeReference) {
                if (typeof referenceDepth === 'undefined' || (referenceDepth.currentDepth < referenceDepth.definedDepth)) {
                  return self.includeReferences(__data, language, undefined, undefined, _inMemory, _callback, referenceDepth);
                } else {
                  return _callback(null, __data);
                }
              } else {
                // When no references are to be attached to the entry object
                return _callback(null, __data);
              }
            } else {
              return _callback(null, { entry: null });
            }
          } catch (error) {
            return _callback(error);
          }
        });
      } else if (cachedStructures.indexOf(contentTypeId) !== -1) {
        return _callback(null, { entry: null });
      } else {
        helper.generateCTNotFound(language, query._content_type_uid);
      }
    } else {
      throw new Error('Query parameter should be of type \'object\'');
    }
  } catch (error) {
    return _callback(error);
  }
};

/**
 * Find entries based on filters
 * @param  {Object}   query    : Query filter
 * @param  {Object}   options  : Optional projections
 * @param  {Function} callback : Error first callback
 * @return {Object}            : Filtered entries
 */
fileStorage.prototype.find = function(query, options, callback) {
  try {
    var references = (_.isPlainObject(arguments[3]) && !_.isEmpty(arguments[3])) ? arguments[3] : {};
    var parentID = (_.isString(arguments[4])) ? arguments[4] : undefined;
    var _inMemory = (_.isPlainObject(arguments[5]) && !_.isEmpty(arguments[5])) ? arguments[5] : {};

    if (query && typeof query === 'object' && typeof options === 'object') {
      var self = this;
      var _query = _.clone(query) || {};
      var language = _query.locale;
      var remove = _query._remove || false;
      var includeReference = (typeof _query.include_references === 'undefined' || _query.include_references === true) ? true : false;
      var referenceDepth;
      if (_.isPlainObject(arguments[6])) {
        arguments[6].currentDepth++;
        referenceDepth = arguments[6];
      } else if (_query._referenceDepth || configDefaultRefDepth) {
        referenceDepth = {
          definedDepth: (_query._referenceDepth) ? _query._referenceDepth : configDefaultRefDepth,
          currentDepth: 0
        };
      }
      // to remove the unwanted keys from query and create reference query
      _query = helper.filterQuery(_query);
      // If it goes into this, its prolly a request from includeReferences
      if (_inMemory[language] && _inMemory[language][query._content_type_uid]) {
        var data = sift(_query, _inMemory[language][query._content_type_uid]);
        if (data && data.length && (typeof referenceDepth === 'undefined' || (referenceDepth.currentDepth <= referenceDepth.definedDepth))) {
          data = _.map(_.cloneDeep(data), '_data');
          if (parentID) {
            references[parentID] = references[parentID] || [];
            references[parentID] = _.uniq(references[parentID].concat(_.map(data, 'uid')));
          }
          return self.includeReferences(data, language, references, parentID, _inMemory, callback, referenceDepth);
        } else {
          return callback(null, data);
        }
      }
      var sort = options.sort || { '_data.published_at': -1 };
      var _count = query.include_count || false;
      var model = helper.getContentPath(language);
      var jsonPath = (query._content_type_uid) ? path.join(model, query._content_type_uid + '.json') : undefined;
      if (jsonPath && fs.existsSync(jsonPath)) {
        fs.readFile(jsonPath, 'utf-8', function(err, models) {
          try {
            if (err) throw err;
            models = JSON.parse(models);
            // Add the read file onto inMemory
            if (_inMemory[language]) {
              _inMemory[language][query._content_type_uid] = models;
            } else {
              _inMemory = {
                [language]: {
                  [query._content_type_uid]: models
                }
              };
            }
            if (models && models.length) {
              models = sift(_query, models);
            }
            var _data = _.map(models, '_data') || [],
              __data;
            /* Sorting Logic */
            var keys = Object.keys(sort);
            var __sort = { keys: [], order: [] };
            for (var i = 0, total = keys.length; i < total; i++) {
              var __order = (sort[keys[i]] === 1) ? 'asc' : 'desc';
              // removing the _data. key to make the default sorting work
              __sort.keys.push(keys[i].replace('_data.', ''));
              __sort.order.push(__order);
            }
            _data = _.orderBy(_data, __sort.keys, __sort.order);
            /* Sorting Logic */
            if (options.limit) {
              options.skip = options.skip || 0;
              _data = _data.splice(options.skip, options.limit);
            } else if (options.skip > 0) {
              _data = _data.slice(options.skip);
            }
            __data = (!remove) ? { entries: _data } : _data;
            if (_count) {
              __data.count = _data.length;
            }
            if (includeReference) {
              if (typeof referenceDepth === 'undefined' || (referenceDepth.currentDepth <= referenceDepth.definedDepth)) {
                if (parentID) {
                  var tempResult = (!remove) ? __data.entries : __data;
                  references[parentID] = references[parentID] || [];
                  references[parentID] = _.uniq(references[parentID].concat(_.map(tempResult, 'uid')));
                }
                return self.includeReferences(__data, language, references, parentID, _inMemory, callback, referenceDepth);
              } else {
                return callback(null, __data);
              }
            } else {
              // When no references are to be attached to the entry object
              return callback(null, __data);
            }
          } catch (error) {
            return callback(error);
          }
        });
      } else if (_query._content_type_uid === assetRouteName) {
        // If sync is not false, get data off InMemory
        if (process.env.SYNC !== 'false') {
          var results = InMemory.get(language, _query._content_type_uid, _query),
            _data = {
              assets: (results && results.length) ? results : []
            };
          return callback(null, _data);
        } else {
          // If sync is false, read FS for data
          var _model = helper.getAssetPath(language),
            _jsonPath = (_query._content_type_uid) ? path.join(_model, _query._content_type_uid + '.json') : undefined;
          if (_jsonPath && fs.existsSync(_jsonPath)) {
            try {
              fs.readFile(_jsonPath, function(readErr, result) {
                if (readErr)
                  return callback(readErr);
                result = JSON.parse(result);
                if (result && result.length) result = sift(_query, result);
                result = {
                  assets: _.map(result, '_data')
                };
                return callback(null, result);
              });
            } catch (error) {
              return callback(error);
            }
          } else {
            // Assets filepath doesn't exist
            return callback(null, {
              assets: []
            });
          }
        }
      } else if (cachedStructures.indexOf(_query._content_type_uid) !== -1) {
        return callback(null, {
          entries: []
        });
      } else {
        helper.generateCTNotFound(language, query._content_type_uid);
      }
    } else {
      throw new Error('Query & options parameter should be of type \'object\'');
    }
  } catch (error) {
    return callback(error);
  }
};

/**
 * Find total no of entries after filtering
 * @param  {Object}   query    : Query filter
 * @param  {Function} callback : Error first callback
 * @return {Object}            : Entries count
 */
fileStorage.prototype.count = function(query, callback) {
  try {
    if (query && typeof query === 'object') {
      // adding the include_references just to get the count
      query.include_references = false;
      query.include_count = false;
      this.find(query, {
        sort: {
          '_data.published_at': -1
        }
      }, function(err, data) {
        try {
          if (err) throw err;
          callback(null, {
            entries: data.entries.length
          });
        } catch (error) {
          callback(error);
        }
      });
    } else {
      throw new Error('Query parameter should be of type \'object\'');
    }
  } catch (e) {
    callback(e, null);
  }
};

/**
 * Insert entries
 * @param  {Object}   data     : Entry to be inserted
 * @param  {Function} callback : Error first callback
 * @return {Number}            : Insert status
 */
fileStorage.prototype.insert = function(data, callback) {
  try {
    var _data = _.cloneDeep(data);
    if (_.isPlainObject(_data) && _data.hasOwnProperty('_content_type_uid') && _data.hasOwnProperty('_uid')) {
      var language = _data.locale,
        contentTypeId = _data._content_type_uid,
        model = (contentTypeId !== assetRouteName) ? helper.getContentPath(language) : helper.getAssetPath(language),
        jsonPath = path.join(model, contentTypeId + '.json');
      // to remove the unwanted keys from query/data
      _data = helper.filterQuery(_data, true);
      var _callback = function(__data) {
        var _strData = JSON.stringify(__data);
        if (!_.isEmpty(_strData)) {
          atomicFS(jsonPath, _strData, function(error) {
            if (error) return callback(error);
            return callback(null, 1);
          });
        } else {
          return callback(new Error(`Data being written is empty/blank. Query made: ${JSON.stringify(_data)}`));
        }
      };
      // updating the references based on the new schema
      if (contentTypeId === '_content_types') {
        _data['_data'] = helper.findReferences(_data['_data']);
      }
      if (fs.existsSync(jsonPath)) {
        fs.readFile(jsonPath, 'utf-8', function(error, entries) {
          try {
            try {
              entries = JSON.parse(entries);
            } catch (error) {
              // If content is present in InMemory, get them
              entries = InMemory.get(language, contentTypeId, {}, true);
              entries = entries || [];
            }
            entries = JSON.parse(entries) || [];
            var idx = _.findIndex(entries, {
              _uid: _data._uid
            });
            if (~idx) {
              return callback(new Error('Data already exists, use update instead of insert.'));
            } else {
              InMemory.set(language, contentTypeId, _data._uid, _data);
              entries.unshift(_data);
              _callback(entries);
            }
          } catch (error) {
            InMemory.set(language, contentTypeId, _data._uid, _data);
            _callback([_data]);
          }
        });
      } else {
        InMemory.set(language, contentTypeId, _data._uid, _data);
        _callback([_data]);
      }
    } else {
      return callback(new Error('Data should be an object with at least \'content_type_id\' and \'_uid\'.'));
    }
  } catch (error) {
    return callback(error);
  }
};

/**
 * Update if entry exists, else insert
 * @param  {Object}   data     : Entry to be inserted
 * @param  {Function} callback : Error first callback
 * @return {Number}            : Upsert status
 */
fileStorage.prototype.upsert = function(data, callback) {
  try {
    var _data = _.cloneDeep(data);
    if (_.isPlainObject(_data) && _data.hasOwnProperty('_content_type_uid') && _data.hasOwnProperty('_uid')) {
      var contentTypeId = _data._content_type_uid,
        language = _data.locale,
        model = (contentTypeId !== assetRouteName) ? helper.getContentPath(language) : helper.getAssetPath(language),
        jsonPath = path.join(model, contentTypeId + '.json');
      // to remove the unwanted keys from query/data and create reference query
      _data = helper.filterQuery(_data, true);
      var _callback = function(__data) {
        var _strData = JSON.stringify(__data);
        if (!_.isEmpty(_strData)) {
          atomicFS(jsonPath, _strData, function(error) {
            if (error) return callback(error);
            return callback(null, 1);
          });
        } else {
          return callback(new Error(`Data being written is empty/blank. Query made: ${JSON.stringify(_data)}`));
        }
      };
      // updating the references based on the new schema
      if (contentTypeId === '_content_types') _data['_data'] = helper.findReferences(_data['_data']);
      if (fs.existsSync(jsonPath)) {
        fs.readFile(jsonPath, 'utf-8', function(error, entries) {
          try {
            if (error) {
              return callback(error);
            }
            try {
              entries = JSON.parse(entries);
            } catch (error) {
              // If content is present in InMemory, get them
              entries = InMemory.get(language, contentTypeId, {}, true);
              entries = entries || [];
            }
            var idx = _.findIndex(entries, {
              '_uid': _data._uid
            });
            if (idx !== -1) entries.splice(idx, 1);
            entries.unshift(_data);
            InMemory.set(language, contentTypeId, _data._uid, _data);
            _callback(entries);
          } catch (error) {
            InMemory.set(language, contentTypeId, _data._uid, _data);
            _callback([_data]);
          }
        });
      } else {
        InMemory.set(language, contentTypeId, _data._uid, _data);
        _callback([_data]);
      }
    } else {
      return callback(new Error('Data should be an object with at least \'content_type_id\' and \'_uid\''));
    }
  } catch (error) {
    return callback(error);
  }
};

/**
 * Insert entries in bulk
 * @param  {Object}   query    : Query filter
 * @param  {Function} callback : Error first callback
 * @return {Number}            : Bulk insert status
 */
fileStorage.prototype.bulkInsert = function(query, callback) {
  try {
    if (query && typeof query === 'object' && query._content_type_uid && query.entries) {
      var entries = query.entries || [],
        contentTypeId = query._content_type_uid,
        language = query.locale,
        model = (contentTypeId !== assetRouteName) ? helper.getContentPath(language) : helper.getAssetPath(language),
        jsonPath = path.join(model, contentTypeId + '.json'),
        _entries = [];
      for (var i = 0, total = entries.length; i < total; i++) {
        _entries.push({
          _data: entries[i],
          _content_type_uid: contentTypeId,
          _uid: entries[i]['uid'] || entries[i]['entry']['uid'] // entry is just for the _routes
        });
      }
      var _strEntries = JSON.stringify(_entries);
      if (!_.isEmpty(_strEntries)) {
        atomicFS(jsonPath, _strEntries, function(error) {
          if (error) return callback(error);
          InMemory.set(language, contentTypeId, null, _entries);
          return callback(null, 1);
        });
      } else {
        return callback(new Error(`Data being written is empty/blank. Query made: ${JSON.stringify(query)}`));
      }
    } else {
      return callback(new Error('Query should be an object with at least \'content_type_id\' and \'entries\'.'));
    }
  } catch (error) {
    return callback(error);
  }
};

/**
 * Remove entry from db
 * @param  {Object}   query    : Query filter
 * @param  {Function} callback : Error first callback
 * @return {Number}            : Remove status
 */
fileStorage.prototype.remove = function(query, callback) {
  try {
    if (query && typeof query === 'object') {
      var language = query.locale,
        contentTypeId = query._content_type_uid,
        model = (contentTypeId !== assetRouteName) ? helper.getContentPath(language) : helper.getAssetPath(language),
        jsonPath = path.join(model, contentTypeId + '.json'),
        _query = _.clone(query, true);
      if (!fs.existsSync(jsonPath)) {
        return callback(null, 1);
      } else {
        if (Object.keys(_query).length === 2 && contentTypeId && language) {
          fs.unlink(jsonPath, function(error) {
            if (error) return callback(error);
            InMemory.set(language, contentTypeId, null, []);
            callback(null, 1);
          });
        } else if (contentTypeId) {
          var idx;
          // remove the unwanted keys from query/data
          _query = helper.filterQuery(_query);
          return fs.readFile(jsonPath, function(error, entries) {
            if (error) return callback(error);
            try {
              entries = JSON.parse(entries);
            } catch (error) {
              // Parse error: JSON is corrupted
              entries = InMemory.get(language, contentTypeId, {}, true);
              entries = entries || [];
            }
            idx = _.findIndex(entries, {
              _uid: _query._uid
            });
            if (~idx) entries.splice(idx, 1);
            var _strEntries = JSON.stringify(entries);
            if (!_.isEmpty(_strEntries)) {
              atomicFS(jsonPath, _strEntries, function(error) {
                if (error) return callback(error);
                InMemory.set(language, contentTypeId, _query._uid);
                return callback(null, 1);
              });
            } else {
              return callback(new Error(`Data being written is empty/blank. Query made: ${JSON.stringify(query)}`));
            }
          });
        } else {
          return callback(null, 0);
        }
      }
    } else {
      throw new Error('Query parameter should be an object');
    }
  } catch (error) {
    return callback(error);
  }
};

// custom sort function
fileStorage.prototype.sortByKey = function(array, key, asc) {
  var _keys = key.split('.'),
    len = _keys.length;
  return array.sort(function(a, b) {
    var x = a,
      y = b;
    for (var i = 0; i < len; i++) {
      x = x[_keys[i]];
      y = y[_keys[i]];
    }
    if (asc) {
      return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    }
    return ((y < x) ? -1 : ((y > x) ? 1 : 0));
  });
};

module.exports = new fileStorage();