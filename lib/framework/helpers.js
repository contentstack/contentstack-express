/*!
 * contentstack-express
 * copyright (c) Built.io Contentstack
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */
var fs = require('graceful-fs'),
    path = require('path'),
    _ = require('lodash'),
    sift = require('sift'),
    utils = require('./../utils'),
    InMemory = require('./../utils/db/inmemory');

var context = utils.context,
    config = utils.config,
    languages = config.get('languages');

module.exports = function(app) {
    // To get the partials
    app.locals.get = function(partial, limit, language, includeReference) {
        var language = language || context.get('lang'),
            limit = limit || 1,
            entry = find({"content_type": partial, "language": language, "include_references": includeReference});

        if (entry && entry.length) entry = (limit == 1) ? entry[0] : entry.slice(0, limit);
        return entry;
    };

    // get the asset url
    app.locals.getAssetUrl = function(asset) {
        return (asset && asset._internal_url) ? encodeURI(asset._internal_url) : "";
    };

    // To get the current url
    app.locals.getUrl = function(url) {
        var lang = context.get('lang'),
            prefix = getRelativePrefix(lang).slice(0, -1);
        url =  prefix + ((!url) ? context.get('entry').url : url);
        return url;
    };

    // To get the title of the current page
    app.locals.getTitle = function() {
        return context.get('entry').title;
    };
};

function find(query) {
    var __data,
        contentTypeUid = query.content_type,
        contentPath = path.join.call(null, getContentPath(query.language), contentTypeUid + '.json'),
        language = query.language,
        data = InMemory.get(language, contentTypeUid, {}, true),
        include_references = (typeof query.include_references === 'boolean') ? query.include_references : true,
        query = filterQuery(query);

    if(data) {
        data = sift(query, data);
    } else if(fs.existsSync(contentPath)) {
        var model = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));
        data = sift(query, model);
        InMemory.set(language, contentTypeUid, null, data, true);
    }
    if(data) {
        __data = _.pluck(_.clone(data, true), '_data');
        if(include_references) __data = includeReferences(__data, language);
    }
    return __data;
};

function includeReferences(data, language) {
    var flag = false;
    var _includeReferences = function (data) {
        for (var _key in data) {
            if (typeof data[_key] === "object") {
                if (data[_key] && data[_key]["_content_type_id"]) {
                    flag = true;
                    var _query = {"content_type": data[_key]["_content_type_id"], "_uid": {"$in": data[_key]["values"]}, "language": language},
                        _data = find(_query);
                    data[_key] = (_data && _data.length) ? _data :  [];
                } else {
                    _includeReferences(data[_key]);
                }
            }
        }
    };

    var recursive = function (data) {
        _includeReferences(data);
        if (flag) {
            flag = false;
            return setImmediate(function () {
                return recursive(data);
            });
        }
    };

    try {
        recursive(data);
    } catch (e) {
        console.error("View-Helper Include Reference Error: ", e.message);
    }
    return data;
};

function getContentPath(langCode) {
    var idx = _.findIndex(languages, {"code": langCode});
    if(~idx) {
        return languages[idx]['contentPath'];
    } else {
        console.error("Language doesn't exists");
    }
};

function getRelativePrefix(langCode) {
    var idx = _.findIndex(languages, {"code": langCode});
    if(~idx) {
        return languages[idx]['relative_url_prefix'];
    } else {
        console.error("Language doesn't exists");
    }
};

function filterQuery(_query) {
    var keys = ['include_references', 'language', 'content_type'];
    for(var i = 0, total = keys.length; i < total; i++) {
        delete _query[keys[i]];
    }
    return _query;
};
