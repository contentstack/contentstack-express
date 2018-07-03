const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const Promisify = require("bluebird");
const plugins = require("../plugins");

const mandatory_methods = ["findOne", "find", "insert", "remove", "count"];

let datastore;

class Provider {
  constructor() {
    if (!datastore) {
      let content_provider_path,
        asset_provider_path,
        asset_methods,
        content_methods;
      content_provider_path = path.join(
        __dirname,
        "content-management",
        "index.js"
      );
      asset_provider_path = path.join(
        __dirname,
        "asset-management",
        "index.js"
      );

      if (fs.existsSync(content_provider_path))
        this.contents = require(content_provider_path);
      else
        throw new Error(
          `Unable find content-management provider at ${content_provider_path}`
        );

      if (fs.existsSync(asset_provider_path))
        this.assets = require(asset_provider_path);
      else
        throw new Error(
          `Unable find asset-management provider at ${asset_provider_path}`
        );

      // Add check if all the mandatory methods have been implemented
      asset_methods = Object.getOwnPropertyNames(
        Object.getPrototypeOf(this.assets)
      );
      content_methods = Object.getOwnPropertyNames(
        Object.getPrototypeOf(this.contents)
      );

      mandatory_methods.map(method => {
        if (~asset_methods.indexOf(method)) {
        } else
          throw new Error(
            `Assest management provider is missing ${method}() implementation`
          );

        if (~content_methods.indexOf(method)) {
        } else
          throw new Error(
            `Content management provider is missing ${method}() implementation`
          );
      });

      datastore = this;
    }
    return datastore;
  }

  loadPlugins() {
    this.beforePublishPlugins = Object.keys(plugins.beforePublish);
    this.beforeUnpublishPlugins = Object.keys(plugins.beforeUnpublish);

    this.afterPublishPlugins = Object.keys(plugins.afterPublish);
    this.afterUnpublishPlugins = Object.keys(plugins.afterUnpublish);
  }

  findOne(query) {
    return new Promisify((resolve, reject) => {
      if (
        _.has(query, "_content_type_uid") &&
        _.has(query, "_uid") &&
        _.has(query, "_locale")
      ) {
        if (query._content_type_uid === "_assets") {
          return this.assets
            .findOne(_.cloneDeep(query))
            .then(result => {
              return resolve(result);
            })
            .catch(error => {
              return reject(error);
            });
        } else {
          return this.contents
            .findOne(_.cloneDeep(query))
            .then(result => {
              return resolve(result);
            })
            .catch(error => {
              return reject(error);
            });
        }
      } else {
        return reject(
          new Error(
            `${JSON.stringify(
              query
            )} calling 'fetch()' is missing mandatory parameters!`
          )
        );
      }
    });
  }

  find(query, options) {
    return new Promisify((resolve, reject) => {
      if (_.has(query, "_content_type_uid") && _.has(query, "_locale")) {
        options = options || {};
        if (query._content_type_uid === "_assets") {
          return this.assets
            .find(_.cloneDeep(query), _.cloneDeep(options))
            .then(result => {
              return resolve(result);
            })
            .catch(error => {
              return reject(error);
            });
        } else {
          return this.contents
            .find(_.cloneDeep(query), _.cloneDeep(options))
            .then(result => {
              return resolve(result);
            })
            .catch(error => {
              return reject(error);
            });
        }
      } else {
        return reject(
          new Error(
            `${query} calling 'find()' is missing mandatory parameters!`
          )
        );
      }
    });
  }

  count(query) {
    return new Promisify((resolve, reject) => {
      if (_.has(query, "_content_type_uid") && _.has(query, "_locale")) {
        if (query._content_type_uid === "_assets") {
          return this.assets
            .count(_.cloneDeep(query))
            .then(result => {
              return resolve(result);
            })
            .catch(error => {
              return reject(error);
            });
        } else {
          return this.contents
            .count(_.cloneDeep(query))
            .then(result => {
              return resolve(result);
            })
            .catch(error => {
              return reject(error);
            });
        }
      } else {
        return reject(
          new Error(
            `${query} calling 'count()' is missing mandatory parameters!`
          )
        );
      }
    });
  }

  insert(data) {
    return new Promisify((resolve, reject) => {
      if (
        _.has(data, "_content_type_uid") &&
        _.has(data, "_locale") &&
        _.has(data, "_uid")
      ) {
        const type =
          data._content_type_uid === "_assets"
            ? "asset"
            : data._content_type_uid === "_content_types"
              ? "content_type"
              : "entry";
        const _data = _.cloneDeep(data);
        return Promisify.map(
          this.beforePublishPlugins,
          beforePublishPlugin => plugins.beforePublish[beforePublishPlugin](type, _data),
          { concurrency: 1 }
        )
          .then(() => {
            return this[(type !== "asset") ? "contents": "assets"]
              .insert(_data)
              .then(result => {
                // return resolve(result);
                return Promisify.map(
                  this.afterPublishPlugins,
                  afterPublishPlugin => plugins.afterPublish[afterPublishPlugin](type, data),
                  { concurrency: 1 }
                )
                .then(() => {
                  // Everything went right
                  return resolve(result);
                })
                .catch(error => {
                  // Post plugins failed to execute
                  console.error(error);
                  return resolve(result);
                });
              })
              .catch(error => {
                return reject(error);
              });
          })
          .catch(error => {
            return reject(error);
          });
      } else {
        return reject(
          new Error(
            `${JSON.stringify(
              data
            )} calling 'insert()' is missing mandatory parameters!`
          )
        );
      }
    });
  }

  upsert(data) {
    return new Promisify((resolve, reject) => {
      if (
        _.has(data, "_content_type_uid") &&
        _.has(data, "_locale") &&
        _.has(data, "_uid")
      ) {
        const type =
          data._content_type_uid === "_assets"
            ? "asset"
            : data._content_type_uid === "_content_types"
              ? "content_type"
              : "entry";
        const _data = _.cloneDeep(data);
        return Promisify.map(
          this.beforePublishPlugins,
          beforePublishPlugin => plugins.beforePublish[beforePublishPlugin](type, _data),
          { concurrency: 1 }
        )
          .then(() => {  
            return this[(type !== "asset") ? "contents": "assets"]
              .upsert(_data)
              .then(result => {
                return resolve(result);
              })
              .catch(error => {
                return reject(error);
              });
          })
          .catch(error => {
            return reject(error);
          });
      } else {
        return reject(
          new Error(
            `${JSON.stringify(
              data
            )} calling 'upsert()' is missing mandatory parameters!`
          )
        );
      }
    });
  }

  remove(query) {
    return new Promisify((resolve, reject) => {
      if (
        _.has(query, "_content_type_uid") &&
        _.has(query, "_locale") &&
        _.has(query, "_uid")
      ) {
        const type =
          query._content_type_uid === "_assets"
            ? "asset"
            : query._content_type_uid === "_content_types"
              ? "content_type"
              : "entry";
        const _query = _.cloneDeep(query);
        if (_query._content_type_uid !== "_routes") {
          return Promisify.map(
            this.beforeUnpublishPlugins,
            beforeUnpublishPlugin => plugins.beforeUnpublish[beforeUnpublishPlugin](type, _query),
            { concurrency: 1 }
          )
            .then(() => {
              if (query._content_type_uid === "_assets") {
                return this.assets
                  .remove(_query)
                  .then(result => {
                    return resolve(result);
                  })
                  .catch(error => {
                    return reject(error);
                  });
              } else {
                return this.contents
                  .remove(_query)
                  .then(result => {
                    return resolve(result);
                  })
                  .catch(error => {
                    return reject(error);
                  });
              }
            })
            .catch(error => {
              return reject(error);
            });
        } else {
          return resolve(this.contents.remove(_query));
        }
      } else {
        return reject(
          new Error(
            `${query} calling 'remove()' is missing mandatory parameters!`
          )
        );
      }
    });
  }
}

module.exports = new Provider();
