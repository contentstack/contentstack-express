/*!
 * contentstack-express
 * copyright (c) Contentstack
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */
var express = require('express');
var methods = require('methods');

module.exports = function Router() {
  var router = express.Router.apply(express, arguments);
  // creating an instance for extended routers
  var extendsRouter = express.Router.apply(express, arguments);
  router.extends = function() {
    var proto = {};
    // create Router#VERB functions
    methods.concat('handle', 'param', 'use', 'route', 'all').forEach(function(method) {
      var _handle = extendsRouter[method];
      proto[method] = function() {
        return _handle.apply(extendsRouter, arguments);
      };
    });
    return proto;
  };
  router._extends = extendsRouter;
  return router;
};