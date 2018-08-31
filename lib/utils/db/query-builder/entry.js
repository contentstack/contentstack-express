/*!
 * contentstack-express
 * copyright (c) Built.io Contentstack
 * MIT Licensed
 */

'use strict';

/**
 * Module Dependencies.
 */
var util = require('util');

var Query = require('./query');
var helper = require('../helper');

var Entry = function(uid) {
    Query.call(this);
    this._query = this._query || {};
    this._query.query = this._query.query || {};
    if(typeof uid === 'string') {
        this._query.query.uid = uid;
    }
};

// Inherit Query
util.inherits(Entry, Query);

Entry.prototype.insert = function(data) {
    this._query._operation = 'insert';
    if(this._query._content_type_uid) {
        this._query.object = {
            data: data
        };
        return helper.getPromise(this);
    } else {
        console.error('Kindly provide \'content_type_id\' to insert the data.');
    }
};

Entry.prototype.update = function(data) {
    this._query._operation = 'upsert';
    if(this._query._content_type_uid) {
        this._query.object = {
            data: data
        };
        return helper.getPromise(this);
    } else {
        console.error('Kindly provide \'content_type_id\' to update the data.');
    }
};

Entry.prototype.remove = function() {
    this._query._operation = 'remove';
    return helper.getPromise(this);
};

Entry.prototype.fetch = function() {
    if (typeof this._query.query._uid !== 'string') {
        console.error('Kindly provide an entry uid. e.g. .Entry(\'bltsomething123\')');
        return;
    } else {
        this._query._operation = 'findOne';
        return helper.getPromise(this);
    }
};

module.exports = Entry;
