"use strict";

const _ = require("lodash"),
  Utils = require("./utils"),
  Commons = require("./commons");

class Query extends Commons {
  constructor() {
    super();
    this._query = {};
    this._query.query = {};
    this._options = {};
  }

  where(values) {
    if (typeof values === "object" || typeof values === "function") {
      this._query.query = this._query.query || {};
      this._query.query["where"] = values;
    } else {
      console.error(`Kindly provide valid parameters for 'where()'`);
    }
    return this;
  }

  query(query) {
    if (typeof query === "object") {
      this._query.query = _.merge(this._query.query || {}, query);
    } else {
      console.error(`Kindly provide 'query' with an argument of type 'Object'`);
    }
    return this;
  }

  exists(key) {
    if (typeof key === "string") return super.exists(true)(key);
    else return new Error(`Kindly provide 'string' parameter for 'exists'`);
  }

  notExists(args) {
    if (typeof key === "string") return super.exists(false)(key);
    else return new Error(`Kindly provide 'string' parameter for 'notExists'`);
  }

  containedIn(key, values) {
    return super.container("$in")(key, values);
  }

  in(key, values) {
    return super.container("$in")(key, values);
  }

  notContainedIn(key, values) {
    return super.container("$nin")(key, values);
  }

  nin(key, values) {
    return super.container("$nin")(key, values);
  }

  or(queries) {
    if (typeof queries === "object") return super.logical("$or")(queries);
    else return new Error(`Kindly provide valid parameters for 'or()'`);
  }

  and(queries) {
    if (typeof queries === "object") return super.logical("$and")(queries);
    else return new Error(`Kindly provide valid parameters for 'and()'`);
  }

  // TODO
  // Leave it as is. Needs testing
  regex(options) {
    let field;
    if (
      options.length === 3 &&
      typeof options[0] === "string" &&
      typeof options[1] === "string" &&
      typeof options[2] === "string"
    ) {
      field = super.appendKey(options[0]);
      this._query[field] = { $regex: new RegExp(options[1], options[2]) };
    } else if (
      options.length === 2 &&
      typeof options[0] === "string" &&
      options[1] instanceof RegExp
    ) {
      field = super.appendKey(options[0]);
      this._query[field] = { $regex: options[1] };
    } else {
      console.error(`Kindly provide valid parameters for regex`);
    }

    return this;
  }

  lessThan(key, value) {
    return super.compare("$lt")(key, value);
  }

  lt(key, value) {
    return super.compare("$lt")(key, value);
  }

  lessThanEqualTo(key, value) {
    return super.compare("$lte")(key, value);
  }

  lte(key, value) {
    return super.compare("$lte")(key, value);
  }

  greaterThan(key, value) {
    return super.compare("$gt")(key, value);
  }

  gt(key, value) {
    return super.compare("$gt")(key, value);
  }

  greaterThanEqualTo(key, value) {
    return super.compare("$gte")(key, value);
  }

  gte(key, value) {
    return super.compare("$gte")(key, value);
  }

  equalTo(key, value) {
    return super.compare("$eq")(key, value);
  }

  eq(key, value) {
    return super.compare("$eq")(key, value);
  }

  notEqualTo(key, value) {
    return super.compare("$ne")(key, value);
  }

  ne(key, value) {
    return super.compare("$ne")(key, value);
  }

  ascending(key) {
    return super.sort(1)(key);
  }

  asc(key) {
    return super.sort(1)(key);
  }

  descending(key) {
    return super.sort(-1)(key);
  }

  desc(key) {
    return super.sort(-1)(key);
  }

  tags(values) {
    if (Array.isArray(values)) {
      this._query.query = {
        tags: {
          $in: values
        }
      };
    } else {
      console.error(`Kindly provide valid parameters for 'tags'`);
    }
    return this;
  }

  skip(skip) {
    this._options["skip"] = skip;
    return this;
  }

  limit(limit) {
    this._options["limit"] = limit;
  }

  findOne() {
    return new Promise((resolve, reject) => {
      this._operation = "fetch";
      return Utils.promisify(this)
        .then(result => {
          return resolve(result);
        })
        .catch(error => reject(error));
    });
  }

  find() {
    return new Promise((resolve, reject) => {
      this._operation = "find";
      return Utils.promisify(this)
        .then(result => {
          return resolve(result);
        })
        .catch(error => reject(error));
    });
  }

  spread() {
    return new Promise((resolve, reject) => {
      this._spread_result = true;
      this._operation = "find";
      return Utils.promisify(this)
        .then(result => {
          return resolve(result);
        })
        .catch(error => reject(error));
    });
  }

  includeCount() {
    this._include_count = true;
    return this;
  }

  excludeReference() {
    this._include_references = false;
    return this;
  }

  count() {
    return new Promisify((resolve, reject) => {
      (this._operation = "count"), (this.count = true);
      return Utils.promisify(this)
        .then(result => {
          return resolve(result);
        })
        .catch(error => {
          return reject(error);
        });
    });
  }

  toJSON() {
    this.tojson = true;
    return this;
  }

  json() {
    this.tojson = true;
    return this;
  }
}

module.exports = Query;
