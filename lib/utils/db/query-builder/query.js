/*!
 * contentstack-express
 * copyright (c) Built.io Contentstack
 * MIT Licensed
 */

'use strict';

/**
 * Module Dependencies.
 */

var _ = require('lodash');
var helper = require('./../helper');

var common = {
    updateField: function (field) {
        return '_data.' + field;
    },
    compare: function(operator) {
        return function(field, value) {
            if (field && typeof value != 'undefined' && typeof field === 'string') {
                field = common.updateField(field);
                this._query[field] = this._query[field] || {};
                if(operator){
                    this._query[field][operator] = value;
                } else {
                    this._query[field] = value;
                }
            } else {
                console.error('Kindly provide valid parameters for %s.', operator || 'where');
            }
            return this;
        }
    },
    logical: function(operator) {
        return function() {
            var _query = [];
            for (var i = 0, _i = arguments.length; i < _i; i++) {
                if (arguments[i] instanceof Query && arguments[i]._query) {
                    _query.push(arguments[i]._query);
                } else if (typeof arguments[i] === 'object') {
                    _query.push(arguments[i]);
                }
            }
            if (this._query.query[operator]) {
                this._query.query[operator] = this._query.query[operator].concat(_query);
            } else {
                this._query.query[operator] = _query;
            }
            return this;
        }
    },
    containers: function(operator) {
        return function(field, values) {
            if (field && values && typeof field === 'string' && values instanceof Array) {
                field = common.updateField(field);
                this._query.query[field] = this._query.query[field] || {};
                this._query.query[field][operator] = values;
            } else {
                console.error('Kindly provide valid parameters for %s.', operator);
            }
            return this;
        }
    },
    sort: function(operator) {
        return function(field) {
            if (field && typeof field === 'string') {
                field = common.updateField(field);
                this._query.options = {};
                this._query.options.sort = this._query.options.sort || {};
                this._query.options.sort[field] = operator;
            } else {
                console.error('Kindly provide valid sorting parameter.');
            }
            return this;
        }
    },
    exists: function(operator) {
        return function(field) {
            if (field && typeof field === 'string') {
                field = common.updateField(field);
                this._query.query[field] = this._query.query[field] || {};
                this._query.query[field]['$exists'] = operator;
            } else {
                console.error('Kindly provide valid parameters for exists.');
            }
            return this;
        }
    }
};

function Query() {
    this._query = {
        query: {}
    };
};

Query.prototype.where = common.compare();

Query.prototype.query = function(query) {
    if(query && typeof query === 'object') {
        this._query.query = _.merge(this._query.query, query, function(src, dest) {
            if(typeof src === 'object' && src instanceof Array) {
                return src.concat(dest);
            }
        });
    } else {
        console.error('Kindly provide the query of object type.');
    }
    return this;
};

Query.prototype.exists = common.exists(true);

Query.prototype.notExists = common.exists(false);

Query.prototype.notContainedIn = common.containers('$nin');

Query.prototype.containedIn = common.containers('$in');

Query.prototype.or = common.logical('$or');

Query.prototype.and = common.logical('$and');

Query.prototype.regex = function() {
    var field, value, options;
    if(arguments.length === 3 && typeof arguments[0] === 'string' && typeof arguments[1] === 'string' && typeof arguments[2] === 'string' && arguments[1] && arguments[2]) {
        field = common.updateField(arguments[0]);
        value = arguments[1];
        options = arguments[2];
        this._query.query[field] = {
            '$regex': new RegExp(value, options)
        };
    } else if(arguments.length === 2 && typeof arguments[0] === 'string' && arguments[1] instanceof RegExp) {
        field = common.updateField(arguments[0]);
        value = arguments[1];
        this._query.query[field] = {
            '$regex': value
        };
    } else {
        console.error('Kindly provide valid parameters for regex.');
    }
    return this;
};

Query.prototype.lessThan = common.compare('$lt');

Query.prototype.lessThanEqualTo = common.compare('$lte');

Query.prototype.greaterThan = common.compare('$gt');

Query.prototype.greaterThanEqualTo = common.compare('$gte');

Query.prototype.elementMatch = common.compare('$elemMatch');

Query.prototype.notEqualTo = common.compare('$ne');

Query.prototype.ascending = common.sort(1);

Query.prototype.descending = common.sort(-1);

Query.prototype.tags = function(values) {
    if (Array.isArray(values)) {
        this._query.query[common.updateField('tags')] = {
            '$in': values
        };
        return this;
    } else {
        console.error('Kindly provide valid parameters');
    }
};

Query.prototype.skip = function(skip) {
    this._query.options.skip = skip;
    return this;
};

Query.prototype.limit = function(limit) {
    this._query.options.limit = limit;
    return this;
};

Query.prototype.referenceDepth = function (depth) {
    if (typeof depth === 'number') {
        this._query._referenceDepth = depth;
    } else {
        console.error('Kindly provide \'numeric\' parameter for referenceDepth()');
    }
    return this;
}

Query.prototype.findOne = function() {
    this._query._operation = 'findOne';
    this._query.returnSingle = true;
    return helper.getPromise(this);
};

Query.prototype.find = function() {
    this._query._operation = 'find';
    return helper.getPromise(this);
};

Query.prototype.includeCount = function() {
    this._query.include_count = true;
    return this;
};

Query.prototype.excludeUnpublishDeletion = function () {
    this._query.excludeUnpublishDeletion = true;
    return this;
}

Query.prototype.excludeReference = function() {
    this._query.include_references = false;
    return this;
};

Query.prototype.count = function() {
    this._query._operation = 'count';
    // this._query._count = true;
    return helper.getPromise(this);
};

Query.prototype.toJSON = function() {
    this._query.returnJSON = true;
    return this;
};

module.exports = Query;