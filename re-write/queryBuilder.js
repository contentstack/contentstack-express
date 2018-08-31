exports.queryBuilder = function (query, language, content_type_uid, callback) {
  var self = this;
  return new Promise(function (resolve, reject) {
    var skip_uids = ['_routes', '_content_types', '_assets'];
    if (query && Object.keys(query).length && content_type_uid && skip_uids.indexOf(content_type_uid) === -1) {
      var content_path = path.join(self.getContentPath(language), '_content_types.json');
      return _fs.readFileP(content_path).then(function (content_types) {
        content_types = JSON.parse(content_types);
        var content_type;

        // use for loop for performance improvement
        for (var i = 0, _i = content_types.length; i < _i; i++) {
          if (content_types[i]._uid === content_type_uid) {
            content_type = content_types[i];
            break;
          }
        }

        var references;
        if (content_type) {
          references = content_type._data.references || {};
        }
        if (references && Object.keys(references).length > 0) {
          var query_fields = Object.keys(query);
          return Promise.map(query_fields, function (filterField) {
            return new Promise(function (_resolve, _reject) {
              var _calls = {};
              var _filterField = filterField.toString();
              var refQuery, refForm;

              for (var refField in references) {
                var newRefField = refField.replace(/:/g, '.');
                if (filterField.indexOf(newRefField) === 0) {
                  // processing the new query param
                  _filterField = _filterField.split('.');
                  _filterField[_filterField.length - 1] = 'uid';
                  _filterField = _filterField.join('.');

                  refForm = references[refField];
                  refQuery = refQuery || {};
                  var newFilterField = filterField.replace(newRefField, '_data'); // remove this entry, replacement if system going to attach the "_data."
                  refQuery[newFilterField] = query[filterField];
                  delete query[filterField];
                }
              }

              if (refQuery && Object.keys(refQuery).length) {
                var entries_path = path.join(self.getContentPath(language), refForm + '.json');
                return _fs.readFileP(entries_path).then(function (entries) {
                  entries = JSON.parse(entries);
                  entries = sift(refQuery, entries);
                  if (entries && entries.length) {
                    query[_filterField] = {
                      $in: _.pluck(entries, '_data.uid')
                    }
                  } else {
                    query[_filterField] = {
                      $in: []
                    }
                  }
                  return _resolve();
                }).catch(_reject);
              } else if (typeof query[filterField] === 'object' && query[filterField] instanceof Array) {
                console.log('@query[filterField]: ' + JSON.stringify(query[filterField]));
                return Promise.map(query[filterField], function (field) {
                  return self.queryBuilder(query[filterField][field], language, content_type_uid)
                    .then(_resolve)
                    .catch(_reject);
                });
              } else {
                return _resolve();
              }
            });
          }, {concurrency: 2}).then(resolve).catch(reject);
        } else {
          return resolve(query);
        }
      }).catch(reject);
    } else {
      return resolve(query);
    }
  });
};