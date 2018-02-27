const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const plugin_methods = ["beforePublish", "beforeUnpublish", "afterPublish", "afterUnpublish"];

const _loadInternalPlugin = Symbol("_loadInternalPlugin");

let plugin_i = null;
let config = require('../config');
let log;

class Plugins {
  constructor(options) {
    try {
      if (!plugin_i) {
        this.options = options;
        this.plugins = config.plugins || {};
        this.beforePublish = {};
        this.beforeUnpublish = {};
        this.afterPublish = {};
        this.afterUnpublish = {};

        log = config.logger.plugins;

        plugin_i = this;
      }

      // TODO: Need to add for post as well
      return plugin_i;
    } catch (error) {
      log.error(error);
    }
  }

  load() {
    try {
      // Remove custom path set on plugins
      delete plugin_i.plugins.base_dir;
      for (let plugin_name in plugin_i.plugins) {
        const plugin_options = plugin_i.plugins[plugin_name];
        const plugin_path = path.join(
          config._path.plugins,
          plugin_name,
          "index.js"
        );
        if (
          typeof plugin_name === "string" &&
          typeof plugin_options === "object" &&
          fs.existsSync(plugin_path)
        ) {
          let current_plugin = require(plugin_path);
          if (typeof current_plugin === "function") {
            current_plugin.options = plugin_options;
            // Executing plugin that was loaded
            // Here, the instance of current_plugin is loaded onto plugin_i.plugins[custom]
            plugin_i.plugins[plugin_name] = current_plugin(plugin_options);
            
            plugin_methods.map(pMethod => {
              if (
                plugin_i.plugins[plugin_name][pMethod] &&
                typeof plugin_i.plugins[plugin_name][pMethod] === "function"
              ) {
                // Make those external plugins part of 'Plugins' class
                plugin_i[pMethod][plugin_name] = plugin_i.plugins[plugin_name][pMethod];
                log.info(`${pMethod} of ${plugin_name} has been registered.`);
              } else {
                log.info(
                  `Unable to execute ${pMethod} in ${plugin_name}.`
                );
              }
            });
          } else {
            throw new TypeError(`${plugin_name} should be of type 'function'.`);
          }
        } else {
          log.info(`Unable to find path for ${plugin_name} plugin`);
        }
      }

      // load internal plugin
      plugin_i[_loadInternalPlugin]();
      return true;
    } catch (error) {
      log.error(error);
    }
  }

  [_loadInternalPlugin]() {
    try {
      plugin_i.plugins._default = require("./default")({});
      plugin_methods.map(pMethod => {
        if (
          plugin_i.plugins._default[pMethod] &&
          typeof plugin_i.plugins._default[pMethod] === "function"
        ) {
          // Make those external plugins part of 'Plugins' class
          plugin_i[pMethod]["_default"] = plugin_i.plugins._default[pMethod];
          log.silly(`${pMethod} of '_default' has been registered.`);
        } else {
          log.info(`Unable to execute ${pMethod} in '_default' plugin.`);
        }
      });
    } catch (error) {
      log.error(error);
    }
  }
}

module.exports = new Plugins();
