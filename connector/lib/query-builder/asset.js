"use strict";

const _ = require("lodash"),
  Query = require("./query"),
  Utils = require("./utils");
const config = require('../config');
const log = config.logger.provider;
class Asset extends Query {
  constructor(uid) {
    super();
    if (typeof uid === "string") {
      this._query.query = this._query.query || {};
      this._query.query["uid"] = uid;
    }
    return this;
  }

  insert(data) {
    return new Promise((resolve, reject) => {
      this._operation = "insert";
      if (
        this.content_type_uid === "_assets" &&
        typeof this._uid === "string" &&
        typeof this._locale === "string" &&
        typeof data === "object"
      ) {
        this.object = {};
        this.object["_data"] = data;
        return Utils.promisify(this)
          .then(result => {
            return resolve(result);
          })
          .catch(error => {
            return reject(error);
          });
      } else {
        log.silly({info: `Invalid query`, msg: `Kindly provide 'content_type_id', 'uid' and 'locale'.`});
        return reject(
          new Error(`Kindly provide 'content_type_id' 'uid' and 'locale'.`)
        );
      }
    });
  }

  update(data) {
    return new Promise((resolve, reject) => {
      this._operation = "upsert";
      if (
        this.content_type_uid === "_assets" &&
        typeof this._uid === "string" &&
        typeof this._locale === "string" &&
        typeof data === "object"
      ) {
        this.object = {};
        this.object["_data"] = data;
        return Utils.promisify(this)
          .then(result => {
            return resolve(result);
          })
          .catch(error => {
            return reject(error);
          });
      } else {
        log.silly({info: `Invalid query`, msg: `Kindly provide 'content_type_id', 'uid' and 'locale'.`});
        return reject(
          new Error(`Kindly provide 'content_type_id' 'uid' and 'locale'.`)
        );
      }
    });
  }

  count() {
    return new Promise((resolve, reject) => {
      this._operation = "count";
      this._count_only = true;
      if (
        typeof this._content_type_uid === "string" &&
        typeof this._locale === "string"
      ) {
        return Utils.promisify(this)
          .then(result => resolve(result))
          .catch(error => reject(error));
      } else {
        log.silly({info: `Invalid query`, msg: `Kindly provide 'content_type_id' and 'locale'.`});
        return reject(
          new Error(`Kindly provide 'content_type_id' 'uid' and 'locale'.`)
        );
      }
    });
  }

  remove() {
    return new Promise((resolve, reject) => {
      this._operation = "remove";
      if (
        typeof this._content_type_uid === "string" &&
        typeof this._locale === "string" &&
        typeof this._query.query.uid === "string"
      ) {
        return Utils.promisify(this)
          .then(result => resolve(result))
          .catch(error => reject(error));
      } else {
        log.silly({info: `Invalid query`, msg: `Kindly provide 'content_type_id' 'uid' and 'locale'.`});
        return reject(
          new Error(`Kindly provide 'content_type_id', 'uid' and 'locale'.`)
        );
      }
    });
  }
}

module.exports = Asset;
