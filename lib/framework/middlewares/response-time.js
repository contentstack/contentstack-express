/*!
 * contentstack-express
 * copyright (c) Contentstack
 * MIT Licensed
 */

"use strict";

/*!
 * Module dependencies
 */
var onHeaders = require("on-headers");

/**
 * calculate total response time in milliseconds of every request and response through header
 */
module.exports = function() {
  return function xRuntime(req, res, next) {
    try {
      // check whether already started runtime calculation
      if (!res._runTime) {
        // set start time of request process
        var start = new Date();
        res._runTime = true;

        onHeaders(res, function() {
          // calculate total runtime
          var duration = new Date() - start;
          res.setHeader("x-runtime", duration + "ms");
        });
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
};
