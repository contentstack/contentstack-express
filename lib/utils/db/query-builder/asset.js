/**
 * Module dependencies.
 */
var util = require('util');

var Query = require('./query');
var helper = require('../helper');

var Asset = function(uid) {
    Query.call(this);
    this._query = this._query || {};
    this._query.query = this._query.query || {};
    if(typeof uid === 'string') {
        this._query.query._uid = uid;
    }
};

// Inherit Query
util.inherits(Asset, Query);

Asset.prototype.insert = function(data) {
    this._query._operation = 'insert';
    if(this._query._content_type_uid && this._query._content_type_uid === '_assets' && this._query.query._uid) {
        this._query.object = {
            data: data
        }
        return helper.getPromise(this);
    } else {
        console.error('Kindly provide \'asset_uid\' to insert the data.');
    }
};

Asset.prototype.update = function(data) {
    this._query._operation = 'upsert';
    if(this._query._content_type_uid && this._query._content_type_uid === '_assets' && this._query.query._uid) {
        this._query.object = {
            data: data
        }
        return helper.getPromise(this);
    } else {
        console.error('Kindly provide \'asset_uid\' to upsert the data.');
    }
};

Asset.prototype.remove = function() {
    this._query._operation = 'remove';
    return helper.getPromise(this);
};

module.exports = Asset;