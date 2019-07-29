/*!
 * contentstack-express
 * Copyright (c) Contentstack
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */
var _ = require('lodash');
var pathToRegexp = require('path-to-regexp');
var debug = require('debug')('db:config');
var fs = require('graceful-fs');
var path = require('path');
var mkdirp = require('mkdirp');

path.isAbsolute =
  path.isAbsolute ||
  function(_path) {
    return /^[a-zA-Z]:\\/.test(_path) || /^[/]/.test(_path);
  };

/**
 * overrides default configuration with environment specific configuration
 */
function Config() {
  try {
    var env = process.env.NODE_ENV || 'development';
    var server = process.env.SERVER || process.env.server || 'default';
    var _dirname = process.env.SITE_PATH ? path.resolve(process.env.SITE_PATH): process.cwd();

    var _path = path.join(_dirname, 'config');
    var _default = require('./default');
    var _all = fs.existsSync(path.join(_path, 'all.js')) ? require(path.join(_path, 'all')) : {};
    var _env = fs.existsSync(path.join(_path, env + '.js')) ? require(path.join(_path, env)) : {};

    // merge default configuration with specified environment
    var _config = _.merge(_default, _.merge(_all, _env));
    // set other configurations
    var _theme = path.join(_dirname, 'themes', _config.theme);
    _config.environment = env;
    _config.server = server;

    if (!_config.storage) throw new Error('Storage must be specified.');
    // set path
    _config.path = {
      base: _dirname,
      theme: _theme,
      templates: [path.join(_theme, 'templates'), path.join(__dirname, '../../framework/static')],
      favicon: path.isAbsolute(_config.static.path) ? path.resolve(_config.static.path, 'favicon.ico'): path.resolve(_theme, _config.static.path, 'favicon.ico'),
      logs: path.isAbsolute(_config.logs.path) ? _config.logs.path : path.join(_dirname, _config.logs.path),
      storage: _config.storage && _config.storage.options && path.isAbsolute(_config.storage.options.basedir) ?
        _config.storage.options.basedir : path.join(_dirname, _config.storage && _config.storage.options ? _config.storage.options.basedir || './_content' : './_content')
    };

    if (_config.view.custom_templates) {
      if (typeof _config.view.custom_templates === 'string' && fs.existsSync(path.join(_dirname, _config.view.custom_templates))) {
        _config.path.templates.push(path.join(_dirname, _config.view.custom_templates));
      } else if (typeof _config.view.custom_templates === 'object' && _config.view.custom_templates instanceof Array) {
        _config.view.custom_templates.forEach(function(template_path) {
          if (fs.existsSync(_dirname, template_path)) {
            _config.path.templates.push(path.join(_dirname, template_path));
          } else {
            debug(`${template_path} provided in config failed to resolve.`);
          }
        });
      } else {
        debug(`${_config.view.custom_templates} provided in config failed to resolve.`);
      }
    }
    if (_config.storage && _config.storage.provider.toLowerCase() !== 'filesystem') {
      _config.path.assets = _config.assets && path.isAbsolute(_config.assets.basedir) ? _config.assets.basedir: path.join(_dirname, _config.assets.basedir || './assets');
    }
    // configure storage
    _config.assets = storage(_config.assets);
    // configure languages
    _config.languages = languages(_config);
    _config.cache = process.env.SYNC !== 'false' ? _config.cache : false;
    this._config = _config;
  } catch (error) {
    throw error;
  }
}

// set configuration
Config.prototype.set = function(key, value) {
  this._config[key] = value;
};

// get configuration
Config.prototype.get = function(key) {
  return key.split('.').reduce(function(o, x) {
    if (o && typeof o[x] !== 'undefined') return o[x];
    return undefined;
  }, this._config);
};

/*
 Add compiled regex in languages to match url easily
 */
function languages(config) {
  var _languages = config.languages;
  var storage = config.storage;
  var contentPath = config.path.storage;
  var keys = [];
  var opts = {
    sensitive: true,
    strict: true,
    end: true
  };
  var idx = _.findIndex(_languages, {
    relative_url_prefix: '/'
  });
  if (~idx) {
    _languages.push(_languages.splice(idx, 1).shift());
  }
  var i = 0;
  while (i < _languages.length) {
    if (_languages[i].code && _languages[i].relative_url_prefix) {
      _languages[i]._regex = pathToRegexp(_languages[i].relative_url_prefix + '(.*)', keys, opts);
      // setting the content and assets path
      if (storage.provider.toLowerCase() === 'filesystem') {
        _languages[i].contentPath = path.join(contentPath, _languages[i].code, 'data');
        _languages[i].assetsPath = path.join(contentPath, _languages[i].code, 'assets');
        if (!fs.existsSync(_languages[i].contentPath)) {
          mkdirp.sync(_languages[i].contentPath, '0755');
        }
      } else {
        _languages[i].assetsPath = path.join(config.path.assets, _languages[i].code, 'assets');
      }
      if (!fs.existsSync(_languages[i].assetsPath)) {
        mkdirp.sync(_languages[i].assetsPath, '0755');
      }
      i++;
    } else {
      _languages.splice(i, 1);
    }
  }
  return _languages;
}

/*
 Parsed storage object:
 Assets: Identify asset's url patten and split it.
 */
function storage(_assets) {
  var _keys = ['uid', 'filename'];
  if (_assets.pattern) {
    var split = _assets.pattern.split('/:');
    _.merge(_assets, {
      relative_url_prefix: split.length ? split.shift() + '/' : '/assets/',
      keys: split.length ? split : _keys
    });
  } else {
    _.merge(_assets, {
      relative_url_prefix: '/assets/',
      keys: _keys
    });
  }
  return _assets;
}

module.exports = new Config();