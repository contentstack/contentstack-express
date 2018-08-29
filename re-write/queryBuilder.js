exports.queryBuilder = function (query, language, content_type_uid, callback) {
  var self = this;
  return new Promise(function (resolve, reject) {
    var skip_uids = ['_routes', '_content_types', '_assets'];
    if (query && Object.keys(query).length && content_type_uid && skip_uids.indexOf(content_type_uid) === -1) {
      var content_path = path.join(self.getContentPath(language), '_content_types.json');

      return fs.readFileP(content_path).then(function (content_types) {
        var content_type = _.find(content_types, {
          _uid: content_type_uid
        });
        var references;
        if (content_type && content_type.length) {
          content_type = content_type[0];
          references = content_type.references || {};
        }
        if (references && Object.keys(references) > 0) {
          var requests = [];
          for (var filterField in query) {
            requests.push(function findReferences(filterField) {
              return new Promise(function (_resolve, _reject) {
                var _calls = {}
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
                  _calls[_filterField] = [(function filterSingleReference(refQuery, content_type_uid) {
                    return new Promise(function (__resolve, __reject) {
                      var entries_path = path.join(self.getContentPath(language), content_type_uid + '.json');
                      return fs.readFileP(entries_path).then(function (entries) {
                        entries = JSON.parse(entries);
                        entries = sift(refQuery, entries);
                        var ref_entry_uids;
                        if (entries && entries.length) {
                          ref_entry_uids = {
                            $in: _.pluck(entries, 'uid')
                          }
                        } else {
                          ref_entry_uids = {
                            $in: []
                          }
                        }
                        return __resolve(ref_entry_uids);
                      }).catch(__reject);
                    });
                  }(refQuery, refForm))];
                } else if (typeof query[filterField] === 'object' && query[filterField] instanceof Array) {
                  _calls[filterField] = [];
                  for (var i = 0, total = query[filterField].length; i < total; i++) {
                    _calls[filterField].push(function filterMultipleReferences(filterQuery) {
                      return new Promise(function (__resolve, __reject) {
                        return utility.queryBuilder(filterQuery, language, content_type_uid)
                          .then(__resolve)
                          .catch(__reject);
                      });
                    }(query[filterField][i]));
                  }
                }
                if (_calls && _calls[filterField].length) {
                  return Promise.map(_calls[filterField], function (exec) {
                    return exec();
                  }, {
                    concurrency: 1
                  }).then(_resolve).catch(_reject);
                } else {
                  return _resolve({
                    [filterField]: {}
                  });
                }
              });
            }(filterField));
          }
          return Promise.map(requests, function (req) {
            return req();
          }, {
            concurrency: 1
          }).then(resolve).catch(reject);
        } else {
          return resolve(query);
        }
      }).catch(reject);
    } else {
      return resolve(query);
    }
  });
};