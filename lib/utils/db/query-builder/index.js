/*!
 * contentstack-express
 * copyright (c) Contentstack
 * MIT Licensed
 */

'use strict';

/**
 * Module Dependencies.
 */
var helper = require('../helper');
var Query = require('./query');
var Entry = require('./entry');
var Asset = require('./asset');

/**
 * Query builder class
 */
var QueryBuilder = function() {};

/**
 * Set query's content type
 * @param {String} uid : Content type uid
 */
QueryBuilder.prototype.ContentType = function(uid) {
  if (typeof uid === "string" && uid) this.content_type_id = uid;
  return this;
};

/**
 * Set query's entry uid
 * @param {String} uid : Entry uid
 */
QueryBuilder.prototype.Entry = function(uid) {
  var entry = new Entry(uid),
    entryObject = helper.merge(entry, this);
  return entryObject;
};

/**
 * Set query's asset uid
 * @param {String} uid : Asset uid
 */
QueryBuilder.prototype.Assets = function(uid) {
  this.content_type_id = '_assets';
  var asset = new Asset(uid),
    assetObject = helper.merge(asset, this);
  return assetObject;
};

/**
 * Set query's locale
 * @param {String} locale : Language's locale code
 */
QueryBuilder.prototype.language = function(locale) {
  this._locale = null;
  if (typeof locale === "string" && locale) this._locale = locale;
  return this;
};

/**
 * Initialize Query class
 */
QueryBuilder.prototype.Query = function() {
  var query = new Query();
  var queryObject = helper.merge(query, this);
  return queryObject;
};

module.exports = QueryBuilder;