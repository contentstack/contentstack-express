/**
 * Module dependencies.
 */
var _ = require('lodash'),
    Query = require('./query'),
    helper = require('./../helper');

var Asset = function(uid) {
    Query.call(this);
    if(typeof uid === "string" && uid) this._uid = uid;
    this.object = {};
};

Asset.prototype = Object.create(Query.prototype);

Asset.prototype.insert = function(data) {
    this._operation = "insert";
    if(this.content_type_id && this.content_type_id === '_assets' && this._uid) {
        this.object['_data'] = data;
        return helper.getPromise(this);
    } else {
        console.error("Kindly provide 'asset_uid' to insert the data.");
    }
};

Asset.prototype.update = function(data) {
    this._operation = "upsert";
    if(this.content_type_id && this.content_type_id == "_assets" ) {
        this.object['_data'] = data;
        return helper.getPromise(this);
    } else {
        console.error("Kindly provide 'content_type_id' to update the data.");
    }
};

Asset.prototype.remove = function() {
    this._operation = "remove";
    return helper.getPromise(this);
};

module.exports = Asset;