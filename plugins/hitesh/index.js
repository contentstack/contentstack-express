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
           .get("/test", function (req, res, next) {
               var Query = Stack
                   .ContentType("references_file_100_assets")
                   .Query();

               Query
                   .skip(0)
                   .limit(75)
                   .includeCount()
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