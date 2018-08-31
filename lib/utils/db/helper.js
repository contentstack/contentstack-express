/*!
 * contentstack-express
 * copyright (c) Built.io Contentstack
 * MIT Licensed
 */

'use strict';

/**
 * Module Dependencies.
 */

var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var config = require('../config');
var Result = require('./query-builder/result');
var languages = config.get('languages');

var promisifiedHelper = require('./promisified-helper');
var callbackHelper = require('./callback-helper');

var deliveryS = (process.env.SYNC === 'false') ? true: false;

/*
 * generateCTNotFound
 * @description  : generateCTNotFound generates ContentType Error not found.
 * @params       : locale     {string} - locale
 *                 contentTypeUID {string} - contentTypeUID
 * @return       : isCyclic {boolean}
 */
exports.generateCTNotFound = function (locale, contentTypeUID) {
  var model = this.getContentPath(locale);
  var jsonPath = path.join(model, contentTypeUID + '.json');
  var error = null;

  if (!jsonPath || !fs.existsSync(jsonPath)) {
    error = new Error('The Content Type uid ' + contentTypeUID + ' was not found or is invalid');
    error.code = 422;
    throw error;
  }
};

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
  var __keys = ['locale', '_remove', 'include_references', 'include_count', '_include_previous', '_include_next', '_referenceDepth'];
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
        _keys[_index] = 'values';
        var _key = _keys.join('.');
        query[_key] = _value;
        delete query[key];
      } else if (query[key] && typeof query[key] == 'object') {
        _filterQuery(query[key]);
      }
    }
  };

  if (!build) {
    _filterQuery(_query);
  }
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
  } else if (_forms && typeof _forms == 'object') {
    _forms['_data'] = _removeKeys(_forms['_data']);
  }
  return _forms;
};

exports.findReferences = function (contentType) {
  if (contentType && contentType.schema && contentType.schema.length) {
    var _data = {},
      _keys = ['title', 'uid', 'schema', 'options', 'singleton', 'references', 'created_at', 'updated_at'];

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
        if (_schema[i] && _schema[i]['data_type'] && _schema[i]['data_type'] == 'reference') {
          var field = ((parent) ? parent + ':' + _schema[i]['uid'] : _schema[i]['uid']);
          _data[field] = _schema[i]['reference_to'];
        } else if (_schema[i] && _schema[i]['data_type'] && _schema[i]['data_type'] == 'group' && _schema[i]['schema']) {
          _findReferences(_schema[i]['schema'], ((parent) ? parent + ':' + _schema[i]['uid'] : _schema[i]['uid']));
        }
      }
    };

    contentType = _removeKeys(contentType);

    _findReferences(contentType.schema, '_data');
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
      var entry = {
        '_uid': _entry['_uid'],
        '_data': {},
        '_content_type_uid': content_type_id
      };
      for (var f = 0, _f = fields.length; f < _f; f++) {
        entry['_data'][fields[f]] = _entry['_data'][fields[f]];
      }
      return entry;
    };

    if (_entries instanceof Array) {
      for (var i = 0, total = _entries.length; i < total; i++) {
        _entries[i] = _filterData(_entries[i]);
      }
    } else if (_entries && typeof _entries == 'object') {
      _entries = _filterData(_entries);
    }
  }
  return _entries;
};

exports.getContentPath = function (langCode) {
  var idx = _.findIndex(languages, {
    'code': langCode
  });
  if (~idx) {
    return languages[idx]['contentPath'];
  } else {
    console.error('Language ' + langCode +' does not exist');
  }
};

exports.getAssetPath = function (langCode) {
  var idx = _.findIndex(languages, {
    'code': langCode
  });
  if (~idx) {
    return languages[idx]['assetsPath'];
  } else {
    console.error('Language ' + langCode +' does not exist');
  }
};

exports.getPromise = function (query) {
  return new Promise(function (resolve, reject) {
    if (deliveryS) {
      return promisifiedHelper.query(query)
        .then(resolve)
        .catch(reject);
    } else {
      return promisifiedHelper.query(query)
        .then(resolve)
        .catch(reject);
    }
  });
}