"use strict";

const Query = require("./query");
const Entry = require("./entry"),
  Asset = require("./asset"),
  Utils = require("./utils"),
  _ = require("lodash");

class QueryBuilder {
  /**
   * QueryBuilder class's constructor method
   * @return {[type]} [description]
   */
  constructor() {
    return this;
  }

  /**
   * QueryBuilder class's prototypical method
   * @param {String} uid  : Uid of the content type being queried
   * @return {Object}     : Current class object
   */
  ContentType(uid) {
    if (typeof uid === "string" && uid) this._content_type_uid = uid;
    return this;
  }

  content_type(uid) {
    if (typeof uid === "string" && uid) this._content_type_uid = uid;
    return this;
  }

  Assets(uid) {
    if (typeof uid === "string" || _.isArray(uid)) this._uid = uid;
    return Utils.merge(new Entry(uid), this);
  }

  Entry(uid) {
    if (typeof uid === "string" || _.isArray(uid)) this._uid = uid;
    return Utils.merge(new Entry(uid), this);
  }

  Query() {
    return Utils.merge(new Query(), this);
  }

  entity(id) {
    if (typeof id === "string" && id) this._content_type_uid = id;
    return this;
  }

  language(locale) {
    // console.log('@this', this);
    if (typeof locale === "string" && locale) this._locale = locale;
    return this;
  }

  uid(uid) {
    if (_.has(this, "_content_type_uid")) {
      if (this._content_type_uid === "_assets") return this.Assets(uid);
      return this.Entry(uid);
    } else {
      throw new Error(
        `Call .uid() after '.entity()' OR '.content_type()' has been called.`
      );
    }
  }
}

module.exports = new QueryBuilder();
