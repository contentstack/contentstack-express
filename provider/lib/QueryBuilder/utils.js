/*!
 * contentstack-express
 * copyright (c) Built.io Contentstack
 * MIT Licensed
 */

/**
 * TODO
 * query brings in all its prototypes
 */

"use strict";

/**
 * Module Dependencies.
 */

const _ = require("lodash"),
  path = require("path"),
  config = require("../config"),
  languages = config.get("languages"),
  Result = require("./result");
const db = require("../Providers");

let utility = null,
  prefix_key =
    config.get("storage.content.prefix_key") ||
    config.get("storage.prefix_key") ||
    undefined;

class Utility {
  constructor() {
    if (!utility) {
      this.languages = languages;
      utility = this;
    }
    return utility;
  }

  merge(src, dest) {
    if (src && dest) {
      let inherited_proto_keys = Object.getOwnPropertyNames(
        Object.getPrototypeOf(Object.getPrototypeOf(src))
      );
      let proto_keys = Object.getOwnPropertyNames(Object.getPrototypeOf(src));
      // merge inherited prototypical keys
      inherited_proto_keys.forEach(key => {
        dest[key] = src[key];
      });
      // merge prototypical keys
      proto_keys.forEach(key => {
        dest[key] = src[key];
      });
      // merge instance keys
      for (let e_key in src) {
        dest[e_key] = src[e_key];
      }
    }
    return dest;
  }

  softMerge(src, dest) {
    if (src && dest) {
      for (let key in src) dest[key] = src[key];
    }
    return dest;
  }

  resultWrapper(result) {
    if (result && _.isPlainObject(result) && !_.isEmpty(result)) {
      let result_key = Object.keys(result)[0];
      switch (result_key) {
        case "entries":
        case "assets":
        case "content_types":
          if (result[result_key].length > 0) {
            result[result_key].forEach((element, index) => {
              result[result_key][index] = Result(element);
            });
          } else if (typeof result[result_key] === "number") {
            // Do nothing;
          } else {
            result[result_key] = [];
          }
          break;
        case "entry":
        case "asset":
        case "content_type":
          result[result_key] = Result(result[result_key]);
          break;
        default:
          result = {};
          break;
      }
    } else {
      result = { _write_operation_: result };
    }
    return result;
  }

  spread(result) {
    let _results = [];
    try {
      if (result && Object.keys(result).length) {
        if (typeof result.entries !== "undefined") _results.push(result.entries);
        if (typeof result.assets !== "undefined") _results.push(result.assets);
        if (
          typeof result.content_type !== "undefined" ||
          typeof result.schema !== "undefined"
        )
          _results.push(result.content_type || result.schema);
        if (typeof result.count !== "undefined") _results.push(result.count);
        if (typeof result.entry !== "undefined") _results = result.entry;
        if (typeof result.asset !== "undefined") _results = result.asset;
      }
    } catch (error) {
      console.error(error);
    }
    return _results;
  }

  getPath(entity, code) {
    let idx = _.findIndex(this.languages, { code: code });
    if (~idx) {
      return entity === "_assets"
        ? this.languages[idx]["assetsPath"]
        : this.languages[idx]["contentPath"];
    }
    console.error(`Path for ${entity} in ${code} does not exist!`);
  }

  promisify(query) {
    return new Promise((resolve, reject) => {
      let result,
        options,
        is_single,
        is_json,
        spread_result,
        operation,
        _query = _.cloneDeep(query),
        default_sort = {},
        self = this;

      (operation = _query._operation),
        (is_json = typeof _query.tojson === "boolean" ? _query.tojson : false),
        (is_single = typeof _query._uid === "string" ? true : false),
        (spread_result =
          typeof _query._spread_result === "boolean"
            ? _query._spread_result
            : false);

      function formatResult(formatRequired, result) {
        try {
          query._include_references = query._include_count = query._query = null;
          query._count_only = query.tojson = query._content_type_uid = null;
          query._operation = query._uid = query._locale = query.object = query._options = null;
          if (formatRequired) {
            if (!is_json) result = self.resultWrapper(result);
            if (spread_result) result = self.spread(result);
          }
          return resolve(result);
        } catch (error) {
          return reject(error);
        }
      }
      // TODO: find something better here
      _query._locale = _query._locale || "en-us";
      switch (operation) {
        case "upsert":
        case "remove":
        case "insert":
          // Rebuild query
          _query = _.merge({}, _query.object, {
            _uid: _query._uid || _query.query.uid,
            _content_type_uid: _query._content_type_uid,
            _locale: _query._locale
          });
          return db[operation](_query)
            .then(result => {
              return formatResult(false, result);
            })
            .catch(error => reject(error));
          break;
        case "fetch":
        case "count":
        case "find":
          if (is_single) {
            return db["findOne"](_query)
              .then(result => {
                return formatResult(true, result);
              })
              .catch(error => reject(error));
          } else if (_query._count_only) {
            return db["count"](_query)
              .then(result => {
                return formatResult(true, result);
              })
              .catch(error => reject(error));
          } else {
            options = _query.options || {};
            return db["find"](_query, options)
              .then(result => {
                return formatResult(true, result);
              })
              .catch(error => reject(error));
          }
          break;
        default:
          return reject(new Error("Querying DB failed!"));
      }
    });
  }
}

module.exports = new Utility();
