/*!
 * contentstack-express
 * copyright (c) Contentstack
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */
var utils = require('../../../utils');
var helper = require('../../../sync/helper');

module.exports = function Router() {
  var db = utils.db;
  var options = Router.options;

  Router.beforePublish = function(data, next) {
    try {
      if (data && data.entry && typeof data.entry.url === "string" && data.content_type && data.content_type.uid) {
        var body = {
          content_type: {
            uid: data.content_type.uid
          },
          entry: {
            url: data.entry.url,
            uid: data.entry.uid
          }
        };
        if (data.content_type.options && !data.content_type.options.singleton) {
          body.entry.title = data.entry.title || data.entry.uid;
          body.entry.created_at = data.entry.created_at;
        }
        db.ContentType(options.content_type_uid).language(data.language.code).Entry(data.entry.uid).update(body)
          .then(function () {
          	return next();
          }).catch(next)
      } else {
        return next();
      }
    } catch (error) {
      return next(error);
    }
  };

  Router.beforeUnpublish = function(data, next) {
    if (data && data.entry && data.entry.uid && data.content_type && data.content_type.uid) {
      db.ContentType(options.content_type_uid).language(data.language.code).Entry(data.entry.uid).remove().then(function() {
        return next();
      }).catch(next)
    } else {
      return next();
    }
  };
};