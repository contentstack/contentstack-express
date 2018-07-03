const _ = require("lodash");

let entry_plugin;
let db;

class EntryPlugins {
  constructor(options) {
    if (!entry_plugin) {
      this.options = options;
      db = require('../../Providers');
      entry_plugin = this;
    }
    return entry_plugin;
  }

  beforePublish(data) {
    return new Promise((resolve, reject) => {
      try {
        if (data._data && typeof data._data.url === "string") {
          return db
            .upsert({
              _uid: data._uid,
              _content_type_uid: "_routes",
              _locale: data._locale,
              _data: {
                content_type: {
                  uid: data._content_type_uid
                },
                entry: {
                  url: data._data.url,
                  uid: data._uid,
                  title: data._data.title,
                  created_at: data._data.created_at
                }
              }
            })
            .then(result => {
              if (result.status !== -1) {
                return resolve();
              } else {
                return reject(result.error);
              }
            })
            .catch(error => {
              return reject(error);
            });
        } else {
          return resolve();
        }
      } catch (error) {
        return reject(error);
      }
    });
  }

  afterPublish(data) {
    return new Promise((resolve, reject) => {
      return resolve();
    });
  }

  beforeUnpublish(query) {
    return new Promise((resolve, reject) => {
      try {
        return db
          .remove({
            _uid: query._uid,
            _content_type_uid: "_routes",
            _locale: query._locale
          })
          .then(result => {
            if (result.status !== -1) {
              return resolve();
            } else {
              return reject(result.error);
            }
          })
          .catch(error => {
            return reject(error);
          });
      } catch (error) {
        return reject(error);
      }
    });
  }

  afterUnpublish(data) {
    return new Promise((resolve, reject) => {
      return resolve();
    });
  }
}

module.exports = (options) => {
  return new EntryPlugins(options);
};