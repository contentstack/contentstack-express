/**
 * TODO
 * 1. filterQuery needs implementation : Completed
 * 2. build : internal_url : Completed
 * 3. Separate single asset insert|upsert from multiple
 * 4.
 *
 * Drawback noticed:
 * If user wants to change the internal url pattern, it is not possible
 * i.e. user cannot use filename to store data
 *
 * Note
 * 1. Check if sort works for nested keys in express & provider
 */
const _ = require("lodash"),
  request = require("request"),
  Promisify = require("bluebird"),
  fs = Promisify.promisifyAll(require("fs"), { suffix: "Promisified" }),
  path = require("path"),
  sift = require("sift"),
  mkdirp = require("mkdirp"),
  util = require("util"),
  Utils = require("../../Utils");
const winston = require('winston');

const config = require("../../config"),
  del_keys = [
    "_remove_prefix",
    "_count_only",
    "_include_count",
    "_delete",
    "_locale",
    "_content_type_uid",
    "_uid",
    "_return_inserted_asset"
  ],
  assetsConf = config.get("_assets");

const _downloadAsset = Symbol("_downloadAsset"),
  _getAssetUrl = Symbol("_getAssetUrl"),
  _urlFromObject = Symbol("_urlFromObject"),
  _delete = Symbol("_delete"),
  _unpublish = Symbol("_unpublish");

let management_instance = null;
let log = null;

class FileAssetManagement {
  constructor() {
    // Adding this for consistency with filesystem provider of entries and content_types
    this.del_keys = config.get("storage.del_keys")
      ? del_keys.concat(config.get("storage.del_keys"))
      : del_keys;
    if (!management_instance) {
      log = config.logger.provider;
      // log = winston.loggers.get('provider');
      management_instance = this;
    }
    return management_instance;
  }

  findOne(query) {
    return new Promisify((resolve, reject) => {
      try {
        let pth,
          result_obj = {};
        query.uid = query._uid;
        delete query._uid;
        pth = path.join(
          Utils.getAssetPath(query._locale),
          query._content_type_uid + ".json"
        );
        query = Utils.filterQuery(query, this.del_keys);
        return fs
          .statPromisified(pth)
          .then(stats => {
            try {
              if (stats.isFile()) {
                return fs
                  .readFilePromisified(pth)
                  .then(result => {
                    result = JSON.parse(result);
                    result = _.map(result, "_data");
                    if (Array.isArray(result) && result.length !== 0) {
                      if (
                        query.hasOwnProperty("_query") &&
                        query._query.hasOwnProperty("query")
                      ) {
                        result = sift(query._query.query, result);
                      } else {
                        result = sift(query, result);
                      }
                      result_obj["asset"] = result[0] || {};
                      return resolve(result_obj);
                    } else {
                      result_obj["asset"] = {};
                      return resolve(result_obj);
                    }
                  })
                  .catch(error => {
                    log.error(error);
                    return reject(error)
                  });
              } else {
                throw new Error(`File at ${pth} was not found!`);
              }
            } catch (error) {
              log.error(error);
              return reject(error);
            }
          })
          .catch(error => {
            log.info(error);
            return reject(error);
          });
      } catch (error) {
        log.error(error);
        return reject(error);
      }
    });
  }

  find(query, options) {
    return new Promisify((resolve, reject) => {
      try {
        let content_type,
          language,
          pth,
          count_only,
          include_count,
          sort_key,
          sort_operator,
          _remove_prefix,
          result_obj = {};

        // Assign values
        (content_type = query._content_type_uid),
          (language = query._locale),
          (_remove_prefix =
            typeof query._remove_prefix === "boolean" && query._remove_prefix
              ? query._remove_prefix
              : false),
          (sort_operator = options.sort
            ? Object.keys(options.sort)[0]
            : "published_at"),
          (sort_key = options.sort ? options.sort : -1),
          (count_only =
            typeof query._count_only === "boolean" ? query._count_only : false),
          (include_count =
            typeof query._include_count === "boolean"
              ? query._include_count
              : false);

        pth = path.join(Utils.getAssetPath(language), content_type + ".json");
        query = Utils.filterQuery(query, this.del_keys);
        return fs
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
                    if (Array.isArray(result) && result.length !== 0) {
                      if (
                        query.hasOwnProperty("_query") &&
                        query._query.hasOwnProperty("query")
                      ) {
                        result = sift(query._query, result);
                      } else {
                        result = sift(query, result);
                      }

                      // In case its a call for getting 'count_only', do not process further
                      if (count_only) {
                        result_obj["assets"] = result.length;
                        return resolve(result_obj);
                      }
                      // Sorting
                      result = Utils.sort(result, sort_key, sort_operator);

                      if (options.limit) {
                        options.skip = options.skip || 0;
                        result = result.splice(options.skip, options.limit);
                      } else if (options.skip > 0) {
                        result = result.slice(options.skip);
                      }

                      if (_remove_prefix) result_obj = result;
                      else result_obj["assets"] = result;

                      if (include_count)
                        _result.count = _result["assets"].length;
                      return resolve(result_obj);
                    } else {
                      result_obj["assets"] = result;
                      return resolve(result_obj);
                    }
                  })
                  .catch(error => {
                    log.error(error);
                    return reject(error)
                  });
              } else {
                throw new Error(`Assets file type at ${pth} was 'unexpected'!`);
              }
            } catch (error) {
              log.error(error);
              return reject(error);
            }
          })
          .catch(error => {
            log.info(error);
            return reject(error)
          });
      } catch (error) {
        log.error(error);
        return reject(error);
      }
    });
  }

  count(query) {
    return new Promisify((resolve, reject) => {
      try {
        let result_obj = {};

        query._count_only = true;

        return this.find(query, {})
          .then(result => {
            result_obj["assets"] = result["assets"].length;
            return resolve(result_obj);
          })
          .catch(error => {
            log.error(error);
            return reject(error)
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
  insert(data) {
    return new Promisify((resolve, reject) => {
      try {
        let language,
          uid,
          pth,
          _data,
          return_asset,
          result_obj = {};

        (language = data._locale),
          (uid = data._uid),
          (return_asset =
            typeof data._return_inserted_asset === "boolean"
              ? data._return_inserted_asset
              : false);

        data = Utils.filterData(data, "asset");
        pth = path.join(
          Utils.getAssetPath(language),
          data._content_type_uid + ".json"
        );

        if (fs.existsSync(pth)) {
          return fs
            .readFilePromisified(pth)
            .then(_assets => {
              _assets = JSON.parse(_assets);
              let pos = _.findIndex(_assets, { _uid: data._uid });
              if (~pos) {
                if (return_asset)
                  return resolve({
                    status: 0,
                    msg: `Asset ${
                      data._uid
                    } in ${language} language already exists!`,
                    asset: _assets[pos]
                  });
                else
                  return resolve({
                    status: 0,
                    msg: `Asset ${
                      data._uid
                    } in ${language} language already exists!`
                  });
              }

              return this[_downloadAsset](data)
                .then(result => {
                  _assets.push(result);
                  return fs
                    .writeFilePromisified(pth, JSON.stringify(_assets))
                    .then(() => {
                      if (return_asset)
                        return resolve({
                          status: 1,
                          msg: `Asset ${uid} was inserted in ${language} language successfully.`,
                          asset: result._data
                        });
                      else
                        return resolve({
                          status: 1,
                          msg: `Asset ${uid} was inserted in ${language} language successfully.`
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
            })
            .catch(error => {
              log.error(error);
              return reject(error);
            });
        } else {
          // 1. Download File
          return this[_downloadAsset](data)
            .then(result => {
              // 2. Write File
              return fs
                .writeFilePromisified(pth, JSON.stringify([result]))
                .then(() => {
                  if (return_asset)
                    return resolve({
                      status: 1,
                      msg: `Asset ${uid} was inserted in ${language} language successfully.`,
                      asset: result._data
                    });
                  else
                    return resolve({
                      status: 1,
                      msg: `Asset ${uid} was inserted in ${language} language successfully.`
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
        }
      } catch (error) {
        log.error(error);
        return reject(error);
      }
    });
  }

  upsert(data) {
    return new Promisify((resolve, reject) => {
      try {
        let pth,
          return_asset,
          result_obj = {};
        return_asset =
          typeof data._return_inserted_asset === "boolean"
            ? data._return_inserted_asset
            : false;
        data = Utils.filterData(data, "asset");
        pth = path.join(
          Utils.getAssetPath(data._locale),
          data._content_type_uid + ".json"
        );
        if (fs.existsSync(pth)) {
          return fs
            .readFilePromisified(pth)
            .then(_assets => {
              _assets = JSON.parse(_assets);
              let pos = _.findIndex(_assets, { _uid: data._uid });
              /**
               * It could be either RTE OR File
               *   IF File: Check if url & version match
               */
              if (~pos) {
                let _asset = _assets[pos];
                // Its a file
                if (data._data._version) {
                  if (
                    _asset._data._version &&
                    data._data._version === _asset._data._version &&
                    data._data.parent_id === _asset._data.parent_id
                  ) {
                    if (return_asset) {
                      return resolve({
                        status: 0,
                        msg: `Asset ${data._uid} in ${
                          data._locale
                        } already exists.`,
                        asset: _asset._data
                      });
                    } else {
                      return resolve({
                        status: 0,
                        msg: `Asset ${data._uid} in ${
                          data._locale
                        } already exists.`
                      });
                    }
                  } else if (!_asset._data.hasOwnProperty("_version")) {
                    _assets.push(data);
                  } else {
                    _assets.splice(pos, 1, data);
                  }
                } else {
                  // Its RTE, no need to upsert RTE with same _uid.
                  if (return_asset) {
                    return resolve({
                      status: 0,
                      msg: `Asset ${data._uid} in ${
                        data._locale
                      } already exists.`,
                      asset: _asset._data
                    });
                  } else {
                    return resolve({
                      status: 0,
                      msg: `Asset ${data._uid} in ${
                        data._locale
                      } already exists.`
                    });
                  }
                }
              } else {
                _assets.push(data);
              }
              return this[_downloadAsset](data)
                .then(result => {
                  return fs
                    .writeFilePromisified(pth, JSON.stringify(_assets))
                    .then(() => {
                      if (return_asset)
                        return resolve({
                          status: 1,
                          msg: `Asset ${data._uid} in ${
                            data._locale
                          } language has been updated successfully.`,
                          asset: result._data
                        });
                      else
                        return resolve({
                          status: 1,
                          msg: `Asset ${data._uid} in ${
                            data._locale
                          } language has been updated successfully.`
                        });
                    })
                    .catch(error => {
                      log.error(error);
                      return reject(error);
                    });
                })
                .catch(error => {
                  console.log('@assets provider');
                  log.error(error);
                  return reject(error);
                });
            })
            .catch(error => {
              log.error(error);
              return reject(error);
            });
        } else {
          // 1. Download File
          return this[_downloadAsset](data)
            .then(result => {
              // 2. Write File
              return fs
                .writeFilePromisified(pth, JSON.stringify([result]))
                .then(() => {
                  if (return_asset)
                    return resolve({
                      status: 1,
                      msg: `Asset ${data._uid} in ${
                        data._locale
                      } language has been updated successfully.`,
                      asset: result._data
                    });
                  else
                    return resolve({
                      status: 1,
                      msg: `Asset ${data._uid} in ${
                        data._locale
                      } language has been updated successfully.`
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
        }
      } catch (error) {
        log.error(error);
        return reject(error);
      }
    });
  }

  remove(query) {
    return new Promisify((resolve, reject) => {
      try {
        let pth,
          result_obj = {},
          remove_type =
            (typeof query._delete === "boolean") ? query._delete : "_unpublish";

        pth = path.join(
          Utils.getAssetPath(query._locale),
          query._content_type_uid + ".json"
        );
        if (!fs.existsSync(pth))
          return resolve({
            status: 0,
            msg: `Unable to remove asset. Asset path (${pth}) was not found.`
          });
        if (remove_type) {
          return this[_delete](pth, query)
            .then(msg => {
              return resolve({ status: 1, msg: msg });
            })
            .catch(error => {
              log.error(error);
              return reject(error);
            });
        } else {
          return this[_unpublish](pth, query)
            .then(msg => {
              return resolve({ status: 1, msg: msg });
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

  [_delete](pth, query) {
    console.log('@_delete');
    return new Promisify((resolve, reject) => {
      // 1. Remove from json
      fs
        .statPromisified(pth)
        .then(stats => {
          try {
            return fs
              .readFilePromisified(pth)
              .then(_assets => {
                let removed_elements;
                _assets = JSON.parse(_assets);
                removed_elements = _.remove(_assets, asset => {
                  if (asset._data.uid === query._uid) return asset;
                });
                // No matching elements were found to be deleted
                if (_.isEmpty(removed_elements))
                  return resolve({ status: 0, msg: `No assets were removed.` });
                return fs
                  .writeFilePromisified(pth, JSON.stringify(_assets))
                  .then(() => {
                    // 2. Remove files
                    let assetPath = Utils.getAssetPath(query._locale),
                      msg = "";
                    // TODO: Need to update this
                    let _asset_path = path.join(
                      assetPath,
                      removed_elements[0]._data.uid
                    );
                    if (fs.existsSync(_asset_path)) {
                      return fs
                        .readdirPromisified(_asset_path)
                        .then(files => {
                          Promisify.map(files, file => {
                            return new Promisify((_resolve, _reject) => {
                              return fs
                                .unlinkPromisified(path.join(_asset_path, file))
                                .then(() => {
                                  msg += `${file} was deleted.\n`;
                                  return _resolve();
                                })
                                .catch(error => {
                                  return _reject(error)
                                });
                            });
                          })
                            .then(() => {
                              return fs
                                .rmdirPromisified(_asset_path)
                                .then(() => resolve(msg))
                                .catch(error => {
                                  log.error(error);
                                  return reject(error);
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
                      return resolve(msg);
                    }
                  })
                  .catch(error => {
                    log.error(error);
                    return reject(error);
                  });
              })
              .catch(error => {
                log.error(error);
                reject(error)
              });
          } catch (error) {
            log.error(error);
            return reject(error);
          }
        })
        .catch(error => {
          log.info(error);
          return reject(error);
        });
    });
  }

  [_unpublish](pth, query) {
    return new Promisify((resolve, reject) => {
      // 1. Remove from json
      return fs
        .readFilePromisified(pth)
        .then(_assets => {
          let removed_asset,
            flag = false;
          _assets = JSON.parse(_assets);
          removed_asset = _.remove(_assets, { _uid: query._uid });

          if (removed_asset.length === 0)
            return resolve(
              `Asset ${query._uid} in ${
                query._locale
              } language was not found.\n`
            );
          for (let i = 0, _i = _assets.length; i < _i; i++) {
            if (
              _.has(_assets[i]["_data"], "download_id") &&
              _assets[i]["_data"]["uid"] === removed_asset[0]["_data"]["uid"]
            ) {
              flag = true;
              break;
            }
          }

          return fs
            .writeFilePromisified(pth, JSON.stringify(_assets))
            .then(() => {
              // 2. Remove files
              if (flag)
                return resolve(
                  `Asset ${query._uid} in ${
                    query._locale
                  } language was unpublished successfully.\n`
                );
              let file_path = Utils.getStoragePath(query._locale);
              file_path = path.join(
                file_path,
                removed_asset[0]._data._internal_url
              );
              if (fs.existsSync(file_path)) {
                return fs
                  .unlinkPromisified(file_path)
                  .then(() =>
                    resolve(
                      `Asset ${query._uid} in ${
                        query._locale
                      } language was unpublished successfully.\n`
                    )
                  )
                  .catch(error => {
                    log.error(error);
                    return reject(error);
                  });
              } else {
                return resolve(
                  `Asset ${query._uid} in ${
                    query._locale
                  } language was not found.\n`
                );
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
    });
  }

  [_downloadAsset](asset) {
    return new Promisify((_resolve, _reject) => {
      try {
        let downloadStream,
          writeStream,
          _asset,
          _keys,
          _assets_dir,
          asset_location,
          storage_path = Utils.getStoragePath(asset._locale),
          _internal_url = assetsConf.pattern,
          dir_pattern = assetsConf.dir_pattern;
        _asset = asset._data;

        // Download asset and stream to the path
        downloadStream = request({ url: _asset.url /*, headers: headers*/ });
        downloadStream
          .on("response", response => {
            if (response.statusCode === 200) {
              if (_.has(_asset, "download_id")) {
                let attachment = response.headers["content-disposition"];
                _asset["filename"] = attachment.split("=")[1];
              }
              _keys = this[_urlFromObject](_asset);

              _keys.forEach(key => {
                _internal_url = util.format(_internal_url, key);
              });
              _keys.pop();
              _keys.forEach(key => {
                dir_pattern = util.format(dir_pattern, key);
              });

              _assets_dir = path.join(storage_path, dir_pattern);
              _asset._internal_url = _internal_url;
              asset_location = path.join(storage_path, _internal_url);
              if (!fs.existsSync(_assets_dir)) mkdirp.sync(_assets_dir);
              if (fs.existsSync()) return resolve(asset);

              writeStream = fs.createWriteStream(asset_location);
              downloadStream.pipe(writeStream);
              writeStream.on("close", () => {
                return _resolve(asset);
              });
              downloadStream.on("error", error => {
                return _reject(error);
              });
              downloadStream.end();
            } else {
              return _reject(
                new Error(`Unable to download asset from ${_asset.url}`)
              );
            }
          })
          .on("error", error => {
            return _reject(error);
          });
      } catch (error) {
        return _reject(error);
      }
    });
  }

  // Generate the full assets url foro the given url
  [_getAssetUrl](assetUrl) {
    assetUrl = relativeUrlPrefix + assetUrl;
    if (!(lang.relative_url_prefix === "/" || lang.host)) {
      assetUrl = lang.relative_url_prefix.slice(0, -1) + assetUrl;
    }
    return assetUrl;
  }

  // Used to generate asset path from keys using asset
  [_urlFromObject](_asset) {
    let values = [],
      _keys = assetsConf._keys;

    for (let a = 0, _a = _keys.length; a < _a; a++) {
      if (_keys[a] === "uid") {
        values.push(
          _asset._metadata && _asset._metadata.object_id
            ? _asset._metadata.object_id
            : _asset.uid
        );
      } else if (_asset[_keys[a]]) {
        values.push(_asset[_keys[a]]);
      } else {
        throw new Error(
          `Mandatory key ${_keys[a]}, was not found in asset object`
        );
      }
    }
    return values;
  }
}

module.exports = new FileAssetManagement();
