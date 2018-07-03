"use strict";

/**
 * TODO
 * 1. make provision for pre-defined keys : Done
 * 2. Add lookup support : Pending
 * 3. Add logger : Pending
 * 4. Add provision for remove prefixes via Environment|cmd line : Pending
 * 5. Test performance : Pending
 * 6. Add Environment|cmd line option for loading provider : Pending
 * 7. Remove _content_type_uid, change it to entity_type : Pending
 * 8. Separate query from data in insert|upsert : Pending
 */

const Promisify = require("bluebird"),
  // avoiding graceful-fs as its current support is from 0.8 - 7.0
  fs = Promisify.promisifyAll(require("fs"), { suffix: "Promisified" }),
  _ = require("lodash"),
  sift = require("sift"),
  path = require("path"),
  config = require("../../config"),
  Utils = require("../../Utils");

const _schema = "_content_types",
  del_keys = [
    "_remove_prefix",
    "_count_only",
    "_include_count",
    "_include_references",
    "_operation",
    "_locale"
  ];

let fs_instance = null;
let log = null;

const _remove_content_type = Symbol("_remove_content_type");

class FileContentManagement {
  constructor() {
    if (!fs_instance) {
        (this.omit_keys = ["_locale", "_content_type_uid", "_uid"]),
        (this.del_keys = config.get("storage.del_keys")
          ? del_keys.concat(config.get("storage.del_keys"))
          : del_keys);
      this.asset_mgmt = require('../asset-management');
      log = config.logger.provider;
      fs_instance = this;
    }
    return fs_instance;
  }

  /**
   * Mandatory Keys: _uid, _content_type_uid, locale
   * Optional Keys:
   */
  findOne(query) {
    return new Promisify((resolve, reject) => {
      try {
        let content_type,
          language,
          pth,
          uid,
          entity_key,
          include_references,
          result_obj = {};

        (content_type = query._content_type_uid),
          (language = query._locale),
          (include_references =
            typeof query._include_references === "boolean"
              ? query._include_references
              : true),
          (query.uid = query._uid);
        delete query._uid;

        query = Utils.filterQuery(query, this.del_keys);
        query = _.omit(query, this.omit_keys);
        // Here other refers to 'entry' OR 'content type'
        entity_key =
          content_type === "_content_types" ? "content_type" : "entry";
        pth = path.join(Utils.getContentPath(language), content_type + ".json");

        if (fs.existsSync(pth)) {
          try {
            return fs
              .readFilePromisified(pth)
              .then(result => {
                result = JSON.parse(result);
                // TODO: lookup support
                result = _.map(result, "_data"); // Default is _data for express
                if (!_.isEmpty(result)) {
                  // Keeping it double.. since it'd be good to avoid clashing it with client's '_query' key
                  if (
                    query.hasOwnProperty("_query") &&
                    query._query.hasOwnProperty("query")
                  )
                    result = sift(query._query.query, result);
                  else result = sift(query, result);

                  result_obj[entity_key] = result[0] || {};
                  if (include_references && entity_key === "entry") {
                    return Utils.includeReferences(
                      result_obj,
                      language,
                      undefined,
                      undefined,
                      this
                    )
                      .then(_result => {
                        return resolve(_result);
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
              })
              .catch(error => {
                log.error(error);
                return reject(error);
              });
          } catch (error) {
            log.error(error);
            return reject(error);
          }
        } else {
          log.warn(error);
          return reject(new Error(`${content_type} file does not exists`));
        }
      } catch (error) {
        log.error(error);
        return reject(error);
      }
    });
  }

  /**
   * Mandatory Keys: _content_type_uid, locale
   * Optional Keys: options.sort (default: published_at /descending), _remove_prefix (default: false), _count (default: false)
   */
  find(query, options) {
    return new Promisify((resolve, reject) => {
      try {
        let content_type;
        let language;
        let pth;
        let include_references;
        let entity_key;
        let parent_id;
        let count_only;
        let include_count;
        let _remove_prefix;
        let sort_key;
        let sort_operator;

        let result_obj = {};
        let references = {};
        let default_sort = {};

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
          (sort_key = options.sort
            ? Object.keys(options.sort)[0]
            : "published_at"),
          (sort_operator = options.sort ? options.sort : -1),
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
          (query = _.omit(query, this.omit_keys)),
          (entity_key =
            content_type === "_content_types" ? "content_types" : "entries");

        pth = path.join(Utils.getContentPath(language), content_type + ".json");

        fs
          .statPromisified(pth)
          .then(stats => {
            try {
              if (stats.isFile()) {
                return fs
                  .readFilePromisified(pth)
                  .then(result => {
                    // utf-8 to json
                    result = JSON.parse(result);
                    result = _.map(result, "_data");
                    if (
                      query.hasOwnProperty("_query") &&
                      query._query.hasOwnProperty("query")
                    ) {
                      // TODO: Add lookup support
                      result = sift(query._query.query, result);
                    } else {
                      result = sift(query, result);
                    }
                    // In case its a call for getting 'count_only', do not process further
                    if (count_only) {
                      result_obj[entity_key] = result.length;
                      return resolve(result_obj);
                    }

                    if (!_.isEmpty(result)) {
                      // Sorting
                      result = Utils.sort(result, sort_key, sort_operator);

                      if (options.limit) {
                        options.skip = options.skip || 0;
                        result = result.splice(options.skip, options.limit);
                      } else if (options.skip > 0) {
                        result = result.slice(options.skip);
                      }

                      if (_remove_prefix) result_obj = result;
                      else result_obj[entity_key] = result;
                      if (
                        include_references &&
                        entity_key === "entries" &&
                        content_type !== "_routes"
                      ) {
                        if (parent_id) {
                          references[parent_id] = references[parent_id] || [];
                          references[parent_id] = _.uniq(
                            references[parent_id].concat(
                              _.map(result_obj, "uid")
                            )
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
                        if (include_count)
                          result_obj.count = result_obj[entity_key].length;
                        return resolve(result_obj);
                      }
                    } else {
                      result_obj[entity_key] = result;
                      return resolve(result_obj);
                    }
                  })
                  .catch(error => {
                    log.error(error);
                    return reject(error);
                  });
              } else {
                throw new Error(`${content_type} file was not found!`);
              }
            } catch (error) {
              return reject(error);
            }
          })
          .catch(error => {
            log.warn(error);
            if (_remove_prefix) {
              result_obj[entity_key] = [];
              return resolve([]);
            } else {
              return reject(error);
            }
          });
      } catch (error) {
        log.error(error);
        return reject(error);
      }
    });
  }

  /**
   * Mandatory Keys: _content_type_uid, locale (defaults to true)
   */
  count(query) {
    return new Promisify((resolve, reject) => {
      try {
        let content_type,
          entity_key,
          result_obj = {};

        (entity_key =
          query._content_type_uid === "_content_types"
            ? "content_types"
            : "entries"),
          (query._count_only = true);

        return this.find(query, {})
          .then(result => {
            result_obj[entity_key] = result[entity_key].length;
            return resolve(result_obj);
          })
          .catch(error => {
            log.error(error);
            // log: Critical
            return reject(error);
          });
      } catch (error) {
        log.error(error);
        return reject(error);
      }
    });
  }

  /**
   * Mandatory Keys: _content_type_uid, locale, _uid (String || Array), data (modify according to format)
   */
  insert(data) {
    return new Promisify((resolve, reject) => {
      try {
        let language;
        let content_type;
        let pth;
        let uid;

        let result_obj = {};

        (language = data._locale),
          (content_type = data._content_type_uid),
          (uid = data._uid);

        if (content_type === _schema) {
          // Filters schema, keeps only required keys, deletes the rest
          Utils.filterSchema(data._data);
          // Finds references in the schema, and indexes them
          // Useful while running 'lookup' on query
          Utils.indexReferences(data._data);
        }

        data = Utils.filterData(
          data,
          content_type === "_content_types" ? "content_type" : "entry"
        );
        pth = path.join(Utils.getContentPath(language), content_type + ".json");

        if (fs.existsSync(pth)) {
          return fs
            .readFilePromisified(pth)
            .then(_data => {
              _data = JSON.parse(_data);
              let pos = _.findIndex(_data, { _uid: data._uid });
              if (~pos) {
                if (content_type === _schema)
                  return resolve({
                    status: 0,
                    msg: `Content type ${uid} exists already in ${language} language. Use upsert instead.`
                  });
                else
                  return resolve({
                    status: 0,
                    msg: `Entry ${uid} in content type ${content_type} exists already in ${language} language. Use upsert instead.`
                  });
              }
              _data.push(data);
              return fs
                .writeFilePromisified(pth, JSON.stringify(_data))
                .then(() => {
                  if (content_type === _schema)
                    return resolve({
                      status: 1,
                      msg: `Content type '${uid}' in ${language} language was created successfully.`
                    });
                  else
                    return resolve({
                      status: 1,
                      msg: `Entry '${uid}' was inserted into content type '${content_type}' of ${language} language successfully.`
                    });
                })
                .catch(error => {
                  log.error(error);
                  return reject(error);
                });
            })
            .catch(error => {
              log.error(error);
              return reject(error);
            });
        } else {
          return fs
            .writeFilePromisified(pth, JSON.stringify([data]))
            .then(() => {
              if (content_type === _schema)
                return resolve({
                  status: 1,
                  msg: `Content type '${uid}' in ${language} language was created successfully.`
                });
              else
                return resolve({
                  status: 1,
                  msg: `Entry '${uid}' was inserted into content type '${content_type}' of ${language} language successfully.`
                });
            })
            .catch(error => {
              log.error(error);
              return reject(error);
            });
        }
      } catch (error) {
        log.error(error);
        return reject(error);
      }
    });
  }

  /**
   * Mandatory Keys: _content_type_uid, locale, _uid (String || Array), data (modify according to format)
   */
  upsert(data) {
    return new Promisify((resolve, reject) => {
      try {
        let language,
          content_type,
          uid,
          entity_key,
          pth,
          result_obj = {};

        (language = data._locale), (content_type = data._content_type_uid);
        uid = data._uid;

        if (content_type === _schema) {
          // Filters schema, keeps only required keys, deletes the rest
          Utils.filterSchema(data._data);
          // Finds references in the schema, and indexes them
          // Useful while running 'lookup' on query
          Utils.indexReferences(data._data);
        }

        data = Utils.filterData(
          data,
          content_type === "_content_types" ? "content_type" : "entry"
        );
        entity_key =
          content_type === "_content_types" ? "content_type" : "entry";
        pth = path.join(Utils.getContentPath(language), content_type + ".json");

        if (fs.existsSync(pth)) {
          return fs
            .readFilePromisified(pth)
            .then(_data => {
              _data = JSON.parse(_data);
              let pos = _.findIndex(_data, { _uid: data._uid });
              if (~pos) {
                if (_.isEqual(_data[pos]._data, data._data)) {
                  if (content_type === _schema)
                    return resolve({
                      status: 0,
                      msg: `Content type '${uid}' in ${language} language already exists.`
                    });
                  else
                    return resolve({
                      status: 0,
                      msg: `Entry '${uid}' in content type '${content_type}' of ${language} language already exists.`
                    });
                } else {
                  _data[pos] = data;
                }
                // _data[pos] = data;
              } else {
                _data.push(data);
              }
              return fs
                .writeFilePromisified(pth, JSON.stringify(_data))
                .then(() => {
                  if (content_type === _schema)
                    return resolve({
                      status: 1,
                      msg: `Content type '${uid}' in ${language} language has been updated successfully.`
                    });
                  else
                    return resolve({
                      status: 1,
                      msg: `Entry '${uid}' in content type '${content_type}' of ${language} language has been updated successfully.`
                    });
                })
                .catch(error => {
                  log.error(error);
                  return reject(error);
                });
            })
            .catch(error => {
              log.error(error);
              return reject(error);
            });
        } else {
          return fs
            .writeFilePromisified(pth, JSON.stringify([data]))
            .then(() => {
              if (content_type === _schema)
                return resolve({
                  status: 1,
                  msg: `Content type '${uid}' in ${language} language has been updated successfully.`
                });
              else
                return resolve({
                  status: 1,
                  msg: `Entry '${uid}' in content type '${content_type}' of ${language} language has been updated successfully.`
                });
            })
            .catch(error => {
              log.error(error);
              return reject(error);
            });
        }
      } catch (error) {
        log.error(error);
        return reject(error);
      }
    });
  }

  /**
   * Mandatory Keys: _content_type_uid, locale, _uid
   */
  remove(query) {
    return new Promisify((resolve, reject) => {
      try {
        let language,
          content_type,
          uid,
          pth,
          result_obj = {};
        (language = query._locale),
          (content_type = query._content_type_uid),
          (uid = query._uid);

        pth = path.join(Utils.getContentPath(language), content_type + ".json");

        if (fs.existsSync(pth)) {
          return fs
            .readFilePromisified(pth)
            .then(objekts => {
              objekts = JSON.parse(objekts);
              let pos = _.findIndex(objekts, { _uid: uid });
              if (pos === -1) {
                if (content_type === _schema)
                  return resolve({
                    status: 0,
                    msg: `Content type ${uid} in ${language} language was not found.`
                  });
                else
                  return resolve({
                    status: 0,
                    msg: `Entry ${uid} in content type ${content_type} of ${language} language, was not found.`
                  });
              }
              objekts.splice(pos, 1);
              return fs
                .writeFilePromisified(pth, JSON.stringify(objekts))
                .then(() => {
                  if (content_type === "_content_types") {
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
                        log.error(error);
                        return reject(error);
                      });
                  } else {
                    return resolve({
                      status: 1,
                      msg: `Entry ${uid} of ${content_type} in ${language} was removed successfully.`
                    });
                  }
                })
                .catch(error => {
                  log.error(error);
                  return reject(error);
                });
            })
            .catch(error => {
              log.error(error);
              return reject(error);
            });
        } else {
          if (content_type === _schema)
            return resolve({
              status: 0,
              msg: `Content type ${uid} in ${language} language was not found.`
            });
          else
            return resolve({
              status: 0,
              msg: `Entry ${uid} in content type ${content_type} of ${language} language, was not found.`
            });
        }
      } catch (error) {
        log.error(error);
        return reject(error);
      }
    });
  }

  [_remove_content_type](uid, language, msg) {
    return new Promisify((resolve, reject) => {
      // Get path where the entries are stored
      let _e_pth = path.join(Utils.getContentPath(language), uid + ".json");
      if (fs.existsSync(_e_pth)) {
        fs
          .statPromisified(_e_pth)
          .then(stats => {
            // Express.. and such
            if (stats.isFile()) {
              // Delete that file
              return fs
                .unlinkPromisified(_e_pth)
                .then(() => {
                  msg += `Entries of ${uid} were removed successfully.`;
                  return;
                })
                .then(() => {
                  // Remove the routes, if the content type has any, from _routes
                  let _r_pth = path.join(
                    Utils.getContentPath(language),
                    "_routes.json"
                  );
                  if (fs.existsSync(_r_pth)) {
                    return fs
                      .statPromisified(_r_pth)
                      .then(stats => {
                        if (stats.isFile()) {
                          return fs
                            .readFilePromisified(_r_pth)
                            .then(routes => {
                              routes = JSON.parse(routes);
                              let removed_routes = _.remove(routes, _route => {
                                if (_route._data.content_type.uid === uid)
                                  return _route;
                              });
                              if (removed_routes.length) {
                                return fs
                                  .writeFilePromisified(
                                    _r_pth,
                                    JSON.stringify(routes)
                                  )
                                  .then(() => {
                                    msg += `\nRoutes of ${uid} in ${language} language were removed successfully.`;
                                    return resolve(msg);
                                  })
                                  .catch(error => {
                                    log.error(error);
                                    // Error while re-writing _routes
                                    return reject(error);
                                  });
                              } else {
                                // No routes were removed
                                msg += `\nNo routes were found for ${uid} content type in ${language} language.`;
                                return resolve(msg);
                              }
                            })
                            .catch(error => {
                              log.error(error);
                              // Error reading _routes file
                              return reject(error);
                            });
                        } else {
                          msg += `\nUnexpected file type of ${uid} entries in ${language} language. Unable to remove them.`;
                          return resolve(msg);
                        }
                      })
                      .catch(error => {
                        log.error(error);
                        // _routes file not found
                        return reject(error);
                      });
                  } else {
                    // _routes path does not exist
                    msg += `\nUnable to find '_route' file indexing of ${uid} content type in ${language} language.`;
                    return resolve(msg);
                  }
                })
                .catch(error => {
                  log.error(error);
                  // Error while deleting entries ( {{uid}}.json file)
                  return reject(error);
                });
            } else {
              log.warn(error);
              msg += `\nUnexpected file type of entries for ${uid} in ${language} language`;
              return resolve(msg);
            }
          })
          .catch(error => {
            log.error(error);
            return reject(error);
          });
      } else {
        msg += `Entries of ${uid} in ${language} was not found.`;
        return resolve(msg);
      }
    });
  }
}

module.exports = new FileContentManagement();
