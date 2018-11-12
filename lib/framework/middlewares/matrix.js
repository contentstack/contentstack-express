/*!
 * contentstack-express
 * copyright (c) Contentstack
 * MIT Licensed
 */

"use strict";

/*!
 * Module dependencies
 */
var path = require("path"),
  fs = require("graceful-fs");

/**
 * template manager
 */
module.exports = function(utils) {
  var config = utils.config;

  return function matrix(req, res, next) {
    try {
      if (
        req.contentstack.get("response_type") != "json" &&
        req.contentstack.get("content_type")
      ) {
        var template;
        if (req.contentstack.get("content_type")) {
          var content_type = req.contentstack.get("content_type"),
            templatesDir = "pages",
            ext = config.get("view.extension") || "html",
            _templates = path.join(
              config.get("path.templates")[0],
              templatesDir,
              content_type
            );

          var lang = req.contentstack.get("lang").code;
          // for language based templates
          if (
            lang &&
            fs.existsSync(path.join(_templates, lang, "index." + ext))
          ) {
            template = path.join(_templates, lang, "index." + ext);
            // for templates with content_type/index.html or content_type.html
          } else if (fs.existsSync(path.join(_templates, "index." + ext))) {
            template = path.join(_templates, "index." + ext);
          } else if (fs.existsSync(path.join(_templates + "." + ext))) {
            template = _templates + "." + ext;
          } else if (fs.existsSync(path.join(_templates, "single." + ext))) {
            template = path.join(_templates, "single");
          }
        }
        req.contentstack.set("template", template);
      }
      return next();
    } catch (matrix_error) {
      return next(matrix_error);
    }
  };
};
