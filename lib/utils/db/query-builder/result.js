/*!
 * contentstack-express
 * copyright (c) Contentstack
 * MIT Licensed
 */
'use strict';
/**
 * Module dependencies.
 * @ignore
 */
var _ = require('lodash');

/**
 * @summary Creates an instance of `Result`.
 * @description An initializer is responsible for creating Result object.
 * @param objects
 * @example
 * @returns {Result}
 * @ignore
 */
function Result(object) {
    var _object = object || null;
    this.object = function () {
        return _object;
    }
    return this;
};

/**
 * @summary `toJSON` convert `Result` to plain javascript object.
 * @description Converts `Result` to plain javascript object.
 * @example
 * Result.toJSON()
 * @returns {Plain Javascript Object}
 * @ignore
 */
Result.prototype.toJSON = function() {
    return (this.object()) ? _.cloneDeep(this.object()) : null;
};

/**
 * @summary `get` to access the key value.
 * @description `get` to access the key value.
 * @example
 * Result.get(key)
 * @returns {value/Result}
 * @ignore
 */
Result.prototype.get = function(key) {
    var object = this.object();
    if(object && key) {
        var fields = key.split('.');
        var value = fields.reduce(function(prev, field) {
            return prev[field];
        }, object);
        return value;
    }
    return ;
};

module.exports = function(object) {
    return new Result(object);
};