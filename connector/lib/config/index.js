"use strict";

const fs = require("fs"),
  path = require("path"),
  _ = require("lodash"),
  pathToRegexp = require("path-to-regexp"),
  mkdirp = require("mkdirp"),
  default_config = require("./default");

const _languages = Symbol("_languages"),
  _assetsStorage = Symbol("_assetsStorage"),
  _findVariables = Symbol("_findVariables");

let config = null;

/**
 * Based on provider, load their configurations
 */

class Config {
  /**
   * Load default configurations
   * @return {Number} 	: Status of config
   */
  constructor(_config_overrides) {
    if (!config) {
      let user_config,
        custom,
        _config = {};

      this.environment = process.env.NODE_ENV || "development";
      this._path = {
        base: process.cwd()
      };

      if (fs.existsSync(path.join(this._path.base, "config", "index.js"))) {
        user_config = require(path.join(this._path.base, "config", "index.js"));
      } else {
        console.error(`Running on default`);
        user_config = {};
      }

      if (
        process.env.NODE_ENV &&
        fs.existsSync(
          path.join(
            this._path.base,
            "config",
            process.env.NODE_ENV.toLowerCase()
          )
        )
      ) {
        custom = fs.readFileSync(
          path.join(
            this._path.base,
            "config",
            process.env.NODE_ENV.toLowerCase()
          )
        );
      } else {
        custom = {};
      }

      _.merge(
        this,
        default_config,
        user_config,
        custom,
        _config_overrides || {}
      );

      this._path.plugins = (this.plugins && this.plugins.hasOwnProperty('base_dir')) ? path.join(this._path.base, this.plugins.base_dir): path.join(this._path.base, 'provider-plugins');
      this._path.storage =
        this.storage && this.storage.base_dir
          ? path.join(this.storage.base_dir)
          : path.join(this._path.base, "_content");
      this.storage.provider =
        this.storage.provider || this.storage.database || "filesystem";

      if (this.storage.provider !== "filesystem")
        this.path.asset_storage =
          this.storage && this.storage.assets && this.storage.assets.base_dir
            ? path.join(this.storage.assets.base_dir)
            : path.join(this._path.base, "_assets");

      this._assets = this[_assetsStorage](this.storage.assets);

      this._languages = this[_languages](this);
      // this.logger = this[_initLogger];
      this._config = _config;
      config = this;
    }
    return config;
  }

  get(key) {
    try {
      return key.split(".").reduce((total, current) => {
        if (total && typeof total[current] !== "undefined")
          return total[current];
        return undefined;
      }, config);
    } catch (error) {
      console.error(error);
    }
  }

  set(key, value) {
    key.split(".").reduce((parent, current, index, array) => {
      if (index < array.length - 1) {
        return parent[current];
      } else {
        parent[current] = value;
      }
    }, config);

    switch (key) {
      case "languages":
        // Reload languages and asset paths
        config._languages = this[_languages](config);
        break;
      case "storage":
        if (value.contents && value.contents.base_dir) {
          this._path.storage = path.join(this._path.base, value.contents.base_dir);
        } else if (value.assets && value.assets.base_dir) {
          this._path.storage = path.join(this._path.base, value.assets.base_dir);
        } else if (value.base_dir) {
          this._path.storage = path.join(this._path.base, value.base_dir);
        } else if (value.options && value.options.base_dir) {
          this._path.storage = path.join(this._path.base, value.options.base_dir);
        } else {
          // Do nothing.
          // i.e. keep default config
          return;
        }
        // Reload languages and asset paths
        config._languages = this[_languages](config);
        break;
      case "plugins":
        // Rebuild plugins path, based on config provided
        this._path.plugins = (this.plugins && this.plugins.hasOwnProperty('base_dir')) ? path.join(this._path.base, this.plugins.base_dir): /*path.join(this._path.base, 'provider-plugins')*/this._path.plugins;
        const _plugins = require("../plugins");
        // Reload plugins
        _plugins.load();
        break;
      case "logs":
        const _logger = require("../logger");
        // Reload logger
        _logger.load();
        break;
      default:
        break;
    }
  }

  [_languages](config) {
    let _languages = config.languages,
      storage = config.storage,
      contentPath = config._path.storage,
      keys = [],
      opts = { sensitive: true, strict: true, end: true };
    let idx = _.findIndex(_languages, { relative_url_prefix: "/" });
    if (~idx) _languages.push(_languages.splice(idx, 1).shift());

    let i = 0;
    while (i < _languages.length) {
      if (_languages[i].code && _languages[i].relative_url_prefix) {
        _languages[i]._regex = pathToRegexp(
          _languages[i].relative_url_prefix + "(.*)",
          keys,
          opts
        );
        // setting the content and assets path
        if (storage.provider.toLowerCase() === "filesystem") {
          _languages[i].contentPath = path.join(
            contentPath,
            _languages[i].code,
            "data"
          );
          _languages[i].assetsPath = path.join(
            contentPath,
            _languages[i].code,
            "assets"
          );
          _languages[i].storagePath = path.join(
            contentPath,
            _languages[i].code
          );
          if (!fs.existsSync(_languages[i].contentPath))
            mkdirp.sync(_languages[i].contentPath, "0755");
        } else {
          _languages[i].assetsPath = path.join(
            config.path.assets,
            _languages[i].code,
            "assets"
          );
        }
        if (!fs.existsSync(_languages[i].assetsPath))
          mkdirp.sync(_languages[i].assetsPath, "0755");
        i++;
      } else {
        _languages.splice(i, 1);
      }
    }
    return _languages;
  }

  [_assetsStorage](assets) {
    let _keys = ["uid", "filename"];

    if (_.has(assets, "pattern")) {
      // TODO: implementation pending
      return _.merge(assets, this[_findVariables](assets.pattern));
    } else {
      return _.merge(assets, {
        pattern: "/assets/%s/%s",
        _keys: _keys
      });
    }
  }

  /**
   * TODO
   * This could break. Find better alternative
   */
  [_findVariables](pattern) {
    let variables, asset_pattern, _asset_pattern, asset_dir_pattern;
    (variables = pattern.match(/\/:(\w*)/gm)),
      (asset_pattern = pattern.replace(/\/:(\w*)/gm, "/%s"));
    _asset_pattern = asset_pattern;
    asset_dir_pattern = asset_pattern.replace(
      asset_pattern.substr(asset_pattern.lastIndexOf("/%s"), 3),
      ""
    );
    variables = variables.map(_var => {
      return _var.substr(2);
    });

    return {
      _keys: variables,
      pattern: asset_pattern,
      dir_pattern: asset_dir_pattern
    };
  }
}

module.exports = new Config();
