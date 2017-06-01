/*!
 * hitesh
 */

 "use strict";

/*!
 * Module dependencies
 */
var contentstack =  require('contentstack-express');
var Stack = contentstack.Stack();

module.exports = function Hitesh() {
   Hitesh.serverExtends = function(app) {
       app
           .get("/test-asset-entry", function (req, res, next) {
               var Query = Stack
                   .Assets()
                   .language('en-us')
                   .Query();

               Query
                   .toJSON()
                   .find()
                   .then(function (data) {
                       res.json(data);
                   }).catch(function (err) {
                       res.send(err)
                   });
           });

   };
};