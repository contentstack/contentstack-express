"use strict";

class Commons {
  constructor() {}

  compare(operator) {
    return (field, value) => {
      if (typeof value !== "undefined" && typeof field === "string") {
        this._query.query = this._query.query || {};
        this._query.query[field] = this._query.query[field] || {};
        if (operator) {
          this._query.query[field][operator] = value;
        } else {
          this._query.query[field] = value;
        }
      } else {
        console.error(`Kindly provide valid parameters for ${operator}`);
      }
      return this;
    };
  }

  logical(operator) {
    return values => {
      this._query.query = this._query.query || {};
      this._query.query[operator] = values;
      return this;
    };
  }

  containers(operator) {
    return (field, values) => {
      if (typeof field === "string" && values instanceof Array) {
        this._query.query = this._query.query || {};
        this._query.query[field] = this._query.query[field] || {};
        this._query.query[field][operator] = values;
      } else {
        console.error(`Kindly provide valid parameters for ${operator}`);
      }
      return this;
    };
  }

  sort(operator) {
    // Setting default as updated_at, if no parameter is provided
    return (field = "published_at") => {
      this.options["sort"] = {};
      this.options["sort"][field] = operator;
      return this;
    };
  }

  exists(operator) {
    return field => {
      if (field && typeof field === "string") {
        this._query.query = this._query.query || {};
        this._query.query[field] = {};
        this._query.query[field]["$exists"] = operator;
      } else {
        console.error(`Kindly provide valid parameters for $exists`);
      }
      return this;
    };
  }
}

module.exports = Commons;
