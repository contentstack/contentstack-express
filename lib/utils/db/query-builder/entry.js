/*!
 * contentstack-express
 * copyright (c) Contentstack
 * MIT Licensed
 */

'use strict';

/**
 * Module Dependencies.
 */
var _ = require('lodash');
var Query = require('./query');
var helper = require('../helper');
var context = require('../../context');
var datastore = require('../providers');
var Inmemory = require('../inmemory');

/**
 * Entry's query builder class
 * @param {String} uid : Entry uid
 */
var Entry = function(uid) {
  Query.call(this);
  if (typeof uid === 'string' && uid) this._uid = uid;
  this.object = {};
};

/**
 * Inherit Queryfilters into Entry class
 * @type {Object} (Inherit query filter instances)
 */
Entry.prototype = Object.create(Query.prototype);

/**
 * QB: Insert
 * @param  {Object} data : Entry object
 * @return {Number}      : Status
 */
Entry.prototype.insert = function(data) {
  this._operation = 'insert';
  if (this.content_type_id) {
    this.object._data = data;
    return helper.getPromise(this);
  }
  throw new Error(`Kindly provide 'content_type_id' to insert the data.`);
};

/**
 * QB: Update
 * @param  {Object} data : Entry object
 * @return {Number}      : Status
 */
Entry.prototype.update = function(data) {
  this._operation = 'upsert';
  if (this.content_type_id) {
    this.object._data = data;
    return helper.getPromise(this);
  }
  throw new Error(`Kindly provide 'content_type_id' to update the data.`);
};

/**
 * QB: Remove
 * @return {Number} : Status
 */
Entry.prototype.remove = function() {
  this._operation = 'remove';
  return helper.getPromise(this);
};

/**
 * QB: Fetch a particular entry
 * @return {Object} : Fetches a single entry, based on query filters applied
 */
Entry.prototype.fetch = function() {
  if (!(typeof this._uid === 'string')) {
    throw new Error(
      `Kindly provide an entry uid. e.g. .Entry('bltsomething123')`);
  }
  this._operation = 'fetch';
  return helper.getPromise(this);
};

module.exports = Entry;