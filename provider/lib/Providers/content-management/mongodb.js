/*!
 * contentstack-express
 * copyright (c) Built.io Contentstack
 * MIT Licensed
 */

"use strict";

/**
 * Module which handles the Connection to the MongoDB database, creation of
 * Indexes on collections, creates and serves singleton MongoDB connection object
 */

const mongodb = require("mongodb"),
  _ = require("lodash"),
  Promise = require("bluebird"),
  MongoClient = mongodb.MongoClient,
  config = require("../../config"),
  log = config.logger.provider,
  dbConfig = config.storage,
  collections = ["_content_types", "_entries", "_assets", "_routes"],
  indexes = { _content_type_uid: 1, _uid: 1 };
const Utils = require("../Utils");
/**
 * Module Dependencies.
 */

const del_keys = [
    "created_by",
    "updated_by",
    "_uid",
    "_data",
    "include_references",
    "_remove"
  ],
  // Common keys
  cacheRoutes = "_routes",
  entryRoutes = "_entries",
  _schema = "_content_types",
  // Not used
  ct = "_content_type_uid",
  locale = "locale",
  uid = "uid",
  data = "_data";

let mongodb_instance = null;

/**
 * Mongodb provider, that manages entries and content-types
 * @return mongodb-provider instance
 */
class MongodbContentManagement {
  constructor() {
    if (!mongodb_instance) {
      // Set up connection
      this.connect()
        .then(() => {
          mongodb_instance = this;
          return mongodb_instance;
        })
        .catch(connectionError => {
          log.error(connectionError);
          return null;
        });
    } else {
      return mongodb_instance;
    }
  }

  /**
   * Function which handles the connection to mongodb
   * @return {Object}  : DB object
   */
  connect(force) {
    return new Promise((resolve, reject) => {
      // Checks for the prior DB connection
      // Allow forced - new connection
      if (this.db === null || (typeof force === "boolean" && force)) {
        try {
          let connectionUri = this[buildUri]();
          let options = _.isPlainObject(dbConfig.options)
            ? dbConfig.options
            : {};
          // Del basedir option
          if (options && options.basedir) delete options.basedir;
          // Connect to Mongodb
          MongoClient.connect(connectionUri, options, (error, db) => {
            if (error) return reject(error);
            // Create required collections and set indexes
            return Promise.map(
              collections,
              collection => {
                return new Promise((_resolve, _reject) => {
                  return db.collection(collection).createIndex(indexes, error => {
                    if (error) return _reject(error);
                    return _resolve();
                  });
                });
              },
              { concurrency: 1 }
            )
              .then(() => {
                // all collections were created
                // export db
                this.db = db;
                return resolve();
              })
              .catch(error => {
                return reject(error);
              });
          });
        } catch (error) {
          return reject(error);
        }
      } else {
        // Return the old instance
        return resolve(db_instance);
      }
    });
  }

  /**
   * Function which is used to find `document` based on the given query
   *
   * @param {Object} query        - Holds the query to find the data
   * @return {object} result      - Result object for the query
   */
  findOne(query) {
    return new Promise((resolve, reject) => {
      try {
        let content_type,
          language,
          uid,
          entity_key,
          include_references,
          collection_key,
          _query = {},
          result_obj = {};
        // TODO: allow custom projections
        let projection = {
          _id: 0,
          _locale: 0,
          _content_type_uid: 0
        };
        (content_type = query._content_type_uid),
          (language = query._locale),
          (include_references =
            typeof query._include_references === "boolean"
              ? query._include_references
              : true),
          (query.uid = query._uid);
        delete query._uid;

        query = Utils.filterQuery(query, this.del_keys);
        // Omit unwanted keys
        query = _.omit(query, this.omit_keys);

        entity_key =
          content_type === "_content_types"
            ? "content_type"
            : content_type === "_routes" ? "route" : "entry";
        collection_key =
          content_type === "_content_types"
            ? "content_types"
            : content_type === "_routes" ? "routes" : "entries";

        if (
          query.hasOwnProperty("_query") &&
          query._query.hasOwnProperty("query")
        ) {
          _query = query._query.query;
          _query._locale = query._locale;
          _query._content_type_uid = query._content_type_uid;
        } else {
          _query = query;
        }

        return this.db
          .collection(entity_key)
          .findOne(_query, projection, (error, data) => {
            try {
              if (error) return reject(error);
              if (data) {
                result_obj[entity_key] = data;
                // Checks if there is any References need to be included in the given Content stack entry
                if (include_references) {
                  return Utils.includeReferences(
                    result_obj,
                    language,
                    undefined,
                    undefined,
                    this
                  )
                    .then(result => {
                      return resolve(result);
                    })
                    .catch(error => {
                      log.error(error);
                      return resolve(result_obj);
                    });
                } else {
                  return resolve(result_obj);
                }
              } else {
                result_obj[entity_key] = {};
                return resolve(result_obj);
              }
            } catch (error) {
              return reject(error);
            }
          });
      } catch (error) {
        return callback(error);
      }
    });
  }

  /**
   * Function which is used to find the necessary data based on the given information from MongoDB
   *
   * @param {Object} query        - Object which contains data to be queried with
   * @param {Object} options      - Object which containts options for find operation
   * @return {Function} promise   - A promise function with either queries objects or an error
   */
  find(query, options) {
    return new Promise((resolve, reject) => {
      try {
        let content_type,
          language,
          include_references,
          entity_key,
          collection_key,
          parent_id,
          count_only,
          include_count,
          _remove_prefix;

        let _query = {},
          result_obj = {},
          references = {},
          projection = {
            _id: 0,
            _locale: 0,
            _content_type_uid: 0
          };
        // Assign values
        (content_type = query._content_type_uid),
          (language = query._locale),
          (include_references =
            typeof query._include_references === "boolean"
              ? query._include_references
              : true),
          (_remove_prefix =
            typeof query._remove_prefix === "boolean"
              ? query._remove_prefix
              : false),
          (count_only =
            typeof query._count_only === "boolean" ? query._count_only : false),
          (include_count =
            typeof query._include_count === "boolean"
              ? query._include_count
              : false),
          (references = options.references || {});
        parent_id = options.parent_id || [];
        // Need clarification on its definition
        // lookup = (_.has(query, 'lookup')) ? true: false;
        (query = Utils.filterQuery(query, this.del_keys)),
          (entity_key =
            content_type === "_content_types"
              ? "content_type"
              : content_type === "_routes" ? "route" : "entry"),
          (collection_key =
            content_type === "_content_types"
              ? "content_types"
              : content_type === "_routes" ? "routes" : "entries");

        if (
          query.hasOwnProperty("_query") &&
          query._query.hasOwnProperty("query")
        ) {
          _query = query._query.query;
          _query._locale = query._locale;
          _query._content_type_uid = query._content_type_uid;
        } else {
          _query = query;
        }

        this.db
          .collection(entity_key)
          .find(_query, projection)
          .sort(options.sort || { published_at: -1 })
          .limit(options.limit || 0)
          .skip(options.skip || 0)
          .toArray((error, objects) => {
            try {
              if (error) return reject(error);
              if (objects && objects.length) {
                // If the call's for count, return count only!
                if (count_only)
                  return resolve({
                    result_obj: { [entity_key]: objects.length }
                  });

                // Handle object prefixes
                if (_remove_prefix) result_obj = objects;
                else result_obj[entity_key] = objects;

                // Checks whether references need to be inlcuded in the content stack entry
                if (
                  include_references &&
                  entity_key === "entries" &&
                  content_type !== "_routes"
                ) {
                  if (parent_id) {
                    references[parent_id] = references[parent_id] || [];
                    references[parent_id] = _.uniq(
                      references[parent_id].concat(_.map(result_obj, "uid"))
                    );
                  }
                  return Utils.includeReferences(
                    result_obj,
                    language,
                    references,
                    parent_id,
                    this
                  )
                    .then(_result => {
                      if (include_count)
                        _result.count = _result[entity_key].length;
                      return resolve(_result);
                    })
                    .catch(error => {
                      log.warn(error);
                      return reject(error);
                    });
                } else {
                  return resolve(result_obj);
                }
              } else {
                result_obj[entity_key] = [];
                return resolve(result_obj);
              }
            } catch (error) {
              return reject(error);
            }
          });
      } catch (error) {
        return reject(error);
      }
    });
  }

  /**
   * Function which handles the insertion of the data into mongodb
   *
   * @param {Object} data         - data which need to be upserted into the database
   * @return {Function} promise   - A promise function with either queries objects or an error
   */
  insert(data) {
    return new Promise((resolve, reject) => {
      try {
        let language,
          content_type,
          entity_key,
          uid,
          collection_key,
          result_obj = {};

        (language = data._locale),
          (content_type = data._content_type_uid),
          (entity_key =
            content_type === "_content_types"
              ? "content_type"
              : content_type === "_routes" ? "route" : "entry"),
          (collection_key =
            content_type === "_content_types"
              ? "content_types"
              : content_type === "_routes" ? "routes" : "entries"),
          (uid = data._uid);

        if (content_type === _schema) {
          // Filters schema, keeps only required keys, deletes the rest
          Utils.filterSchema(data._data);
          // Finds references in the schema, and indexes them
          // Useful while running 'lookup' on query
          Utils.indexReferences(data._data);
        }

        data = Utils.filterData(data, entity_key);

        data = this[_flatten](data);

        // Omit unwanted keys
        _data = _.omit(_data, del_keys);

        // updating the references based on the new schema
        if (content_type === _schema) {
          // Filters schema, keeps only required keys, deletes the rest
          Utils.filterSchema(data._data);
          // Finds references in the schema, and indexes them
          // Useful while running 'lookup' on query
          Utils.indexReferences(data._data);
        }

        return this.db
          .collection(collection_key)
          .insertOne(_data, (error, result) => {
            if (error) return reject({ status: -1, error: error });
            if (entity_key === _schema)
              return resolve({
                status: 1,
                msg: `Content type '${uid}' in ${language} language was created successfully.`
              });
            else
              return resolve({
                status: 1,
                msg: `Entry '${uid}' was inserted into content type '${content_type}' of ${language} language successfully.`
              });
          });
      } catch (error) {
        return reject({ status: -1, error: error });
      }
    });
  }

  /**
   * Function which handles the insertion of data or updation if data already exists, into mongodb
   *
   * @param {Object} data         - data which need to be upserted into the database
   * @return {Function} promise   - A promise function with either queries objects or an error
   */
  upsert(data) {
    return new Promise((resolve, reject) => {
      try {
        let language,
          content_type,
          entity_key,
          uid,
          result_obj = {};

        (language = data._locale),
          (content_type = data._content_type_uid),
          (entity_key =
            content_type === "_content_types"
              ? "content_types"
              : content_type === "_routes" ? "routes" : "entries"),
          (uid = data._uid);

        if (content_type === _schema) {
          // Filters schema, keeps only required keys, deletes the rest
          Utils.filterSchema(data._data);
          // Finds references in the schema, and indexes them
          // Useful while running 'lookup' on query
          Utils.indexReferences(data._data);
        }

        data = Utils.filterData(data, entity_key);

        data = this[_flatten](data);

        // Omit unwanted keys
        _data = _.omit(_data, del_keys);

        // updating the references based on the new schema
        if (content_type === _schema) {
          // Filters schema, keeps only required keys, deletes the rest
          Utils.filterSchema(data._data);
          // Finds references in the schema, and indexes them
          // Useful while running 'lookup' on query
          Utils.indexReferences(data._data);
        }

        return this.db
          .collection(entity_key)
          .updateOne(
            { _uid: _data._uid, _locale: _data._locale },
            { $set: _data },
            (error, result) => {
              if (error) return reject({ status: -1, error: error });
              if (entity_key === _schema)
                return resolve({
                  status: 1,
                  msg: `Content type '${uid}' in ${language} language has been updated successfully.`
                });
              else
                return resolve({
                  status: 1,
                  msg: `Entry '${uid}' in content type '${content_type}' of ${language} language has been updated successfully.`
                });
            }
          );
      } catch (error) {
        return reject({ status: -1, error: error });
      }
    });
  }

  /**
   * Function which handles the count for the given query in given content type
   *
   * @param {Object} query        - Object which contains data to be queried in the database
   * @return {Function} promise   - A promise function with either queries objects or an error
   */
  count(query) {
    return new Promise((resolve, reject) => {
      try {
        let content_type,
          entity_key,
          result_obj = {};

        entity_key =
          content_type === "_content_types"
            ? "content_types"
            : content_type === "_routes" ? "routes" : "entries";

        query = query.hasOwnProperty("_data") ? this[_flatten](query) : query;

        return this.db.collection(entity_key).count(query, (error, result) => {
          if (error) return reject(error);
          result_obj[entity_key] = result;
          return resolve(result_obj);
        });
      } catch (error) {
        return reject(error);
      }
    });
  }

  /**
   * Function which removes an entry from the Mongodb based on the given query
   *
   * @param {Object} query        - Object which is used to select the document that needs to be removed
   * @return {Function} promise   - A promise function with either queries objects or an error
   */
  remove(query) {
    return new Promisify((resolve, reject) => {
      try {
        let language,
          content_type,
          uid,
          entity_key,
          result_obj = {};
        (language = query._locale),
          (content_type = query._content_type_uid),
          (entity_key =
            content_type === "_content_types"
              ? "content_types"
              : content_type === "_routes" ? "routes" : "entries");
        uid = query._uid;

        query = query.hasOwnProperty("_data") ? this[_flatten](query) : query;

        return this.db.collection(entity_key).remove(query, (error, result) => {
          if (error) return reject(error);
          if (content_type === _schema) {
            return this[_remove_content_type](uid, language, "")
              .then(msg => {
                return resolve({
                  status: 1,
                  msg:
                    msg +
                    `\nContent type ${uid} in ${language} was removed successfully.`
                });
              })
              .catch(error => {
                return reject(error);
              });
          } else {
            return resolve({
              status: 1,
              msg: `Entry ${uid} of ${content_type} in ${language} was removed successfully.`
            });
          }
        });
      } catch (error) {
        return reject(error);
      }
    });
  }

  [_remove_content_type](uid, language, msg) {
    return new Promise((resolve, reject) => {
      return this.db.collection("entry").remove(
        {
          _content_type_uid: uid,
          _locale: language
        },
        (error, result) => {
          if (error) return reject(error);
          msg += `Entries of ${uid} were removed successfully.`;
          return this.db.collection("_routes").remove(
            {
              _content_type_uid: "_routes",
              _locale: language,
              content_type: {
                uid: uid
              }
            },
            (error, result) => {
              if (error) return reject(error);
              msg += `\nRoutes of ${uid} in ${language} language were removed successfully.`;
              return resolve(msg);
            }
          );
        }
      );
    });
  }

  [_flatten](data) {
    if (data._uid) data._data._uid = data._uid;
    if (data._locale) data._data._locale = data._locale;
    if (data._content_type_uid)
      data._data._content_type_uid = data._content_type_uid;

    return _.cloneDeep(data._data);
  }

  [_buildURI]() {
    let uri = "mongodb://";
    // If DB requires authentication
    if (dbConfig.username && dbConfig.password)
      uri += util.format("%s:%s@", dbConfig.username, dbConfig.password);
    // If DB has replica sets
    if (_.isArray(dbConfig.servers)) {
      const serversUri = dbConfig.servers
        .map(server => {
          return util.format("%s:%d", server.host, server.port);
        })
        .join(",");
      uri += serversUri;
    } else if (
      typeof dbConfig.server === "object" &&
      dbConfig.server.hasOwnProperty("host") &&
      dbConfig.server.hasOwnProperty("port")
    ) {
      // Single DB instance
      uri += util.format("%s:%d", dbConfig.server.host, dbConfig.server.port);
    } else {
      throw new Error(`Error in mongodb configuration settings.`);
    }
    // If user provides DB name
    if (dbConfig.dbName) {
      uri = util.format("%s/%s", uri, dbConfig.dbName);
    } else {
      // Create DB name based on api_key & environment
      const dbName = util.format(
        "%s_%s",
        config.contentstack.api_key,
        config.environment
      );
      uri = util.format("%s/%s", uri, dbName);
    }
    return uri;
  }
}

// Exports the mongodbStorage instance
module.exports = new MongodbContentManagement();
