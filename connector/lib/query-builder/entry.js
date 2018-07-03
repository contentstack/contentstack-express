"use strict";

/**
 * Module Dependencies.
 */
const _ = require("lodash"),
  Promise = require("bluebird"),
  Query = require("./query"),
  Utils = require("./utils");
const config = require('../config');
const log = config.logger.provider;

// Entry extends the properties of Query
class Entry extends Query {
  constructor(uid) {
    super();
    if (typeof uid === "string") {
      this._query.query = this._query.query || {};
      this._query.query["uid"] = uid;
    }
    this.object = {};
    return this;
  }

  insert(data) {
    return new Promise((resolve, reject) => {
      this._operation = "insert";
      if (
        typeof this._content_type_uid === "string" &&
        typeof this._locale === "string" &&
        typeof this._uid === "string" &&
        typeof data === "object"
      ) {
        this.object["_data"] = data;
        return Utils.promisify(this)
          .then(result => resolve(result))
          .catch(error => reject(error));
      } else {
        log.silly({info: `Invalid insert query.`, msg: `Kindly provide 'uid', 'content_type' and 'locale' to insert the data.`});
        return reject(
          new Error(`Kindly provide '_uid', _content_type' to insert the data.`)
        );
      }
    });
  }

  update(data) {
    return new Promise((resolve, reject) => {
      this._operation = "upsert";
      if (
        typeof this._content_type_uid === "string" &&
        typeof this._locale === "string" &&
        typeof this._uid === "string" &&
        typeof data === "object"
      ) {
        this.object["_data"] = data;
        return Utils.promisify(this)
          .then(result => resolve(result))
          .catch(error => reject(error));
      } else {
        log.silly({info: `Invalid update query.`, msg: `Kindly provide 'uid', 'content_type' and 'locale' to update the data.`});
        return reject(
          new Error(`Kindly provide 'content_type_id' and 'locale' to update the data.`)
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
        log.silly({info: `Invalid count query.`, msg: `Kindly provide 'content_type' and 'locale' to get count of the data.`});
        return reject(
          new Error(`Kindly provide 'content_type_id' and 'locale'.`)
        );
      }
    });
  }

  upsert(data) {
    return new Promise((resolve, reject) => {
      this._operation = "upsert";
      if (
        typeof this._content_type_uid === "string" &&
        typeof this._locale === "string" &&
        typeof this._uid === "string" &&
        typeof data === "object"
      ) {
        this.object["_data"] = data;
        return Utils.promisify(this)
          .then(result => resolve(result))
          .catch(error => reject(error));
      } else {
        log.silly({info: `Invalid upsert query.`, msg: `Kindly provide 'uid', 'content_type' and 'locale' to upsert the data.`});
        return reject(
          new Error(`Kindly provide 'uid', 'content_type' and 'locale' to update the data.`)
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
        typeof this._uid === "string" &&
        typeof data === "object"
      ) {
        return Utils.promisify(this)
          .then(result => resolve(result))
          .catch(error => reject(error));
      } else {
        return reject(
          new Error(
            `Kindly provide 'content_type id' && 'entity uid' to remove.`
          )
        );
      }
    });
  }
}

module.exports = Entry;
