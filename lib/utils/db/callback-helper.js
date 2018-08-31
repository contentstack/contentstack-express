var when = require('when');
var path = require('path');
var _ = require('lodash');
var sift = require('sift');

var db = require('./providers');
var inmemory = require('./inmemory');

var context = require('../context');
var config = require('../config');

function CallbackHelper () {
  var indexedContents = config.get('indexes');
  this.cachedContents = ['_routes', '_content_types', '_assets'];
  if (indexedContents) {
    this.cachedContents.concat(Object.keys(indexedContents));
  }

  // Do not iterate for skipped contents
  var skipContents = config.get('skipReferenceQuerying');
  this.skipContents = ['_routes', '_content_types', '_assets'];
  if (skipContents) {
    this.skipContents.concat(Object.keys(skipContents));
  }
}

CallbackHelper.prototype.queryBuilder = function (query, language, content_type_id) {
  if (query && Object.keys(query).length && content_type_id && this.skipContents.indexOf(content_type_id) === -1) {
    var self = this;
    var schema = inmemory.get(language, '_content_types', {
      _uid: content_type_id
    }),
    references = {};

    if (schema && schema.length) {
      schema = schema[0];
      references = schema.references || {};
    }

    // check if the reference exists in the system
    if (Object.keys(references).length > 0) {
      var requests = [];
      for (var filterField in query) {
        var _filterField = filterField;
        var refQuery, refForm;

        for (var refField in references) {
          var newRefField = refField.replace(/:/g, '.');
          if (filterField.indexOf(newRefField) === 0) {
            // processing the new query param
            _filterField = _filterField.split('.');
            _filterField[_filterField.length - 1] = 'uid';
            _filterField = _filterField.join('.');

            refForm = references[refField];
            refQuery = refQuery || {};
            // remove this entry, replacement if system going to attach the '_data.'
            var newFilterField = filterField.replace(newRefField, '_data');
            refQuery[newFilterField] = query[filterField];
            delete query[filterField];
          }
        }

        if (refQuery && Object.keys(refQuery).length) {
          var RefData = inmemory.get(language, content_type_id, refQuery),
            RefQuery = {
              '$in': []
            };
          if (RefData && RefData.length) RefQuery = {
            '$in': _.pluck(RefData, 'uid')
          };
        } else if (typeof query[filterField] === 'object' && query[filterField] instanceof Array) {
          for (var i = 0, total = query[filterField].length; i < total; i++) {
            self.queryBuilder(query[filterField][i], language, content_type_id);
          }
        }
      }
    }
  }
};

// create the promise for the query
CallbackHelper.prototype.query = function (queryObject) {
  var deferred = when.defer();
  try {
    var result, options, _query,
      excludeUnpublishDeletionFlag = false,
      self = queryObject,
      isJson = (typeof self.json === 'function') ? true : false,
      isSingle = (self._uid || self.single) ? true : false,
      callback = function (operation, excludeFlag) {
        return function (err, data) {
          try {
            self._locale = self._operation = self._uid = self.single = self.json = null;
            if (err) {
              throw err;
            }
            if ((operation === 'fetch' || operation === 'find') && !excludeFlag) {
              self.removeUnpublishedAssets(data);
            }
            if (!isJson) {
              data = self.resultWrapper(data);
            }
            data = self.spreadResult(data);
            return deferred.resolve(data);
          } catch (err) {
            return deferred.reject(err);
          }
        }
      };
    /*
     * setting the locale, setting the options, setting the default sort option to publish_at descending
     */
    self._locale = self._locale || context.get('lang') || 'en-us';

    if (self._query._bulk_insert) {
      self._operation = 'bulkinsert';
    }
    switch (self._operation) {
      case 'upsert':
      case 'remove':
      case 'insert':
        _query = _.clone(self.object, true);
        _query = _.merge(_query, {
          _content_type_uid: self.content_type_id,
          locale: self._locale
        });

        if (self._uid || (_query._data && _query._data.uid)) _query._uid = self._uid || _query._data.uid;
        db[self._operation](_query, callback(self._operation));
        break;
      case 'bulkinsert':
        _query = _.clone(self._query, true);
        _query = _.merge(_query, {
          _content_type_uid: self.content_type_id,
          locale: self._locale
        });
        db['bulkInsert'](_query, callback(self._operation));
        break;
      case 'fetch':
      case 'count':
      case 'find':
        options = self._options || {};
        options.sort = options.sort || {
          '_data.published_at': -1
        };
        _query = _.clone(self._query, true);

        self.queryBuilder(_query, self._locale, self.content_type_id);

        if (_query.excludeUnpublishDeletion) {
          delete _query['excludeUnpublishDeletion'];
          excludeUnpublishDeletionFlag = true;
        }
        //creating query based on the chain methods
        _query = _.merge(_query, {
          _content_type_uid: self.content_type_id,
          locale: self._locale
        });
        if (self._uid) _query = _.merge(_query, {
          _uid: self._uid
        });

        if (this.cachedContents.indexOf(self.content_type_id) === -1) {
          if (self.include_count) _query.include_count = true;
          if (self._uid || self.single) {
            datastore.findOne(_query, callback(self._operation, excludeUnpublishDeletionFlag));
          } else if (self._count) {
            datastore.count(_query, callback(self._operation, excludeUnpublishDeletionFlag));
          } else {
            datastore.find(_query, options, callback(self._operation, excludeUnpublishDeletionFlag));
          }
        } else {
          var results = inmemory.get(self._locale, self.content_type_id, _query);
          // entry/entries are added because to get the data under the result wrapper
          if (self._uid || self.single) {
            results = (results && results.length) ? results[0] : null;
            results = {
              'entry': results
            };
          } else if (self._count) {
            results = results || [];
            results = {
              'entries': results.length
            };
          } else {
            results = {
              'entries': results || []
            };
            if (self.include_count) results.count = results.entries.length;
          }
          callback(self._operation, excludeUnpublishDeletionFlag)(null, results);
        }
    }
    return deferred.promise;
  } catch (err) {
    return deferred.reject(err);
  }
}

/**
 * The method removes any asset object, that isn't published
 * @param  {Object} : The entry object who's unpublished asset objects are to be removed
 */

CallbackHelper.prototype.removeUnpublishedAssets = function (data) {
  function _removeUnpublishedAssets(objekt, parent, pos) {
    if (_.isPlainObject(objekt) && _.has(objekt, 'filename') && _.has(objekt, 'uid') && !_.has(objekt, '_internal_url')) {
      if (typeof pos !== 'undefined') {
        if (typeof pos === 'number') {
          delete parent[pos];
          // parent.splice(pos, 1);
        } else if (typeof pos === 'string') {
          parent[pos] = null;
        } else {}
      } else {}
    } else if (_.isPlainObject(objekt)) {
      for (var key in objekt)
        _removeUnpublishedAssets(objekt[key], objekt, key);
    } else if (_.isArray(objekt) && objekt.length) {
      for (var i = 0; i <= objekt.length; i++)
        _removeUnpublishedAssets(objekt[i], objekt, i);

      parent[pos] = _.compact(objekt)
    }
  }

  if (data.entry) {
    _removeUnpublishedAssets(data.entry, data)
  }  else if (data.entries) {
    data.entries.map(function (entry) {
      _removeUnpublishedAssets(entry, data);
    });
  }
}

// generate the Result object
CallbackHelper.prototype.resultWrapper = function (result) {
  if (result && typeof result.entries !== 'undefined') {
    if (result.entries && result.entries.length) {
      for (var i = 0, _i = result.entries.length; i < _i; i++) {
        result.entries[i] = Result(result.entries[i]);
      }
    } else if (result.entries && typeof result.entries === 'number') {
      result = {
        entries: result.entries
      };
    } else {
      result.entries = [];
    }
  } else if (result && typeof result.assets !== 'undefined') {
    if (result.assets && result.assets.length) {
      for (var j = 0, _j = result.assets.length; j < _j; j++) {
        result.assets[j] = Result(result.assets[j]);
      }
    } else {
      result.assets = [];
    }
  } else if (result && typeof result.entry !== 'undefined') {
    result.entry = Result(result.entry);
  } else {
    result = {
      '_write_operation_': result
    };
  }
  return result;
};

// spread the result object
CallbackHelper.prototype.spreadResult = function (result) {
  var _results = [];
  if (result && typeof result === 'object' && Object.keys(result).length) {
    if (typeof result.entries !== 'undefined') {
      if (typeof result.entries !== 'number') {
        _results.push(result.entries);
      } else {
        _results = result;
      }
    }
    if (typeof result.assets !== 'undefined') _results.push(result.assets);
    if (typeof result.schema !== 'undefined') _results.push(result.schema);
    if (typeof result.count !== 'undefined') _results.push(result.count);
    if (typeof result.entry !== 'undefined') _results = result.entry;
    if (typeof result._write_operation_ !== 'undefined') _results = result._write_operation_;
  }
  return _results;
};

module.exports = new CallbackHelper();