/*!
 * contentstack-express
 * copyright (c) Contentstack
 * MIT Licensed
 */

'use strict';

/**
 * Module Dependencies.
 */
var _ = require('lodash'),
    Query = require('./query'),
    helper = require('./../helper'),
    context = require('./../../context'),
    datastore = require('./../providers/index'),
    Inmemory = require('./../inmemory/index');

var Entry = function(uid) {
    Query.call(this);
    if(typeof uid === "string" && uid) this._uid = uid;
    this.object = {};
};

/**
 * Inherit Entity prototype with Query
 * @ignore
 */
Entry.prototype = Object.create(Query.prototype);

Entry.prototype.insert = function(data) {
    this._operation = "insert";
    if(this.content_type_id) {
        this.object['_data'] = data;
        return helper.getPromise(this);
    } else {
        console.error("Kindly provide 'content_type_id' to insert the data.");
    }
};

Entry.prototype.update = function(data) {
    this._operation = "upsert";
    if(this.content_type_id) {
        this.object['_data'] = data;
        return helper.getPromise(this);
    } else {
        console.error("Kindly provide 'content_type_id' to update the data.");
    }
};

Entry.prototype.remove = function() {
    this._operation = "remove";
    return helper.getPromise(this);
};

Entry.prototype.fetch = function() {
    if(!(typeof this._uid === "string")) console.error("Kindly provide an entry uid. e.g. .Entry('bltsomething123')");
    this._operation = "fetch";
    return helper.getPromise(this);
};

module.exports = Entry;
