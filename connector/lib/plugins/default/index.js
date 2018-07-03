const _ = require("lodash");

const config = require('../../config');

let entryPlugins;
let default_i = null;
let log;

const _switchBlock = Symbol("_switchBlock");

class Default {
  constructor(options) {
    if (!default_i) {
      entryPlugins = require('./entry')({});
      this.options = options;
      log = config.logger.plugins;
      default_i = this;
    }
    return default_i;
  }

  beforePublish(type, data) {
    return new Promise((resolve, reject) => {
      try {
        return default_i[_switchBlock]("beforePublish", type, data)
          .then(result => resolve(result))
          .catch(error => {
            return reject(error);
          });
      } catch (error) {
        log.error(error);
        return resolve();
      }
    });
  }

  afterPublish(type, data) {
    return new Promise((resolve, reject) => {
      try {
        return default_i[_switchBlock]("afterPublish", type, data)
          .then(result => resolve(result))
          .catch(error => {
            return reject(error);
          });
      } catch (error) {
        log.error(error);
        return resolve();
      }
    });
  }

  beforeUnpublish(type, data) {
    return new Promise((resolve, reject) => {
      try {
        return default_i[_switchBlock]("beforeUnpublish", type, data)
          .then(result => resolve(result))
          .catch(error => {
            return reject(error);
          });
      } catch (error) {
        log.error(error);
        return resolve();
      }
    });
  }

  afterUnpublish(type, data) {
    return new Promise((resolve, reject) => {
      try {
        return default_i[_switchBlock]("afterUnpublish", type, data)
          .then(result => resolve(result))
          .catch(error => {
            return reject(error);
          });
      } catch (error) {
        log.error(error);
        return resolve();
      }
    });
  }

  [_switchBlock](method, type, data) {
    return new Promise((resolve, reject) => {
      switch (type) {
        case "entry":
          return entryPlugins[method](data)
            .then(result => resolve(result))
            .catch(error => {
              return reject(error);
            });
          break;
        case "content_type":
        // Currently there are no hooks for content_types
          return resolve();
          break;
        case "asset":
        // Currently there are no hooks for assets
          return resolve();
          break;
        default:
          log.info(`Kindly provide the type for '${method}' hook.`);
          return resolve(data);
      }
    });
  }
}

module.exports = (options) => {
  return new Default();
};
