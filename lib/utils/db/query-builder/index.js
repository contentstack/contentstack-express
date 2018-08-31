/*!
 * contentstack-express
 * copyright (c) Built.io Contentstack
 * MIT Licensed
 */

'use strict';

/**
 * Module Dependencies.
 */

var helper = require('./../helper');
var Query = require('./query');
var Entry = require('./entry');
var Asset = require('./asset');

var QueryBuilder = function() {
    this._query = {};
};

QueryBuilder.prototype.ContentType = function(uid) {
    if(typeof uid === 'string') {
        this._query._content_type_uid = uid;
    }
    return this;
};

QueryBuilder.prototype.Entry = function(uid) {
    var entry = new Entry(uid);
    var entryObject = helper.merge(entry, this);
    return entryObject;
};

QueryBuilder.prototype.Assets = function(uid) {
    this._query.content_type_uid = '_assets';
    var asset = new Asset(uid);
    var assetObject = helper.merge(asset, this);
    return assetObject;
};

QueryBuilder.prototype.language = function(locale) {
    if(typeof locale === 'string') {
        this._query.locale = locale;
    }
    return this;
};

QueryBuilder.prototype.Query = function() {
    var query = new Query();
    var queryObject = helper.merge(query, this);
    return queryObject;
};

module.exports = QueryBuilder;
