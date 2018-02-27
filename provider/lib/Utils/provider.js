const _ = require("lodash"),
  Promisify = require("bluebird");

const config = require("../config");

/**
 * Contains methods common to providers
 */
class ProviderUtility {
  constructor() {
    // this.languages = config.get('languages'),
    this.prefix_key = config.get("prefix_key");
  }

  getContentPath(langCode) {
    let pos = _.findIndex(config.languages, { code: langCode });
    if (~pos) return config.languages[pos]["contentPath"];
    else throw new Error(`Content path not found for ${langCode}!`);
  }

  getAssetPath(langCode) {
    let pos = _.findIndex(config.languages, { code: langCode });
    if (~pos) return config.languages[pos]["assetsPath"];
    else throw new Error(`Assset path not found for ${langCode}!`);
  }

  getStoragePath(langCode) {
    let pos = _.findIndex(config.languages, { code: langCode });
    if (~pos) return config.languages[pos]["storagePath"];
    else throw new Error(`Storage path not found for ${langCode}!`);
  }

  filterQuery(query, del_keys) {
    for (let i = 0, total = del_keys.length; i < total; i++) {
      delete query[del_keys[i]];
    }

    function _filterQuery(_query) {
      for (let key in _query) {
        let _keys = key ? key.split(".") : [],
          _index = _keys && _keys.length ? _keys.indexOf("uid") : -1;
        if (_index > 1) {
          let _value = _query[key];
          _keys[_index] = "values";
          let _key = _keys.join(".");
          _query[_key] = _value;
          delete _query[key];
        } else if (_query[key] && typeof _query[key] === "object") {
          _filterQuery(_query[key]);
        }
      }
    }

    _filterQuery(query);
    return query;
  }

  filterData(data, type) {
    let _del = [], i, _i;
    switch (type) {
      case "asset":
        _del = config.get("storage.assets.keys_delete");
        if (_del && _del.length) {
          for (i = 0, _i = _del.length; i < _i; i++) delete data._data[_del[i]];
        }
        break;
      case "entry":
        _del = config.get("storage.content");
        if (
          _del &&
          _del.entry &&
          _del.entry.keys_delete &&
          _del.entry.keys_delete instanceof Array
        ) {
          _del = _del.entry.keys_delete;
          if (_del.length) {
            for (i = 0, _i = _del.length; i < _i; i++)
              delete data._data[_del[i]];
          }
        }
        break;
      case "content_type":
        _del = config.get("storage.content");
        if (
          _del &&
          _del.content_type &&
          _del.content_type.keys_delete &&
          _del.content_type.keys_delete instanceof Array
        ) {
          _del = _del.content_type.keys_delete;
          if (_del.length) {
            for (i = 0, _i = _del.length; i < _i; i++)
              delete data._data[_del[i]];
          }
        }
        break;
      default:
        console.error(`Something went wrong in filterData.`);
    }
    return data;
  }

  filterSchema(content_type) {
    try {
      let only_keys = [
        "title",
        "uid",
        "schema",
        "options",
        "singleton",
        "references",
        "created_at",
        "updated_at"
      ];
      for (let field in content_type) {
        if (only_keys.indexOf(field) === -1) delete content_type[field]; // Remove keys that do not match the required ones
      }
    } catch (error) {
      console.info(error);
    }
  }

  indexReferences(content_type) {
    try {
      if (_.has(content_type, "schema") && content_type.schema.length) {
        let data = {};
        function _indexReferences(schema, parent) {
          for (let i = 0, s_length = schema.length; i < s_length; i++) {
            if (
              schema[i] &&
              schema[i]["data_type"] &&
              schema[i]["data_type"] === "reference"
            ) {
              let field = parent
                ? parent + ":" + schema[i]["uid"]
                : schema[i]["uid"];
              data[field] = schema[i]["reference_to"];
            } else if (
              schema[i] &&
              schema[i]["data_type"] &&
              schema[i]["data_type"] === "group" &&
              schema[i]["schema"]
            ) {
              _indexReferences(
                schema[i]["schema"],
                parent ? parent + ":" + schema[i]["uid"] : schema[i][uid]
              );
            }
          }
        }
        if (this.prefix_key) _indexReferences(content_type, this.prefix_key);
        else _indexReferences(content_type);

        content_type["references"] = data;
        return content_type;
      } else {
        console.log("@content_type", content_type);
        throw new Error(`Unexpected content_type schema.`);
      }
    } catch (error) {
      console.info(error);
      return content_type;
    }
  }

  /**
  * Function which includes the references' content type entry
  * into the content type entry data
  *
  * @param {Object} data         - Data in which references need to be included
  * @param {String} language      - Contains the locale of the given Content Type
  * @param {Object} references    - Object, containing the references hierarchy
  * @param {String} parent_id     - UID of the parent
  * @param {Object} _this         - 'this' instance of the caller method
  * @return {Function} promise    - Function which is called upon completion
  */
  includeReferences(data, language, references, parent_id, _this) {
    return new Promisify((resolve, reject) => {
      let calls = [],
        self = this,
        _self = _this;
      if (_.isEmpty(references)) references = {};

      function _includeReferences(data) {
        for (let key in data) {
          if (data.uid) parent_id = data.uid;

          if (typeof data[key] === "object") {
            if (data[key] && data[key]["_content_type_id"]) {
              calls.push(
                ((_key, _data) => {
                  return new Promisify((_resolve, _reject) => {
                    let query = {
                      _content_type_uid: _data[_key]["_content_type_id"],
                      uid: { $in: _data[_key]["values"] },
                      _locale: language,
                      _remove_prefix: true
                    };
                    query["uid"]["$in"] = _.filter(
                      query["uid"]["$in"],
                      _uid => {
                        return !self.detectCyclic(_uid, references);
                      }
                    );

                    if (query._content_type_uid === "_assets") {
                      return _self.asset_mgmt
                        .find(query, {
                          references: _.cloneDeep(references),
                          parent_id: parent_id
                        })
                        .then(result => {
                          _data[_key] = result;
                          return _resolve(_data);
                        })
                        .catch(error => {
                          return _reject(error);
                        });
                    } else {
                      return _self
                        .find(query, {
                          references: _.cloneDeep(references),
                          parent_id: parent_id
                        })
                        .then(result => {
                          _data[_key] = result;
                          return _resolve(_data);
                        })
                        .catch(error => {
                          return _reject(error);
                        });
                    }
                  });
                })(key, data)
              );
            } else {
              _includeReferences(data[key]);
            }
          }
        }
      }

      function recursive(data) {
        return new Promisify((_resolve, _reject) => {
          _includeReferences(data);
          if (calls.length) {
            Promisify.map(
              calls,
              call => {
                calls = [];
                return setImmediate(() => {
                  return recursive(call)
                    .then(() => {
                      return _resolve();
                    })
                    .catch(error => {
                      return reject(error);
                    });
                });
              },
              { concurrency: 1 }
            );
          } else {
            return _resolve(data);
          }
        });
      }

      return recursive(data)
        .then(() => {
          return resolve(data);
        })
        .catch(error => {
          return reject(error);
        });
    });
  }

  detectCyclic(uid, reference_map) {
    let flag, list;
    (flag = false), (list = [uid]);
    function _getParents(child) {
      let parents = [];
      for (let key in reference_map) {
        if (~reference_map[key].indexOf(child)) parents.push(key);
      }
      return parents;
    }

    for (let i = 0; i < list.length; i++) {
      let parent = _getParents(list[i]);
      if (~parent.indexOf(uid)) {
        flag = true;
        break;
      }
      list = _.uniq(list.concat(parent));
    }
    return flag;
  }

  sort(collection, key, operator) {
    let _collection = _.cloneDeep(_.sortBy(collection, key));
    if (~operator) {
      // return _.reverse(_collection);
      let __collection = [];
      for (let i = 0, j = _collection.length - 1; j >= 0; i++, j--)
        __collection[i] = _collection[j];
      return __collection;
    }
    return _collection;
  }
}

module.exports = new ProviderUtility();
