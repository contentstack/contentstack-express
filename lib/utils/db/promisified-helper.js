var Promise = require('bluebird');
var path = require('path');
var _ = require('lodash');
var sift = require('sift');

var fs = Promise.promisifyAll(require('fs'), { suffix: 'P'});

var utils = require('./helper.js');
var db = require('./providers');
var context = require('../context');

function PromisifiedHelper () {};

PromisifiedHelper.prototype.queryBuilder = function (query, language, content_type_uid, callback) {
  var self = this;
  return new Promise(function (resolve, reject) {
    var skip_uids = ['_routes', '_content_types', '_assets'];
    if (query && Object.keys(query).length && content_type_uid && skip_uids.indexOf(content_type_uid) === -1) {
      var content_path = path.join(self.getContentPath(language), '_content_types.json');
      return fs.readFileP(content_path).then(function (content_types) {
        content_types = JSON.parse(content_types);
        var content_type;

        // use for loop for performance improvement
        for (var i = 0, _i = content_types.length; i < _i; i++) {
          if (content_types[i]._uid === content_type_uid) {
            content_type = content_types[i];
            break;
          }
        }

        var references;
        if (content_type) {
          references = content_type._data.references || {};
        }
        if (references && Object.keys(references).length > 0) {
          var query_fields = Object.keys(query);
          return Promise.map(query_fields, function (filterField) {
            return new Promise(function (_resolve, _reject) {
              var _calls = {};
              var _filterField = filterField.toString();
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
                  var newFilterField = filterField.replace(newRefField, '_data'); // remove this entry, replacement if system going to attach the '_data.'
                  refQuery[newFilterField] = query[filterField];
                  delete query[filterField];
                }
              }

              if (refQuery && Object.keys(refQuery).length) {
                var entries_path = path.join(self.getContentPath(language), refForm + '.json');
                return fs.readFileP(entries_path).then(function (entries) {
                  entries = JSON.parse(entries);
                  entries = sift(refQuery, entries);
                  if (entries && entries.length) {
                    query[_filterField] = {
                      $in: _.pluck(entries, '_data.uid')
                    }
                  } else {
                    query[_filterField] = {
                      $in: []
                    }
                  }
                  return _resolve();
                }).catch(_reject);
              } else if (typeof query[filterField] === 'object' && query[filterField] instanceof Array) {
              	// called for '$and', '$or' queries..
                return Promise.map(query[filterField], function (field) {
                  return self.queryBuilder(query[filterField][field], language, content_type_uid)
                    .then(_resolve)
                    .catch(_reject);
                });
              } else {
                return _resolve();
              }
            });
          }, {concurrency: 2}).then(resolve).catch(reject);
        } else {
          return resolve(query);
        }
      }).catch(reject);
    } else {
      return resolve(query);
    }
  });
};

PromisifiedHelper.prototype.cleanup = function (error, query, data) {
	return new Promise(function (resolve, reject) {
    try {
      if (error) {
        // re-set
        query._query = {};
      	throw error;
      } else {
        if ((query._query._operation === 'findOne' || query._query._operation === 'find') && !query._query.excludeUnpublishDeletion) {
        	self.removeUnpublishedAssets(data);
        }
        if (!query._query.returnJSON) {
        	data = self.resultWrapper(data);
        }
        data = self.spreadResult(data);
        // re-set
        query._query = {};
        return resolve(data);
      }
    } catch (error) {
      return reject(error);
    }
	});
};

// create the promise for the query
PromisifiedHelper.prototype.query = function (queryObject) {
  var self = this;
  var query = queryObject._query;
	return new Promise(function (resolve, reject) {
	  try {
	    /*
	     * setting the locale, setting the options, setting the default sort option to publish_at descending
	     */
	    query.locale = query.locale || context.get('language') || config.get('languages')[0].code;

	    if (query._query && query._query._bulk_insert) {
	      query._operation = 'bulkInsert';
	    }
	    switch (query._operation) {
	      case 'upsert':
	      case 'remove':
	      case 'insert':
        case 'bulkInsert':
          var _query = _.clone(query, true);
	        return db[query._operation](_query, function (error, response) {
	        	return self.cleanup(error, queryObject, response)
	        		.then(resolve)
	        		.catch(reject);
	        });
	      case 'findOne':
	      case 'count':
	      case 'find':
	        query.options = query.options || {};
	        query.options.sort = query.options.sort || {
	          '_data.published_at': -1
	        };
	        var _query = _.clone(query, true);

	        return self.queryBuilder(_query.query, _query.locale, _query.content_type_uid).then(function () {
            return db[query._operation](_query, _query.options, function (error, response) {
            	return self.cleanup(error, queryObject, response)
            		.then(resolve)
            		.catch(reject);
            });
	        }).catch(function (error) {
	          return reject(error);
	        });
	    }
	  } catch (error) {
	    return reject(error);
	  }
	});
}

/**
 * The method removes any asset object, that isn't published
 * @param  {Object} : The entry object who's unpublished asset objects are to be removed
 */

PromisifiedHelper.prototype.removeUnpublishedAssets = function (data) {
  function _removeUnpublishedAssets(objekt, parent, pos) {
    if (_.isPlainObject(objekt) && _.has(objekt, 'filename') && _.has(objekt, 'uid') && !_.has(objekt, '_internal_url')) {
      if (typeof pos !== 'undefined') {
        if (typeof pos === 'number') {
          delete parent[pos];
          // parent.splice(pos, 1);
        } else if (typeof pos === 'string') {
          parent[pos] = null;
        }
      }
    } else if (_.isPlainObject(objekt)) {
      for (var key in objekt) {
        _removeUnpublishedAssets(objekt[key], objekt, key);
      }
    } else if (_.isArray(objekt) && objekt.length) {
      for (var i = 0; i <= objekt.length; i++) {
        _removeUnpublishedAssets(objekt[i], objekt, i);
      }

      parent[pos] = _.compact(objekt)
    }
  }

  if (data.entry) {
    _removeUnpublishedAssets(data.entry, data)
  } else if (data.entries) {
    data.entries.map(function (entry) {
      _removeUnpublishedAssets(entry, data);
    });
  }
};

// generate the Result object
PromisifiedHelper.prototype.resultWrapper = function (result) {
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
PromisifiedHelper.prototype.spreadResult = function (result) {
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

module.exports = new PromisifiedHelper();