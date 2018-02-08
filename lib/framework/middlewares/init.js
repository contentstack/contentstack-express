/*!
 * contentstack-express
 * copyright (c) Built.io Contentstack
 * MIT Licensed
 */

"use strict";
/*!
 * Module dependencies
 */
var _ = require("lodash"),
  htmlclean = require("htmlclean"),
  fs = require("graceful-fs"),
  path = require("path");

/**
 * Set language in context and remove prefix from url
 */
module.exports = function(utils) {
  var context = utils.context,
    config = utils.config,
    languages = config.get("languages"),
    _length = languages.length,
    _minify = config.get("view.minify");

  function get(url) {
    var lang;
    for (var i = 0; i < _length; i++) {
      var val = languages[i]._regex.exec(url);
      if (val && val.length <= 2) {
        lang = {
          relative_url_prefix: languages[i].relative_url_prefix,
          code: languages[i].code,
          url: "/" + val[1]
        };
        break;
      }
    }
    return lang;
  }

  return function init(req, res, next) {
    try {
      var reqUrl = req.url,
        parsedUrl = req._parsedUrl.pathname,
        type,
        lang = get(req.url);

      if (lang) {
        if (endsWith(parsedUrl, ".json")) {
          type = "json";
          req.contentstack.set("response_type", type, true);
          reqUrl = spliceLastIndex(reqUrl, ".json");
          parsedUrl = spliceLastIndex(parsedUrl, ".json");
        }

        // removing the relative url prefix from the url
        req.url = req.url.replace(lang.relative_url_prefix, "/");
        req.parsedUrl = parsedUrl.replace(lang.relative_url_prefix, "/");

        req.contentstack.set("query", req.query, true);
        req.contentstack.set("url", req.url, true);
        req.contentstack.set("originalUrl", reqUrl, true);
        req.contentstack.set("parsedUrl", req.parsedUrl, true);
        req.contentstack.set("lang", lang, true);
        context.set("lang", lang.code);
        if (type !== "json") res.render = render(res.render, _minify);
        return next();
      } else {
        return next(new Error("No language found for " + reqUrl + " url."));
      }
    } catch (init_error) {
      return next(init_error);
    }
  };
};

/*
 check is string ends with substring
 */
function endsWith(str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

/*
 remove given sub-string from string
 */
function spliceLastIndex(str, substring) {
  return str.slice(0, str.lastIndexOf(substring));
}

/*
 override render function to minify html
 */
function render(_render, minify) {
  return function(view, data, fn) {
    var self = this;
    if (typeof fn !== "function") {
      fn = function(err, html) {
        try {
          if (err) throw err;
          if (minify) html = htmlclean(html);
          self.send(html);
        } catch (e) {
          self.req.next(e);
        }
      };
    } else if (typeof fn === "function") {
      fn = fn;
    }
    _render.call(self, view, data, fn);
  };
}
