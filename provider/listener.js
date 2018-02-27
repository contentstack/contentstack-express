/**
 * TODO
 * 1. Iterate over prototype chain, and check if parent inherits EventEmitter at any point
 *
 */
const DB = require("./lib/Providers");
const _ = require("lodash");

let listener = null;

class Listener {
  constructor(parent) {
    if (!listener) {
      // Get logger
      const config = require('./lib/config');
      const log = config.logger.listener;

      parent.on("find", (query, cb) => {
        log.debug({method: 'find', query: query, msg: `Find was called!`});
        return DB.find(query, {})
          .then(result => {
            return cb(result);
          })
          .catch(error => {
            log.error(error);
            return cb({ status: -1, error: error });
          });
      });

      parent.on("fetch", (query, cb) => {
        log.debug({method: 'fetch', query: query, msg: `Fetch was called!`});
        return DB.findOne(query)
          .then(result => {
            return cb(result);
          })
          .catch(error => {
            log.error(error);
            return cb({ status: -1, error: error });
          });
      });

      parent.on("downloadAssets", (asset, cb) => {
        console.log('@downloadAssets', asset);
        log.debug({method: 'downloadAssets', query: asset, msg: `DownloadAssets was called!`});
        if (
          _.has(asset, "_uid") &&
          _.has(asset, "_locale") &&
          _.has(asset, "asset")
        ) {
          asset._data = asset.asset;
          asset._return_inserted_asset = true;
          delete asset.asset;
          return DB.upsert(asset)
            .then(result => {
              return cb(result);
            })
            .catch(error => {
              log.error(error);
              return cb({ status: -1, error: error });
            });
        } else {
          log.silly({
            status: -1,
            error: new Error(`
            Download assets is missing mandatory parameters.
            Query should have the following keys: '_uid', '_locale' and 'asset' fields.
          `)
          });
          return cb({
            status: -1,
            error: new Error(`
            Download assets is missing mandatory parameters.
            Query should have the following keys: '_uid', '_locale' and 'asset' fields.
          `)
          });
        }
      });

      parent.on("publish", (data, cb) => {
        log.debug({method: 'Publish', query: data, msg: `Publish was fired`});
        /**
         * From Sync
         * 1. asset publish
         * {
         *   _content_type_uid: {string}
         *   _uid: {string}
         *   _locale: {string}
         *   asset: {object}
         * }
         * 2. entry publish
         * {
         *   _content_type_uid: {string}
         *   _uid: {string}
         *   _locale: {string}
         *   entry: {object}
         *   content_type: {object}
         * }
         */
        if (_.has(data, "asset")) {
          data._data = data.asset;
          delete data.asset;

          return DB.upsert(data)
            .then(status => {
              return cb(status);
            })
            .catch(error => {
              log.error(error);
              return cb({ status: -1, error: error });
            });
        } else if (_.has(data, "entry") && _.has(data, "content_type")) {
          // Upsert content_type then entry
          return DB.upsert({
            _content_type_uid: "_content_types",
            _uid: data.content_type.uid,
            _locale: data._locale,
            _data: data.content_type
          })
            .then(result => {
              if (~result.status) {
                return DB.upsert({
                  _content_type_uid: data.content_type.uid,
                  _uid: data._uid,
                  _locale: data._locale,
                  _data: data.entry
                })
                  .then(result => {
                    return cb(result);
                  })
                  .catch(error => {
                    log.error(error);
                    return cb({ status: -1, error: error });
                  });
              } else {
                log.silly({
                  status: -1,
                  error: new Error(
                    `Upsert for ${data.content_type.uid} content_type failed.`
                  )
                });
                return cb({
                  status: -1,
                  error: new Error(
                    `Upsert for ${data.content_type.uid} content_type failed.`
                  )
                });
              }
            })
            .catch(error => {
              log.error(error);
              return cb({ status: -1, error: error });
            });
        } else {
          log.silly({
            status: -1,
            msg: `
            Publish is missing mandatory parameters.
            Data should have '_uid', '_locale' AND either 'asset' OR 'entry' & 'content_type' keys!
          `
          });
          return cb({
            status: -1,
            msg: `
            Publish is missing mandatory parameters.
            Data should have '_uid', '_locale' AND either 'asset' OR 'entry' & 'content_type' keys!
          `
          });
        }
      });

      parent.on("unpublish", (data, cb) => {
        log.debug({method: 'Unublish', query: data, msg: `Unpublish was fired`});
        /**
         * From Sync
         * Object unpublish
         * {
         *   _content_type_uid: {string}
         *   _uid: {string}
         *   _locale: {string}
         * }
         */
        if (
          _.has(data, "_uid") &&
          _.has(data, "_locale") &&
          _.has(data, "_content_type_uid")
        ) {
          return DB.remove({
            _uid: data._uid,
            _locale: data._locale,
            _content_type_uid: data._content_type_uid,
            _delete: false
          })
            .then(status => {
              return cb(status);
            })
            .catch(error => {
              log.error(error);
              return cb({ status: -1, error: error });
            });
        } else {
          log.silly({
            status: -1,
            error: new Error(`
            Unpublish is missing mandatory parameters.
            Query should have the following keys: '_uid', '_content_type_uid' and '_locale'
          `)
          });
          return cb({
            status: -1,
            error: new Error(`
            Unpublish is missing mandatory parameters.
            Query should have the following keys: '_uid', '_content_type_uid' and '_locale'
          `)
          });
        }
      });

      // keeping delete separate from unpublish
      // unpublish removes single object, delete removes all object
      // ex: unpublish entry, removes the specific version of entry
      // delete entry, removes the entire entry, and all its versions
      parent.on("delete", (data, cb) => {
        log.debug({method: 'Delete', query: data, msg: `Delete was fired.`});
        /**
         * From Sync
         * Object delete
         * {
         *   _content_type_uid: {string}
         *   _uid: {string}
         *   _locale: {string}
         * }
         */
        if (
          _.has(data, "_uid") &&
          _.has(data, "_locale") &&
          _.has(data, "_content_type_uid")
        ) {
          const type =
            data._content_type_uid === "_assets"
              ? "asset"
              : data._content_type_uid === "_content_types"
                ? "content_type"
                : "entry";

          return DB.remove({
            _uid: data._uid,
            _locale: data._locale,
            _content_type_uid: data._content_type_uid,
            _delete: true
          })
            .then(status => {
              return cb(status);
            })
            .catch(error => {
              log.error(error);
              return cb({ status: -1, error: error });
            });
        } else {
          log.silly({
            status: -1,
            error: new Error(`
            Unpublish is missing mandatory parameters.
            Query should have the following keys: '_uid', '_content_type_uid' and '_locale'
          `)
          });
          return cb({
            status: -1,
            error: new Error(`
            Unpublish is missing mandatory parameters.
            Query should have the following keys: '_uid', '_content_type_uid' and '_locale'
          `)
          });
        }
      });
      listener = this;
    }
    return listener;
  }

  remvoveListener () {
    // Point listener object to null;
    listener = null;
    return true;
  }
}

module.exports = Listener;
