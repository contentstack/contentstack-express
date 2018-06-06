/*!
 * contentstack-express
 * copyright (c) Built.io Contentstack
 * MIT Licensed
 */

"use strict";

/**
 * search for the requested route in the system.
 */
module.exports = function(utils) {
  var db = utils.db;
  var config = utils.config;
  var referenceDepth = config.get("storage.options.referenceDepth");
  var internalReferenceDepth = (referenceDepth && referenceDepth.internalRoutes && typeof referenceDepth.internalRoutes === "number") ? referenceDepth.internalRoutes: undefined;

  return function smug(req, res, next) {
    try {
      var lang = req.contentstack.get("lang"),
        Query1 = db
          .ContentType("_routes")
          .Query()
          .where("entry.url", lang.url),
        Query2 = db
          .ContentType("_routes")
          .Query()
          .where("entry.url", req._contentstack.parsedUrl);

      db
        .ContentType("_routes")
        .language(lang.code)
        .Query()
        .or(Query1, Query2)
        .toJSON()
        .findOne()
        .then(function(data) {
          if (data && typeof data === "object") {
            var _query = db.ContentType(data.content_type.uid).language(lang.code).Entry(data.entry.uid).toJSON();
            if (internalReferenceDepth)
              _query = _query.referenceDepth(internalReferenceDepth);

            _query.fetch().then(function(entry) {
              req.contentstack.set(
                "content_type",
                data.content_type.uid,
                true
              );
              req.contentstack.set("entry", entry);
              return next();
            })
            .catch(function(err) {
              return next(err);
            });
          } else {
            return next();
          }
        })
        .catch(function(err) {
          return next();
        });
    } catch (error) {
      return next(error);
    }
  };
};
