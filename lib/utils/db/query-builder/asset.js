/*!
 * contentstack-express
 * copyright (c) Contentstack
 * MIT Licensed
 */

'use strict';

/**
 * Module dependencies.
 */
var _ = require('lodash');
var Query = require('./query');
var helper = require('../helper');

/**
 * Asset's query builder class
 * @param {String} uid : Asset uid
 */
var Asset = function(uid) {
  Query.call(this);
  if (typeof uid === 'string' && uid) this._uid = uid;
  this.object = {};
};

/**
 * Inherit Queryfilters into Asset class
 * @type {Object} (Inherit query filter instances)
 */
Asset.prototype = Object.create(Query.prototype);

/**
 * QB: Insert
 * @param  {Object} data : Asset object
 * @return {Number}      : Status
 */
Asset.prototype.insert = function(data) {
  this._operation = 'insert';
  if (this.content_type_id && this.content_type_id === '_assets' && this._uid) {
    this.object._data = data;
    return helper.getPromise(this);
  }
  throw new Error(`Kindly provide 'asset_uid' to insert the data.`);
};

/**
 * QB: Update
 * @param  {Object} data : Asset object
 * @return {Number}      : Status
 */
Asset.prototype.update = function(data) {
  this._operation = 'upsert';
  if (this.content_type_id && this.content_type_id === '_assets') {
    this.object._data = data;
    return helper.getPromise(this);
  }
  throw new Error(`Kindly provide 'content_type_id' to update the data.`);
};

/**
 * QB: Remove
 * @return {Number} : Status
 */
Asset.prototype.remove = function() {
  this._operation = 'remove';
  return helper.getPromise(this);
};

module.exports = Asset;