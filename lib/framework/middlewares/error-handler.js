/*!
 * contentstack-express
 * copyright (c) Contentstack
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */
var fs = require('graceful-fs'),
  path = require('path'),
  _ = require('lodash');

/**
 * Error handler
 */
module.exports = function(utils) {
  var config = utils.config,
    db = utils.db;
  var _404 = path.join(__dirname, '../static', '404.html'),
    _500 = path.join(__dirname, '../static', '500.html');

  var _path = path.join(config.get('path.templates')[0], 'pages'),
    ext = config.get('view.extension');

  return function errorHandler(err, req, res, next) {
    try {
      var statusCode = err.status || err.status_code || err.code || 500,
        template,
        status = statusCode.toString();

      var lang = req.contentstack.get('lang').code;

      if (lang && fs.existsSync(path.join(_path, status, lang, 'index.' + ext))) {
        // for language based templates
        template = path.join(_path, status, lang, 'index.' + ext);
        // for templates with form_id/index.html or form_id.html
      } else if (fs.existsSync(path.join(_path, status, 'index.' + ext))) {
        template = path.join(_path, status, 'index.' + ext);
      } else if (fs.existsSync(path.join(_path, status + '.' + ext))) {
        template = path.join(_path, status + '.' + ext);
      }

      var result = {};
      _.merge(result, req._contentstack);
      // to merge the context data
      _.merge(result, req.entry);

      if (template) {
        db.ContentType(status).Query().language(lang).toJSON().findOne().then(function(data) {
          // consistent data for all the pages
          result.entry = data || {};
          result.error = result.err;
          utils.context.set('entry', result.entry);
          res.status(statusCode).render(template, result);
        }).catch(function(err) {
          if (err.code && err.code === 422) {
            res.status(statusCode).render(template, result);
            return;
          }
          return next(err);
        });
      } else {
        result.error = (err.hasOwnProperty('message')) ? err.message : err;
        if (statusCode >= 400 && statusCode < 500) {
          template = _404;
        } else {
          template = _500;
        }
        utils.access.error('Error encountered: ', err ? err.message : err);
        res.status(statusCode).render(template, result);
      }
    } catch (error) {
      utils.access.error('Error encountered: ', err ? err.message : err);
      res.status(500).send(error);
    }
  };
};
