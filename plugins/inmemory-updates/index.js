/**
 * Note: Add some kind of authentication on the webhook calls to avoid issues
 */

var Contentstack = require('contentstack-express');
var config = Contentstack.config;
var utils = require('./utilities');

module.exports = function InmemoryUpdates() {
  // load the app's inmemory (customized to singleton)
  var appInMemory = require('../../node_modules/contentstack-express/lib/utils/db/inmemory');
  var options = InmemoryUpdates.options;
  var indexedContentTypes = config.get('indexes');
  var indexedContentTypeUids;
  if (indexedContentTypes && typeof indexedContentTypes === 'object') {
    indexedContentTypeUids = Object.keys(indexedContentTypes);
  } 

  InmemoryUpdates.serverExtends = function(app) {
    app.post('/onpublish-unpublish/inmemory-updates', function (req, res, next) {
      if (req.body && req.body.data && req.body.data.content_type && req.body.data.entry && req.body.data.action && req.body.data.locale) {
        var entry = req.body.data.entry;
        var content_type = req.body.data.content_type;
        var action = req.body.data.action;
        var locale = req.body.data.locale;

        appInMemory.cache[locale][content_type.uid] = appInMemory.cache[locale][content_type.uid] || [];

        if (action === 'publish') {
          entry = utils.updateReferences(content_type, entry);
          var flag = false;
          for (var i = 0, _i = appInMemory.cache[locale][content_type.uid].length; i < _i; i++) {
            if (appInMemory.cache[locale][content_type.uid][i]._data.uid === entry.uid) {
              appInMemory.cache[locale][content_type.uid][i] = {_data: entry};
              console.log('matched: ' + content_type.uid);
              flag = true;
              break;
            }
          }
          // i.e. Inmemory did not have the object
          if (!flag) {
            appInMemory.cache[locale][content_type.uid].push({_data: entry});
          }
          res.send('OK');
        } else if (action === 'unpublish' || action === 'delete') {
          for (var i = 0, _i = appInMemory.cache[locale][content_type.uid].length; i < _i; i++) {
            if (appInMemory.cache[locale][content_type.uid][i]._data.uid === entry.uid) {
              var removed_entry = appInMemory.cache[locale][content_type.uid].splice(i, 1);
              console.log('Entry removed for content_type: ' + content_type.uid + ', entry: ' + entry.uid);
              break;
            }
          }
          res.send('OK');
        } else {
          // find something better to send - update the status code as well
          res.send('Invalid operation');
          console.log(JSON.stringify(req.body));
        }
        console.log('inmemory-updates webhook called for ' + content_type.uid + ', entry: ' + entry.uid);
      } else {
        res.send('Invalid data received');
        console.log('Object.keys()' + Object.keys(res));
        // fs.writeFileSync('./webhook-inmemory-updates-res', );
        console.log('Response body: ' + JSON.stringify(req.body));
      }
    });
  };
};