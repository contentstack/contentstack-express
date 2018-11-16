/*!
 * contentstack-express
 * copyright (c) Contentstack
 * MIT Licensed
 */

'use strict';

/**
 * Module Dependencies.
 */

var helper = require('./../helper'),
    Query = require('./query'),
    Entry = require('./entry'),
    Asset = require('./asset');

var QueryBuilder = function() {};

QueryBuilder.prototype.ContentType = function(uid) {
    if(typeof uid === "string" && uid) this.content_type_id = uid;
    return this;
};

QueryBuilder.prototype.Entry = function(uid) {
    var entry = new Entry(uid),
        entryObject = helper.merge(entry, this);
    return entryObject;
};

QueryBuilder.prototype.Assets = function(uid) {
    this.content_type_id = '_assets';
    var asset = new Asset(uid),
        assetObject = helper.merge(asset, this);
    return assetObject;
};

QueryBuilder.prototype.language = function(locale) {
    this._locale = null;
    if(typeof locale === "string" && locale) this._locale = locale;
    return this;
};

QueryBuilder.prototype.Query = function() {
    var query = new Query();
    var queryObject = helper.merge(query, this);
    return queryObject;
};

module.exports = QueryBuilder;
