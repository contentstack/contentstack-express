/*!
 * contentstack-express
 * Copyright (c) Contentstack
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */
var fs = require('graceful-fs');
var path = require('path');
var _ = require('lodash');
var debug = require('debug')('framework:helper');
var sift = require('sift').default;
var utils = require('../utils');
var InMemory = require('../utils/db/inmemory');
var context = utils.context;
var config = utils.config;
var languages = config.get('languages');
var assetRoute = '_assets';

module.exports = function(app) {
  // To get the partials
  app.locals.get = function(partial, limit, language, includeReference) {
    debug('Kindly use plugins for fetching data. Using partials will slow down your application, as it makes synchronous calls');
    language = language || context.get('lang');
    limit = limit || 1;
    var entry = find({
      content_type: partial,
      language: language,
      include_references: includeReference,
      limit: limit || 1
    });
    if (entry && entry.length) {
      entry = (limit === 1) ? entry[0] : entry.slice(0, limit);
    }
    return entry;
  };

  // get the asset url
  app.locals.getAssetUrl = function(asset) {
    return (asset && asset._internal_url) ? encodeURI(asset._internal_url) : '';
  };

  // To get the current url
  app.locals.getUrl = function(url) {
    var lang = context.get('lang');
    var prefix = getRelativePrefix(lang).slice(0, -1);
    url = prefix + ((!url) ? context.get('entry').url : url);
    return url;
  };

  // To get the title of the current page
  app.locals.getTitle = function() {
    return context.get('entry').title;
  };
};

/**
 * Find the query's content
 * @param  {Object} query : Query to filter data on
 * @return {Object}       : Return filtered data
 */
function find(query) {
  var references = (_.isPlainObject(arguments[1]) && !_.isEmpty(arguments[1])) ? arguments[1] : {};
  var _inMemory = (_.isPlainObject(arguments[2]) && !_.isEmpty(arguments[2])) ? arguments[2] : {};
  var __data;
  var contentTypeUid = query.content_type;
  var contentPath = (contentTypeUid === assetRoute) ? path.join.call(null, getAssetPath(query.language), contentTypeUid + '.json') : path.join.call(null, getContentPath(query.language), contentTypeUid + '.json');
  var language = query.language;
  var limit = query.limit || 0;
  // Do not load from 'InMemory', in case `SYNC` has been set to false
  var data = (process.env.SYNC !== 'false') ? InMemory.get(language, contentTypeUid, {}, true) : false;
  var include_references = (typeof query.include_references === 'boolean') ? query.include_references : true;
  query = filterQuery(query);

  if (data) {
    data = sift(query, data);
  } else if (_inMemory[language] && _inMemory[language][contentTypeUid]) {
    data = sift(query, _inMemory[language][contentTypeUid]);
  } else if (fs.existsSync(contentPath)) {
    var model = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));
    InMemory.set(language, contentTypeUid, null, model, true);
    if (_inMemory[language]) {
      _inMemory[language][contentTypeUid] = model;
    } else {
      _inMemory = {
        [language]: {
          [contentTypeUid]: model
        }
      };
    }
    data = sift(query, model);
  }
  if (data && data.length && limit) {
    data = data.slice(0, limit);
  }
  if (data) {
    __data = _.map(_.clone(data, true), '_data');
    if (include_references) __data = includeReferences(__data, language, references, _inMemory);
  }
  return __data;
}

/**
 * Include data's references
 * @param  {Object} data       : Data to find references on
 * @param  {String} language   : Language of the data
 * @param  {Object} references : Reference map
 * @param  {Object} _inMemory  : Cached data for the current reference lookup
 * @return {Object}            : Data with all its references
 */
function includeReferences(data, language, references, _inMemory) {
  if (_.isEmpty(references)) {
    references = {};
  }
  var flag = false;
  var _includeReferences = function(data, parentID) {
    for (var _key in data) {
      if ((_.isUndefined(parentID) || _.isNull(parentID)) && data && data.uid) parentID = data.uid;
      if (typeof data[_key] === 'object') {
        if (data[_key] && data[_key]['_content_type_id']) {
          flag = true;
          references[parentID] = references[parentID] || [];
          references[parentID] = _.uniq(references[parentID].concat(data[_key]['values']));
          var _uid = (data[_key]['_content_type_id'] === assetRoute && data[_key]['values'] && typeof data[_key]['values'] === 'string') ? data[_key]['values'] : {
            $in: data[_key]['values']
          };
          var _query = {
            content_type: data[_key]['_content_type_id'],
            _uid: _uid,
            language: language
          };
          if (_query.content_type != assetRoute) {
            _query['_uid']['$in'] = _.filter(_query['_uid']['$in'], function(uid) {
              var flag = checkCyclic(uid, references);
              return !flag;
            });
          }
          var _data = find(_query, references, _inMemory);
          var __data = [];
          if (_data && _query && _query['_uid']['$in']) {
            _query['_uid']['$in'].map(function(uid) {
              __data.push(_.find(_data, {
                uid: uid
              }));
            });
            _data = __data;
          }

          if (_query['_uid']['$in'] && _data) {
            if (typeof parseInt(_key) === 'number') {
              if (_data.length === 0) {
                // delete data[_key]
                data[_key] = {}
              } else if (_data.length === 1) {
                data[_key] = _data[0]
              } else {
                data[_key] = _data
              }
            } else {
              data[_key] = (_data.length) ? _data : []; 
            }
          } else {
            data[_key] = (_data && _data.length) ? _data[0] : {};
          }
        } else {
          _includeReferences(data[_key], parentID);
        }
      }
    }
  };
  var recursive = function(data) {
    _includeReferences(data);
    if (flag) {
      flag = false;
      return setImmediate(function() {
        return recursive(data);
      });
    }
  };
  try {
    recursive(data);
  } catch (error) {
    debug(`View-Helper Include Reference Error\n${error}`);
  }
  return data;
}

/**
 * Get content's storage path
 * @param  {String} langCode : Language's code
 * @return {String}          : Return the content's language storage path
 */
function getContentPath(langCode) {
  var idx = _.findIndex(languages, {
    code: langCode
  });
  if (~idx) {
    return languages[idx]['contentPath'];
  }
  debug(`@getContentPath: ${langCode} language does not exist!`);
}

/**
 * Get asset's storage path
 * @param  {String} langCode : Language's code
 * @return {String}          : Return the asset's language storage path
 */
function getAssetPath(langCode) {
  var idx = _.findIndex(languages, {
    code: langCode
  });
  if (~idx) {
    return languages[idx]['assetsPath'];
  }
  debug(`@getAssetPath: ${langCode} language does not exist!`);
}

/**
 * Return the particular language's url prefix
 * @param  {String} langCode : Language's code
 * @return {String}          : Return the language's relative url prefix
 */
function getRelativePrefix(langCode) {
  var idx = _.findIndex(languages, {
    code: langCode
  });
  if (~idx) {
    return languages[idx]['relative_url_prefix'];
  }
  debug(`@getRelativePrefix: ${langCode} language does not exist!`);
}

/**
 * Filter query by removing unwanted keys
 * @param  {Object} _query : The query to be filtered
 * @return {Object}        : Filtered query
 */
function filterQuery(_query) {
  var keys = ['include_references', 'language', 'content_type', 'limit'];
  for (var i = 0, total = keys.length; i < total; i++) {
    delete _query[keys[i]];
  }
  return _query;
}

/**
 * Detect cyclic references
 * @param  {String} uid     : Uid to be checked
 * @param  {Object} mapping : Array in which uid is to be checked
 * @return {Boolean}        : Return true or false
 */
function checkCyclic(uid, mapping) {
  var flag = false;
  var list = [uid];
  var getParents = function(child) {
    var parents = [];
    for (var key in mapping) {
      if (~mapping[key].indexOf(child)) {
        parents.push(key);
      }
    }
    return parents;
  };
  for (var i = 0; i < list.length; i++) {
    var parent = getParents(list[i]);
    if (~parent.indexOf(uid)) {
      flag = true;
      break;
    }
    list = _.uniq(list.concat(parent));
  }
  return flag;
}