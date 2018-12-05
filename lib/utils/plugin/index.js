/*!
 * contentstack-express
 * copyright (c) Contentstack
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */
var path = require('path');
var fs = require('graceful-fs');
var _ = require('lodash');
var config = require('../config');

var plugin = module.exports = function() {};

plugin.load = function() {
  var _path = path.join(config.get('path.base'), 'plugins'),
    inBuiltPluginsPath = path.join(__dirname, '..', '..', 'framework', 'plugins'),
    inBuiltPlugins = require(inBuiltPluginsPath),
    plugins = config.get('plugins') || {},
    __plugins = _.clone(inBuiltPlugins);

  // taking inbuiltplugins before the application plugins
  _.merge(__plugins, plugins);
  if (typeof __plugins === 'object' && Object.keys(__plugins).length) {
    var pluginOptions;
    for (var plugin_key in __plugins) {
      pluginOptions = __plugins[plugin_key];
      if (plugin_key && typeof plugin_key === 'string' && pluginOptions && (fs.existsSync(path.join(_path, plugin_key, 'index.js')) || fs.existsSync(path.join(inBuiltPluginsPath, plugin_key, 'index.js')))) {
        var currentPlugin;
        if (fs.existsSync(path.join(_path, plugin_key, 'index.js'))) {
          currentPlugin = require(path.join(_path, plugin_key, 'index.js'));
        } else if (fs.existsSync(path.join(inBuiltPluginsPath, plugin_key, 'index.js'))) {
          currentPlugin = require(path.join(inBuiltPluginsPath, plugin_key, 'index'));
        }
        if (typeof currentPlugin === 'function') {
          // adding the options in the plugin
          currentPlugin.options = pluginOptions;
          plugin._plugins[plugin_key] = currentPlugin;
          currentPlugin();
          // load all the plugins in the PluginManager
          if (currentPlugin.serverExtends && typeof currentPlugin.serverExtends === 'function') {
            plugin._serverExtends[plugin_key] = currentPlugin.serverExtends;
          }
          if (currentPlugin.templateExtends && typeof currentPlugin.templateExtends === 'function') {
            plugin._templateExtends[plugin_key] = currentPlugin.templateExtends;
          }
          if ((currentPlugin.beforePublish && typeof currentPlugin.beforePublish === 'function') || (currentPlugin.beforeUnpublish && typeof currentPlugin.beforeUnpublish === 'function')) {
            plugin._syncUtility[plugin_key] = {
              beforePublish: (currentPlugin.beforePublish && typeof currentPlugin.beforePublish === 'function') ? currentPlugin.beforePublish : undefined,
              beforeUnpublish: (currentPlugin.beforeUnpublish && typeof currentPlugin.beforeUnpublish === 'function') ? currentPlugin.beforeUnpublish : undefined
            };
          }
        } else {
          throw new TypeError(plugin_key + ' should be a function.');
        }
      }
    }
  }
};

plugin._plugins = {};
plugin._templateExtends = {};
plugin._serverExtends = {};
plugin._syncUtility = {};