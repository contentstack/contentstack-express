const assert = require("chai").assert,
  _ = require("lodash"),
  fs = require("fs"),
  Promise = require("bluebird"),
  rimraf = require("rimraf"),
  sift = require("sift");
const EventEmitter = require('events').EventEmitter;

const utility = require("./utility");

let fsDB,
  config,
  amul = [],
  about = [],
  _schemas = [],
  _routes = [],
  ref_references = [],
  refer_me = [],
  amul_u = [],
  about_u = [],
  _schemas_u = [],
  _routes_u = [],
  ref_references_u = [],
  refer_me_u = [],
  tmp = [];

let _insertedContentTypes = [],
  _insertedEntries = [],
  _removedEntries = [],
  _removedContentTypes = [];

describe("FS Content type Provider Test Suite", function() {
  this.timeout(5000);

  it("(#1) Load FS Content Provider successfully", function() {
    try {
      // const Provider = require("../lib/Providers");
      // fsDB = new Provider();
      const ContentstackProvider = require('contentstack-provider');
      const provider = new ContentstackProvider(new EventEmitter(), {languages: [{code: 'en-us', relative_url_prefix: '/'}]});
      fsDB = provider.db;
      config = require("../lib/config");
      assert.isObject(fsDB, "Is provider loaded?");
    } catch (error) {
      console.error(error);
    }
  });

  it("(#2) FS Content type provider should have all the mandatory methods", function() {
    try {
      let mandatory_methods = [
        "findOne",
        "find",
        "count",
        "remove",
        "insert",
        "upsert"
      ];
      let fsMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(fsDB));
      _.map(mandatory_methods, method => {
        assert.isOk(fsMethods.indexOf(method), method + " present in provider?");
        assert.isFunction(fsDB[method], method + " type is function?");
      });
    } catch (error) {
      console.error(error);
    }
  });

  // TODO: update the way the data is loaded
  it(`(#3) Load 'en-us' data for testing`, function() {
    amul = require("./data/en-us/data/amul");
    about = require("./data/en-us/data/about");
    _schemas = require("./data/en-us/data/_content_types");
    _routes = require("./data/en-us/data/_routes");
    ref_references = require("./data/en-us/data/ref_references");
    refer_me = require("./data/en-us/data/refer_me");

    amul_u = require("./data_upsert/en-us/data/amul");
    about_u = require("./data_upsert/en-us/data/about");
    _schemas_u = require("./data_upsert/en-us/data/_content_types");
    _routes_u = require("./data_upsert/en-us/data/_routes");
    ref_references_u = require("./data_upsert/en-us/data/ref_references");
    refer_me_u = require("./data_upsert/en-us/data/refer_me");
  });

  describe("#Test Content Type - Insert + Upsert", function() {
    it(`(#4) Insert Content Type 'amul'`, function(done) {
      let _amul_schema = _.find(_schemas, { _uid: "amul" });
      fsDB
        .insert(_amul_schema)
        .then(result => {
          assert.isNumber(
            result.status,
            `Result status value should be a 'number'`
          );
          assert.isString(result.msg, `Result msg should be of type 'string'`);
          assert.equal(result.status, 1, `Has the insert fired successfully?`);
          assert.equal(
            result.msg,
            `Content type '${_amul_schema._uid}' in ${
              _amul_schema._locale
            } language was created successfully.`,
            `Do the response messages match?`
          );
          _insertedContentTypes.push(_amul_schema);
          return done();
        })
        .catch(error => {
          // Re-throws error
          assert.ifError(error);
          return done();
        });
    });

    it(`(#5) Re-insert Content type 'amul' should fail`, function(done) {
      let _amul_schema = _.find(_schemas, { _uid: "amul" });
      fsDB
        .insert(_amul_schema)
        .then(result => {
          assert.isNumber(
            result.status,
            `Result status value should be a 'number'`
          );
          assert.isString(result.msg, `Result msg should be of type 'string'`);
          assert.equal(result.status, 0, `Has the insert failed?`);
          assert.equal(
            result.msg,
            `Content type ${_amul_schema._uid} exists already in ${
              _amul_schema._locale
            } language. Use upsert instead.`,
            `Do the response messages match?`
          );
          return done();
        })
        .catch(error => {
          assert.ifError(error);
          return done();
        });
    });

    it(`(#6) Fetch 'amul' schema`, function(done) {
      let _amul_schema = _.find(_schemas, { _uid: "amul" });
      fsDB
        .findOne({
          _uid: _amul_schema._uid,
          _content_type_uid: _amul_schema._content_type_uid,
          _locale: _amul_schema._locale
        })
        .then(result => {
          assert.property(
            result,
            "content_type",
            `Is the return key 'content_type'?`
          );
          assert.equal(
            result.content_type.uid,
            _amul_schema._uid,
            `Is the uid correct?`
          );
          assert.equal(
            result.content_type.title,
            _amul_schema._data.title,
            `Is the title correct`
          );
          assert.property(
            result.content_type,
            "schema",
            `Does it have 'schema' field?`
          );
          assert.property(
            result.content_type,
            "options",
            `Does it have 'options' field?`
          );
          return done();
        })
        .catch(error => {
          assert.ifError(error);
          return done();
        });
    });

    it(`(#7) Find 'amul' schema`, function(done) {
      let _amul_schema = _.find(_schemas, { _uid: "amul" });
      fsDB
        .find({
          uid: _amul_schema._uid,
          _content_type_uid: _amul_schema._content_type_uid,
          _locale: _amul_schema._locale
        })
        .then(result => {
          assert.property(
            result,
            "content_types",
            `Is the return key 'content_types'?`
          );
          assert.equal(
            result.content_types[0].uid,
            _amul_schema._uid,
            `Is the uid correct?`
          );
          assert.equal(
            result.content_types[0].title,
            _amul_schema._data.title,
            `Is the title correct`
          );
          assert.property(
            result.content_types[0],
            "schema",
            `Does it have 'schema' field?`
          );
          assert.property(
            result.content_types[0],
            "options",
            `Does it have 'options' field?`
          );
          return done();
        })
        .catch(error => {
          assert.ifError(error);
          return done();
        });
    });

    it(`(#8) Insert Content Type 'refer_me'`, function(done) {
      let _ref_me = _.find(_schemas, { _uid: "refer_me" });
      fsDB
        .insert(_ref_me)
        .then(result => {
          assert.isNumber(
            result.status,
            `Result status value should be a 'number'`
          );
          assert.isString(result.msg, `Result msg should be of type 'string'`);
          assert.equal(result.status, 1, `Has the insert fired successfully?`);
          assert.equal(
            result.msg,
            `Content type '${_ref_me._uid}' in ${
              _ref_me._locale
            } language was created successfully.`,
            `Do the response messages match?`
          );
          _insertedContentTypes.push(_ref_me);
          return done();
        })
        .catch(error => {
          assert.ifError(error);
          return done();
        });
    });

    it(`(#9) Fetch 'refer_me' schema`, function(done) {
      let _ref_me = _.find(_schemas, { _uid: "refer_me" });
      fsDB
        .findOne({
          _uid: _ref_me._uid,
          _content_type_uid: _ref_me._content_type_uid,
          _locale: _ref_me._locale
        })
        .then(result => {
          assert.property(
            result,
            "content_type",
            `Is the return key 'content_type'?`
          );
          assert.equal(
            result.content_type.uid,
            _ref_me._uid,
            `Is the uid correct?`
          );
          assert.equal(
            result.content_type.title,
            _ref_me._data.title,
            `Is the title correct`
          );
          assert.property(
            result.content_type,
            "schema",
            `Does it have 'schema' field?`
          );
          assert.property(
            result.content_type,
            "options",
            `Does it have 'options' field?`
          );
          return done();
        })
        .catch(error => {
          assert.ifError(error);
          return done();
        });
    });

    it(`(#10) Re-insert Content Type 'refer_me' should fail`, function(done) {
      let _ref_me = _.find(_schemas, { _uid: "refer_me" });
      fsDB
        .insert(_ref_me)
        .then(result => {
          assert.isNumber(
            result.status,
            `Result status value should be a 'number'`
          );
          assert.isString(result.msg, `Result msg should be of type 'string'`);
          assert.equal(result.status, 0, `Has the insert failed?`);
          assert.equal(
            result.msg,
            `Content type ${_ref_me._uid} exists already in ${
              _ref_me._locale
            } language. Use upsert instead.`,
            `Do the response messages match?`
          );
          return done();
        })
        .catch(error => {
          assert.ifError(error);
          return done();
        });
    });

    it(`(#11) Re-test fetch for 'refer_me' schema`, function(done) {
      let _ref_me = _.find(_schemas, { _uid: "refer_me" });
      fsDB
        .findOne({
          _uid: _ref_me._uid,
          _content_type_uid: _ref_me._content_type_uid,
          _locale: _ref_me._locale
        })
        .then(result => {
          assert.property(
            result,
            "content_type",
            `Is the return key 'content_type'?`
          );
          assert.equal(
            result.content_type.uid,
            _ref_me._uid,
            `Is the uid correct?`
          );
          assert.equal(
            result.content_type.title,
            _ref_me._data.title,
            `Is the title correct`
          );
          assert.property(
            result.content_type,
            "schema",
            `Does it have 'schema' field?`
          );
          assert.property(
            result.content_type,
            "options",
            `Does it have 'options' field?`
          );
          return done();
        })
        .catch(error => {
          assert.ifError(error);
          return done();
        });
    });

    it(`(#12) Find content types`, function(done) {
      fsDB
        .find(
          {
            _locale: "en-us",
            _content_type_uid: "_content_types"
          },
          {}
        )
        .then(result => {
          assert.property(
            result,
            "content_types",
            `Has 'content_types' key on find()?`
          );
          assert.isArray(
            result.content_types,
            `Result's 'content_types' key should be an 'Array'`
          );
          assert.lengthOf(
            result.content_types,
            _insertedContentTypes.length,
            `Return value should be of length 2. Since only 2 objects have been inserted`
          );
          let _titles, _uids;
          (_titles = _.map(_insertedContentTypes, content_type => {
            return content_type._data.title;
          })),
            (_uids = _.map(_insertedContentTypes, content_type => {
              return content_type._data.uid;
            }));
          _.map(result.content_types, content_type => {
            assert.notEqual(
              _titles.indexOf(content_type.title),
              -1,
              `Is results 'title' present in '_insertedContentTypes?'`
            );
            assert.notEqual(
              _uids.indexOf(content_type.uid),
              -1,
              `Is results 'uid' present in '_insertedContentTypes?'`
            );
          });
          return done();
        })
        .catch(error => {
          assert.ifError(error);
          return done();
        });
    });

    it(`(#13) Upsert content type 'amul'`, function(done) {
      let _amul_schema_u = _.find(_schemas_u, { _uid: "amul" });
      fsDB
        .upsert(_amul_schema_u)
        .then(result => {
          assert.isNumber(
            result.status,
            `Result status value should be a 'number'`
          );
          assert.isString(result.msg, `Result msg should be of type 'string'`);
          assert.equal(result.status, 1, `Has the upsert fired successfully?`);
          assert.equal(
            result.msg,
            `Content type '${_amul_schema_u._uid}' in ${
              _amul_schema_u._locale
            } language has been updated successfully.`,
            `Do the response messages match?`
          );
          let idx = _.findIndex(_insertedContentTypes, {
            _uid: _amul_schema_u._uid
          });
          if (~idx) _insertedContentTypes.splice(idx, 1, _amul_schema_u);
          else
            assert.notEqual(
              idx,
              -1,
              `Index should not equal -1. Someething's off.`
            );
          return done();
        })
        .catch(error => {
          assert.ifError(error);
          return done();
        });
    });

    it(`(#14) Fetch content type 'amul'`, function(done) {
      let _amul_schema_u = _.find(_schemas_u, { _uid: "amul" });
      fsDB
        .findOne({
          _uid: _amul_schema_u._uid,
          _content_type_uid: _amul_schema_u._content_type_uid,
          _locale: _amul_schema_u._locale
        })
        .then(result => {
          assert.property(
            result,
            "content_type",
            `Is the return key 'content_type'?`
          );
          assert.equal(
            result.content_type.uid,
            _amul_schema_u._uid,
            `Is the uid correct?`
          );
          assert.equal(
            result.content_type.title,
            _amul_schema_u._data.title,
            `Is the title correct`
          );
          assert.property(
            result.content_type,
            "schema",
            `Does it have 'schema' field?`
          );
          assert.property(
            result.content_type,
            "options",
            `Does it have 'options' field?`
          );
          return done();
        })
        .catch(error => {
          assert.ifError(error);
          return done();
        });
    });

    it(`(#15) Find 'amul' schema`, function(done) {
      let _amul_schema_u = _.find(_schemas_u, { _uid: "amul" });
      fsDB
        .find(
          {
            uid: _amul_schema_u._uid,
            _content_type_uid: _amul_schema_u._content_type_uid,
            _locale: _amul_schema_u._locale
          },
          {}
        )
        .then(result => {
          assert.property(
            result,
            "content_types",
            `Is the return key 'content_types'?`
          );
          assert.equal(
            result.content_types[0].uid,
            _amul_schema_u._uid,
            `Is the uid correct?`
          );
          assert.equal(
            result.content_types[0].title,
            _amul_schema_u._data.title,
            `Is the title correct`
          );
          assert.property(
            result.content_types[0],
            "schema",
            `Does it have 'schema' field?`
          );
          assert.property(
            result.content_types[0],
            "options",
            `Does it have 'options' field?`
          );
          return done();
        })
        .catch(error => {
          assert.ifError(error);
          return done();
        });
    });

    it(`(#16) Get count of content types`, function(done) {
      fsDB
        .count({
          _content_type_uid: "_content_types",
          _locale: "en-us"
        })
        .then(result => {
          assert.property(
            result,
            "content_types",
            `Is the return key 'content_types'?`
          );
          assert.isNumber(
            result.content_types,
            `Is the return value a number?`
          );
          assert.equal(result.content_types, _insertedContentTypes.length);
          return done();
        })
        .catch(error => {
          assert.ifError(error);
          return done();
        });
    });
    // Cannot run remove. Else entries will get deleted.
  });

  describe(`#Test Entries - Insert + Upsert`, function() {
    it(`(#17) Insert entries into 'amul'`, function(done) {
      Promise.map(
        amul,
        entry => {
          return new Promise((resolve, reject) => {
            fsDB
              .insert(entry)
              .then(result => {
                assert.isNumber(
                  result.status,
                  `Result status value should be a 'number'`
                );
                assert.isString(
                  result.msg,
                  `Result msg should be of type 'string'`
                );
                assert.equal(
                  result.status,
                  1,
                  `Has the insert fired successfully?`
                );
                assert.equal(
                  result.msg,
                  `Entry '${entry._uid}' was inserted into content type '${
                    entry._content_type_uid
                  }' of ${entry._locale} language successfully.`,
                  `Do the response messages match?`
                );
                _insertedEntries.push(entry);
                return resolve();
              })
              .catch(error => {
                assert.ifError(error);
                return resolve();
              });
          });
        },
        { concurrency: 1 }
      )
        .then(() => {
          return done();
        })
        .catch(error => {
          assert.ifError(error);
          return done();
        });
    });

    it(`(#18) Insert entries into 'refer_me'`, function(done) {
      Promise.map(
        refer_me,
        entry => {
          return new Promise((resolve, reject) => {
            fsDB
              .insert(entry)
              .then(result => {
                assert.isNumber(
                  result.status,
                  `Result status value should be a 'number'`
                );
                assert.isString(
                  result.msg,
                  `Result msg should be of type 'string'`
                );
                assert.equal(
                  result.status,
                  1,
                  `Has the insert fired successfully?`
                );
                assert.equal(
                  result.msg,
                  `Entry '${entry._uid}' was inserted into content type '${
                    entry._content_type_uid
                  }' of ${entry._locale} language successfully.`,
                  `Do the response messages match?`
                );
                _insertedEntries.push(entry);
                return resolve();
              })
              .catch(error => {
                assert.ifError(error);
                return resolve();
              });
          });
        },
        { concurrency: 1 }
      )
        .then(() => {
          return done();
        })
        .catch(error => {
          assert.ifError(error);
          return done();
        });
    });

    it(`(#19) Fetch entry in 'amul'`, function(done) {
      let e = amul[0];
      fsDB
        .findOne({
          _uid: e._uid,
          _locale: e._locale,
          _content_type_uid: e._content_type_uid,
          _include_references: false
        })
        .then(result => {
          assert.property(result, "entry", `Is the return key 'entry'?`);
          assert.equal(result.entry.uid, e._uid, `Is the uid correct?`);
          assert.equal(
            result.entry.title,
            e._data.title,
            `Is the title correct`
          );
          assert.deepEqual(result.entry, e._data, `Are they deepEquals?`);
          return done();
        })
        .catch(error => {
          assert.ifError(error);
          return done();
        });
    });

    it(`(#20) Find entries in 'amul'`, function(done) {
      fsDB
        .find({
          _locale: "en-us",
          _content_type_uid: "amul",
          _include_references: false
        })
        .then(result => {
          let _i_entries = _.compact(
            _.map(_insertedEntries, entry => {
              if (entry._content_type_uid === "amul") return entry._data;
            })
          );
          assert.property(result, "entries", `Is the return key 'entries'?`);
          assert.isArray(result.entries, `Result should be of type 'Array'`);
          assert.equal(result.entries.length, _i_entries.length);
          _.map(result.entries, entry => {
            let matching_entry = _.find(_i_entries, { uid: entry.uid });
            assert.deepEqual(
              entry,
              matching_entry,
              `Does the inserted entry match that found in 'find()'?`
            );
          });
          return done();
        })
        .catch(error => {
          assert.ifError(error);
          return done();
        });
    });

    it(`(#21) Re-insert entry of 'amul' should fail`, function(done) {
      let _amul_entry = amul[0];
      fsDB
        .insert(_amul_entry)
        .then(result => {
          assert.isNumber(
            result.status,
            `Result status value should be a 'number'`
          );
          assert.isString(result.msg, `Result msg should be of type 'string'`);
          assert.equal(result.status, 0, `Has the insert failed?`);
          assert.equal(
            result.msg,
            `Entry ${_amul_entry._uid} in content type ${
              _amul_entry._content_type_uid
            } exists already in ${
              _amul_entry._locale
            } language. Use upsert instead.`,
            `Do the response messages match?`
          );
          return done();
        })
        .catch(error => {
          assert.ifError(error);
          return done();
        });
    });

    it(`(#22.1) Upsert entry in 'amul'`, function(done) {
      let _amul_entry_u = amul_u[0];
      fsDB
        .upsert(_amul_entry_u)
        .then(result => {
          assert.isNumber(
            result.status,
            `Result status value should be a 'number'`
          );
          assert.isString(result.msg, `Result msg should be of type 'string'`);
          assert.equal(result.status, 1, `Has the insert fired successfully?`);
          assert.equal(
            result.msg,
            `Entry '${_amul_entry_u._uid}' in content type '${_amul_entry_u._content_type_uid}' of ${_amul_entry_u._locale} language has been updated successfully.`,
            `Do the response messages match?`
          );
          let idx = _.findIndex(_insertedEntries, { _uid: _amul_entry_u._uid });
          if (~idx) _insertedEntries.splice(idx, 1, _amul_entry_u);
          else
            assert.notEqual(
              idx,
              -1,
              `Index should not have been -1. Someething's wrong.`
            );
          return done();
        })
        .catch(error => {
          assert.ifError(error);
          return done();
        });
    });

    it(`(#22.2) Insert _routes`, function(done) {
      Promise.map(
        _routes,
        _route => {
          return new Promise((resolve, reject) => {
            fsDB
              .insert(_route)
              .then(result => {
                assert.isNumber(
                  result.status,
                  `Result status value should be a 'number'`
                );
                assert.isString(
                  result.msg,
                  `Result msg should be of type 'string'`
                );
                assert.equal(
                  result.status,
                  0,
                  `Has the routes been created already?`
                );
                assert.equal(
                  result.msg,
                  `Entry ${_route._uid} in content type ${
                    _route._content_type_uid
                  } exists already in ${_route._locale} language. Use upsert instead.`,
                  `Do the response messages match?`
                );

                return resolve();
              })
              .catch(error => {
                assert.ifError(error);
                return resolve();
              });
          });
        },
        { concurrency: 1 }
      )
        .then(() => {
          return done();
        })
        .catch(error => {
          assert.ifError(error);
          return done();
        });
    });
  });

  describe(`#Test Content - Fetch`, function(done) {
    /**
     * The following need to be covered for 'fetch' & 'find'
     * $in, $nin, $exists, $gte, $gt, $lte, $lt, $eq, $ne, $mod, $all, $and, $or, $nor, $not, $size, $type, $regex, $where, $elemMatch
     */
    it(`(#23) Fetch - $in`, function(done) {
      let query, _entries;
      query = {
        _data: {
          multiple_values: {
            $in: [1, 5]
          }
        }
      };
      _entries = sift(query, _insertedEntries);
      if (!_.isEmpty(_entries)) {
        let _random_index = utility.getRandomNumber(0, _entries.length);
        fsDB
          .findOne({
            _uid: _entries[_random_index]._uid,
            _content_type_uid: _entries[_random_index]._content_type_uid,
            _locale: _entries[_random_index]._locale,
            _include_references: false,
            multiple_values: query._data.multiple_values
          })
          .then(result => {
            assert.property(
              result,
              "entry",
              `Does the result have 'entry' property?`
            );
            assert.deepEqual(result.entry, _entries[_random_index]._data);
            return done();
          })
          .catch(error => {
            assert.ifError(error);
            return done();
          });
      } else {
        assert.ifError(
          new Error(
            `Unable to execute '$in'. Use a dataset with 'multiple_values' key OR if issue exists, update current query.`
          )
        );
        return done();
      }
    });

    it(`(#24) Fetch - $nin`, function(done) {
      let query, _entries;
      query = {
        _data: {
          multiple_values: {
            $nin: [1, 5]
          }
        }
      };
      _entries = sift(query, _insertedEntries);
      if (!_.isEmpty(_entries)) {
        let _random_index = utility.getRandomNumber(0, _entries.length);
        fsDB
          .findOne({
            _uid: _entries[_random_index]._uid,
            _content_type_uid: _entries[_random_index]._content_type_uid,
            _locale: _entries[_random_index]._locale,
            _include_references: false,
            multiple_values: query._data.multiple_values
          })
          .then(result => {
            assert.property(
              result,
              "entry",
              `Does the result have 'entry' property?`
            );
            assert.deepEqual(result.entry, _entries[_random_index]._data);
            return done();
          })
          .catch(error => {
            assert.ifError(error);
            return done();
          });
      } else {
        assert.ifError(
          new Error(
            `Unable to execute '$nin'. Use a dataset with 'multiple_values' key OR if issue exists, update current query.`
          )
        );
        return done();
      }
    });

    it(`(#25) Fetch - $gte`, function(done) {
      let query, _entries;
      query = {
        _data: {
          multiple_values: {
            $gte: 10
          }
        }
      };
      _entries = sift(query, _insertedEntries);
      if (!_.isEmpty(_entries)) {
        let _random_index = utility.getRandomNumber(0, _entries.length);
        fsDB
          .findOne({
            _uid: _entries[_random_index]._uid,
            _content_type_uid: _entries[_random_index]._content_type_uid,
            _locale: _entries[_random_index]._locale,
            _include_references: false,
            multiple_values: query._data.multiple_values
          })
          .then(result => {
            assert.property(
              result,
              "entry",
              `Does the result have 'entry' property?`
            );
            assert.deepEqual(result.entry, _entries[_random_index]._data);
            return done();
          })
          .catch(error => {
            assert.ifError(error);
            return done();
          });
      } else {
        assert.ifError(
          new Error(
            `Unable to execute '$gte'. Use a dataset with 'multiple_values' key OR if issue exists, update current query.`
          )
        );
        return done();
      }
    });

    it(`(#26) Fetch - $gt`, function(done) {
      let query, _entries;
      query = {
        _data: {
          multiple_values: {
            $gt: 10
          }
        }
      };
      _entries = sift(query, _insertedEntries);
      if (!_.isEmpty(_entries)) {
        let _random_index = utility.getRandomNumber(0, _entries.length);
        fsDB
          .findOne({
            _uid: _entries[_random_index]._uid,
            _content_type_uid: _entries[_random_index]._content_type_uid,
            _locale: _entries[_random_index]._locale,
            _include_references: false,
            multiple_values: query._data.multiple_values
          })
          .then(result => {
            assert.property(
              result,
              "entry",
              `Does the result have 'entry' property?`
            );
            assert.deepEqual(result.entry, _entries[_random_index]._data);
            return done();
          })
          .catch(error => {
            assert.ifError(error);
            return done();
          });
      } else {
        assert.ifError(
          new Error(
            `Unable to execute '$gt'. Use a dataset with 'multiple_values' key OR if issue exists, update current query.`
          )
        );
        return done();
      }
    });

    it(`(#27) Fetch - $lte`, function(done) {
      let query, _entries;
      query = {
        _data: {
          multiple_values: {
            $lte: 10
          }
        }
      };
      _entries = sift(query, _insertedEntries);
      if (!_.isEmpty(_entries)) {
        let _random_index = utility.getRandomNumber(0, _entries.length);
        fsDB
          .findOne({
            _uid: _entries[_random_index]._uid,
            _content_type_uid: _entries[_random_index]._content_type_uid,
            _locale: _entries[_random_index]._locale,
            _include_references: false,
            multiple_values: query._data.multiple_values
          })
          .then(result => {
            assert.property(
              result,
              "entry",
              `Does the result have 'entry' property?`
            );
            assert.deepEqual(result.entry, _entries[_random_index]._data);
            return done();
          })
          .catch(error => {
            assert.ifError(error);
            return done();
          });
      } else {
        assert.ifError(
          new Error(
            `Unable to execute '$lte'. Use a dataset with 'multiple_values' key OR if issue exists, update current query.`
          )
        );
        return done();
      }
    });

    it(`(#28) Fetch - $lt`, function(done) {
      let query, _entries;
      query = {
        _data: {
          multiple_values: {
            $lt: 10
          }
        }
      };
      _entries = sift(query, _insertedEntries);
      if (!_.isEmpty(_entries)) {
        let _random_index = utility.getRandomNumber(0, _entries.length);
        fsDB
          .findOne({
            _uid: _entries[_random_index]._uid,
            _content_type_uid: _entries[_random_index]._content_type_uid,
            _locale: _entries[_random_index]._locale,
            _include_references: false,
            multiple_values: query._data.multiple_values
          })
          .then(result => {
            assert.property(
              result,
              "entry",
              `Does the result have 'entry' property?`
            );
            assert.deepEqual(result.entry, _entries[_random_index]._data);
            return done();
          })
          .catch(error => {
            assert.ifError(error);
            return done();
          });
      } else {
        assert.ifError(
          new Error(
            `Unable to execute '$lt'. Use a dataset with 'multiple_values' key OR if issue exists, update current query.`
          )
        );
        return done();
      }
    });

    it(`(#29) Fetch - $eq`, function(done) {
      let query, _entries;
      query = {
        _data: {
          multiple_values: {
            $eq: 13
          }
        }
      };
      _entries = sift(query, _insertedEntries);
      if (!_.isEmpty(_entries)) {
        let _random_index = utility.getRandomNumber(0, _entries.length);
        fsDB
          .findOne({
            _uid: _entries[_random_index]._uid,
            _content_type_uid: _entries[_random_index]._content_type_uid,
            _locale: _entries[_random_index]._locale,
            _include_references: false,
            multiple_values: query._data.multiple_values
          })
          .then(result => {
            assert.property(
              result,
              "entry",
              `Does the result have 'entry' property?`
            );
            assert.deepEqual(result.entry, _entries[_random_index]._data);
            return done();
          })
          .catch(error => {
            assert.ifError(error);
            return done();
          });
      } else {
        assert.ifError(
          new Error(
            `Unable to execute '$eq'. Use a dataset with 'multiple_values' key OR if issue exists, update current query.`
          )
        );
        return done();
      }
    });

    it(`(#30) Fetch - $ne`, function(done) {
      let query, _entries;
      query = {
        _data: {
          multiple_values: {
            $ne: 13
          }
        }
      };
      _entries = sift(query, _insertedEntries);
      if (!_.isEmpty(_entries)) {
        let _random_index = utility.getRandomNumber(0, _entries.length);
        fsDB
          .findOne({
            _uid: _entries[_random_index]._uid,
            _content_type_uid: _entries[_random_index]._content_type_uid,
            _locale: _entries[_random_index]._locale,
            _include_references: false,
            multiple_values: query._data.multiple_values
          })
          .then(result => {
            assert.property(
              result,
              "entry",
              `Does the result have 'entry' property?`
            );
            assert.deepEqual(result.entry, _entries[_random_index]._data);
            return done();
          })
          .catch(error => {
            assert.ifError(error);
            return done();
          });
      } else {
        assert.ifError(
          new Error(
            `Unable to execute '$ne'. Use a dataset with 'multiple_values' key OR if issue exists, update current query.`
          )
        );
        return done();
      }
    });

    it(`(#31) Fetch - $all`, function(done) {
      let query, _entries;
      query = {
        _data: {
          multiple_values: {
            $all: [1, 2, 3]
          }
        }
      };
      _entries = sift(query, _insertedEntries);
      if (!_.isEmpty(_entries)) {
        let _random_index = utility.getRandomNumber(0, _entries.length);
        fsDB
          .findOne({
            _uid: _entries[_random_index]._uid,
            _content_type_uid: _entries[_random_index]._content_type_uid,
            _locale: _entries[_random_index]._locale,
            _include_references: false,
            multiple_values: query._data.multiple_values
          })
          .then(result => {
            assert.property(
              result,
              "entry",
              `Does the result have 'entry' property?`
            );
            assert.deepEqual(result.entry, _entries[_random_index]._data);
            return done();
          })
          .catch(error => {
            assert.ifError(error);
            return done();
          });
      } else {
        assert.ifError(
          new Error(
            `Unable to execute '$all'. Use a dataset with 'multiple_values' key OR if issue exists, update current query.`
          )
        );
        return done();
      }
    });

    it(`(#32) Fetch - $and`, function(done) {
      let query, _entries, _random_index;
      _entries = _.cloneDeep(_insertedEntries);
      _random_index = utility.getRandomNumber(0, _entries.length);
      query = {
        _data: {
          $and: [
            {
              title: _entries[_random_index]._data.title
            },
            {
              uid: _entries[_random_index]._data.uid
            }
          ]
        }
      };
      if (!_.isEmpty(_entries)) {
        fsDB
          .findOne({
            _uid: _entries[_random_index]._uid,
            _content_type_uid: _entries[_random_index]._content_type_uid,
            _locale: _entries[_random_index]._locale,
            _include_references: false,
            $and: query._data["$and"]
          })
          .then(result => {
            assert.property(
              result,
              "entry",
              `Does the result have 'entry' property?`
            );
            assert.deepEqual(result.entry, _entries[_random_index]._data);
            return done();
          })
          .catch(error => {
            assert.ifError(error);
            return done();
          });
      } else {
        assert.ifError(
          new Error(
            `Unable to execute '$and'. Use a dataset with 'multiple_values' key OR if issue exists, update current query.`
          )
        );
        return done();
      }
    });

    it(`(#33) Fetch - $or`, function(done) {
      let query, _entries, _random_index;
      _entries = _.cloneDeep(_insertedEntries);
      _random_index = utility.getRandomNumber(0, _entries.length);
      query = {
        _data: {
          $or: [
            {
              title: _entries[_random_index]._data.title
            },
            {
              uid: "dummy_uid"
            }
          ]
        }
      };
      if (!_.isEmpty(_entries)) {
        fsDB
          .findOne({
            _uid: _entries[_random_index]._uid,
            _content_type_uid: _entries[_random_index]._content_type_uid,
            _locale: _entries[_random_index]._locale,
            _include_references: false,
            $or: query._data["$or"]
          })
          .then(result => {
            assert.property(
              result,
              "entry",
              `Does the result have 'entry' property?`
            );
            assert.deepEqual(result.entry, _entries[_random_index]._data);
            return done();
          })
          .catch(error => {
            assert.ifError(error);
            return done();
          });
      } else {
        assert.ifError(
          new Error(
            `Unable to execute '$or'. Use a dataset with 'multiple_values' key OR if issue exists, update current query.`
          )
        );
        return done();
      }
    });

    it(`(#34) Fetch - $nor`, function(done) {
      let query, _entries, _random_index;
      _entries = _.cloneDeep(_insertedEntries);
      _random_index = utility.getRandomNumber(0, _entries.length);
      query = {
        _data: {
          $nor: [
            {
              title: _entries[_random_index]._data.title
            },
            {
              uid: _entries[_random_index]._data.uid
            }
          ]
        }
      };
      if (!_.isEmpty(_entries)) {
        fsDB
          .findOne({
            _uid: _entries[_random_index]._uid,
            _content_type_uid: _entries[_random_index]._content_type_uid,
            _locale: _entries[_random_index]._locale,
            _include_references: false,
            $nor: query._data["$nor"]
          })
          .then(result => {
            assert.property(
              result,
              "entry",
              `Does the result have 'entry' property?`
            );
            assert.deepEqual(result.entry, {});
            return done();
          })
          .catch(error => {
            assert.ifError(error);
            return done();
          });
      } else {
        assert.ifError(
          new Error(
            `Unable to execute '$nor'. Use a dataset with 'multiple_values' key OR if issue exists, update current query.`
          )
        );
        return done();
      }
    });

    // Implementation pending
    // it(`(#34) Fetch - $regex`, function (done) {});
    it(`(#35) Fetch - $where`, function(done) {
      let query, _entries, _random_index;
      _entries = _.cloneDeep(_insertedEntries);
      _random_index = utility.getRandomNumber(0, _entries.length);

      query = {
        _data: {
          $where: function() {
            return this.title === _entries[_random_index]._data.title;
          }
        }
      };

      if (!_.isEmpty(_entries)) {
        fsDB
          .findOne({
            _uid: _entries[_random_index]._uid,
            _content_type_uid: _entries[_random_index]._content_type_uid,
            _locale: _entries[_random_index]._locale,
            _include_references: false,
            $where: query._data["$where"]
          })
          .then(result => {
            assert.property(
              result,
              "entry",
              `Does the result have 'entry' property?`
            );
            assert.deepEqual(result.entry, _entries[_random_index]._data);
            return done();
          })
          .catch(error => {
            assert.ifError(error);
            return done();
          });
      } else {
        assert.ifError(
          new Error(
            `Unable to execute '$where'. Use a dataset with 'multiple_values' key OR if issue exists, update current query.`
          )
        );
        return done();
      }
    });
    // it(`(#36) Fetch - $elemMatch`, function (done) {});
  });

  describe(`#Test Content - Find`, function(done) {
    /**
     * The following need to be covered for 'fetch' & 'find'
     * $in, $nin, $exists, $gte, $gt, $lte, $lt, $eq, $ne, $mod, $all, $and, $or, $nor, $not, $size, $type, $regex, $where, $elemMatch
     */
    it(`(#37) Find - $in`, function(done) {
      let query, _entries;
      query = {
        _data: {
          multiple_values: {
            $in: [1, 5]
          }
        }
      };
      _entries = sift(query, _insertedEntries);
      if (!_.isEmpty(_entries)) {
        fsDB
          .find(
            {
              _content_type_uid: _entries[0]._content_type_uid,
              _locale: _entries[0]._locale,
              _include_references: false,
              multiple_values: query._data.multiple_values
            },
            {}
          )
          .then(result => {
            _entries = _.map(_entries, "_data");
            assert.property(
              result,
              "entries",
              `Does the result have 'entry' property?`
            );
            assert.isArray(
              result.entries,
              `Is the result key 'entries' an array?`
            );
            _.map(result.entries, entry => {
              let _entry = _.find(_entries, { uid: entry.uid });
              assert.deepEqual(entry, _entry, `Do the entry match deeply..?`);
            });
            return done();
          })
          .catch(error => {
            assert.ifError(error);
            return done();
          });
      } else {
        assert.ifError(
          new Error(
            `Unable to execute '$in'. Use a dataset with 'multiple_values' key OR if issue exists, update current query.`
          )
        );
        return done();
      }
    });

    it(`(#38) Find - $nin`, function(done) {
      let query, _entries;
      query = {
        _data: {
          multiple_values: {
            $nin: [1, 5]
          }
        }
      };
      _entries = sift(query, _insertedEntries);
      if (!_.isEmpty(_entries)) {
        fsDB
          .find(
            {
              _content_type_uid: _entries[0]._content_type_uid,
              _locale: _entries[0]._locale,
              _include_references: false,
              multiple_values: query._data.multiple_values
            },
            {}
          )
          .then(result => {
            _entries = _.map(_entries, "_data");
            assert.property(
              result,
              "entries",
              `Does the result have 'entry' property?`
            );
            assert.isArray(
              result.entries,
              `Is the result key 'entries' an array?`
            );
            _.map(result.entries, entry => {
              let _entry = _.find(_entries, { uid: entry.uid });
              assert.deepEqual(entry, _entry, `Do the entry match deeply..?`);
            });
            return done();
          })
          .catch(error => {
            assert.ifError(error);
            return done();
          });
      } else {
        assert.ifError(
          new Error(
            `Unable to execute '$nin'. Use a dataset with 'multiple_values' key OR if issue exists, update current query.`
          )
        );
        return done();
      }
    });

    it(`(#39) Find - $gte`, function(done) {
      let query, _entries;
      query = {
        _data: {
          multiple_values: {
            $gte: 5
          }
        }
      };
      _entries = sift(query, _insertedEntries);
      if (!_.isEmpty(_entries)) {
        fsDB
          .find(
            {
              _content_type_uid: _entries[0]._content_type_uid,
              _locale: _entries[0]._locale,
              _include_references: false,
              multiple_values: query._data.multiple_values
            },
            {}
          )
          .then(result => {
            _entries = _.map(_entries, "_data");
            assert.property(
              result,
              "entries",
              `Does the result have 'entry' property?`
            );
            assert.isArray(
              result.entries,
              `Is the result key 'entries' an array?`
            );
            _.map(result.entries, entry => {
              let _entry = _.find(_entries, { uid: entry.uid });
              assert.deepEqual(entry, _entry, `Do the entry match deeply..?`);
            });
            return done();
          })
          .catch(error => {
            assert.ifError(error);
            return done();
          });
      } else {
        assert.ifError(
          new Error(
            `Unable to execute '$gte'. Use a dataset with 'multiple_values' key OR if issue exists, update current query.`
          )
        );
        return done();
      }
    });

    it(`(#40) Find - $gt`, function(done) {
      let query, _entries;
      query = {
        _data: {
          multiple_values: {
            $gt: 5
          }
        }
      };
      _entries = sift(query, _insertedEntries);
      if (!_.isEmpty(_entries)) {
        fsDB
          .find(
            {
              _content_type_uid: _entries[0]._content_type_uid,
              _locale: _entries[0]._locale,
              _include_references: false,
              multiple_values: query._data.multiple_values
            },
            {}
          )
          .then(result => {
            _entries = _.map(_entries, "_data");
            assert.property(
              result,
              "entries",
              `Does the result have 'entry' property?`
            );
            assert.isArray(
              result.entries,
              `Is the result key 'entries' an array?`
            );
            _.map(result.entries, entry => {
              let _entry = _.find(_entries, { uid: entry.uid });
              assert.deepEqual(entry, _entry, `Do the entry match deeply..?`);
            });
            return done();
          })
          .catch(error => {
            assert.ifError(error);
            return done();
          });
      } else {
        assert.ifError(
          new Error(
            `Unable to execute '$gt'. Use a dataset with 'multiple_values' key OR if issue exists, update current query.`
          )
        );
        return done();
      }
    });

    it(`(#41) Find - $lte`, function(done) {
      let query, _entries;
      query = {
        _data: {
          multiple_values: {
            $lte: 9
          }
        }
      };
      _entries = sift(query, _insertedEntries);
      if (!_.isEmpty(_entries)) {
        fsDB
          .find(
            {
              _content_type_uid: _entries[0]._content_type_uid,
              _locale: _entries[0]._locale,
              _include_references: false,
              multiple_values: query._data.multiple_values
            },
            {}
          )
          .then(result => {
            _entries = _.map(_entries, "_data");
            assert.property(
              result,
              "entries",
              `Does the result have 'entry' property?`
            );
            assert.isArray(
              result.entries,
              `Is the result key 'entries' an array?`
            );
            _.map(result.entries, entry => {
              let _entry = _.find(_entries, { uid: entry.uid });
              assert.deepEqual(entry, _entry, `Do the entry match deeply..?`);
            });
            return done();
          })
          .catch(error => {
            assert.ifError(error);
            return done();
          });
      } else {
        assert.ifError(
          new Error(
            `Unable to execute '$lte'. Use a dataset with 'multiple_values' key OR if issue exists, update current query.`
          )
        );
        return done();
      }
    });

    it(`(#42) Find - $lt`, function(done) {
      let query, _entries;
      query = {
        _data: {
          multiple_values: {
            $lt: 9
          }
        }
      };
      _entries = sift(query, _insertedEntries);
      if (!_.isEmpty(_entries)) {
        fsDB
          .find(
            {
              _content_type_uid: _entries[0]._content_type_uid,
              _locale: _entries[0]._locale,
              _include_references: false,
              multiple_values: query._data.multiple_values
            },
            {}
          )
          .then(result => {
            _entries = _.map(_entries, "_data");
            assert.property(
              result,
              "entries",
              `Does the result have 'entry' property?`
            );
            assert.isArray(
              result.entries,
              `Is the result key 'entries' an array?`
            );
            _.map(result.entries, entry => {
              let _entry = _.find(_entries, { uid: entry.uid });
              assert.deepEqual(entry, _entry, `Do the entry match deeply..?`);
            });
            return done();
          })
          .catch(error => {
            assert.ifError(error);
            return done();
          });
      } else {
        assert.ifError(
          new Error(
            `Unable to execute '$lt'. Use a dataset with 'multiple_values' key OR if issue exists, update current query.`
          )
        );
        return done();
      }
    });

    it(`(#43) Find - $eq`, function(done) {
      let query, _entries;
      query = {
        _data: {
          multiple_values: {
            $eq: 1
          }
        }
      };
      _entries = sift(query, _insertedEntries);
      if (!_.isEmpty(_entries)) {
        fsDB
          .find(
            {
              _content_type_uid: _entries[0]._content_type_uid,
              _locale: _entries[0]._locale,
              _include_references: false,
              multiple_values: query._data.multiple_values
            },
            {}
          )
          .then(result => {
            _entries = _.map(_entries, "_data");
            assert.property(
              result,
              "entries",
              `Does the result have 'entry' property?`
            );
            assert.isArray(
              result.entries,
              `Is the result key 'entries' an array?`
            );
            _.map(result.entries, entry => {
              let _entry = _.find(_entries, { uid: entry.uid });
              assert.deepEqual(entry, _entry, `Do the entry match deeply..?`);
            });
            return done();
          })
          .catch(error => {
            assert.ifError(error);
            return done();
          });
      } else {
        assert.ifError(
          new Error(
            `Unable to execute '$eq'. Use a dataset with 'multiple_values' key OR if issue exists, update current query.`
          )
        );
        return done();
      }
    });

    it(`(#44) Find - $ne`, function(done) {
      let query, _entries;
      query = {
        _data: {
          multiple_values: {
            $ne: 1
          }
        }
      };
      _entries = sift(query, _insertedEntries);

      if (!_.isEmpty(_entries)) {
        fsDB
          .find(
            {
              _content_type_uid: _entries[0]._content_type_uid,
              _locale: _entries[0]._locale,
              _include_references: false,
              multiple_values: query._data.multiple_values
            },
            {}
          )
          .then(result => {
            _entries = _.map(_entries, "_data");
            assert.property(
              result,
              "entries",
              `Does the result have 'entry' property?`
            );
            assert.isArray(
              result.entries,
              `Is the result key 'entries' an array?`
            );
            _.map(result.entries, entry => {
              let _entry = _.find(_entries, { uid: entry.uid });
              assert.deepEqual(entry, _entry, `Do the entry match deeply..?`);
            });
            return done();
          })
          .catch(error => {
            assert.ifError(error);
            return done();
          });
      } else {
        assert.ifError(
          new Error(
            `Unable to execute '$lt'. Use a dataset with 'multiple_values' key OR if issue exists, update current query.`
          )
        );
        return done();
      }
    });

    it(`(#45) Find - $all`, function(done) {
      let query, _entries;
      query = {
        _data: {
          multiple_values: {
            $all: [1, 2, 3]
          }
        }
      };
      _entries = sift(query, _insertedEntries);

      if (!_.isEmpty(_entries)) {
        fsDB
          .find(
            {
              _content_type_uid: _entries[0]._content_type_uid,
              _locale: _entries[0]._locale,
              _include_references: false,
              multiple_values: query._data.multiple_values
            },
            {}
          )
          .then(result => {
            _entries = _.map(_entries, "_data");
            assert.property(
              result,
              "entries",
              `Does the result have 'entry' property?`
            );
            assert.isArray(
              result.entries,
              `Is the result key 'entries' an array?`
            );
            _.map(result.entries, entry => {
              let _entry = _.find(_entries, { uid: entry.uid });
              assert.deepEqual(entry, _entry, `Do the entry match deeply..?`);
            });
            return done();
          })
          .catch(error => {
            assert.ifError(error);
            return done();
          });
      } else {
        assert.ifError(
          new Error(
            `Unable to execute '$lt'. Use a dataset with 'multiple_values' key OR if issue exists, update current query.`
          )
        );
        return done();
      }
    });

    it(`(#46) Find - $and`, function(done) {
      let query, _entries, _random_index;
      _entries = _.cloneDeep(_insertedEntries);
      _random_index = utility.getRandomNumber(0, _entries.length);
      query = {
        _data: {
          $and: [
            {
              title: _entries[_random_index]._data.title
            },
            {
              uid: _entries[_random_index]._data.uid
            }
          ]
        }
      };
      if (!_.isEmpty(_entries)) {
        fsDB
          .find(
            {
              _content_type_uid: _entries[_random_index]._content_type_uid,
              _locale: _entries[_random_index]._locale,
              _include_references: false,
              $and: query._data["$and"]
            },
            {}
          )
          .then(result => {
            assert.property(
              result,
              "entries",
              `Does the result have 'entries' property?`
            );
            assert.isArray(
              result.entries,
              `Is the result key 'entries' of type Array?`
            );
            assert.lengthOf(result.entries, 1);
            assert.deepEqual(result.entries[0], _entries[_random_index]._data);
            return done();
          })
          .catch(error => {
            assert.ifError(error);
            return done();
          });
      } else {
        assert.ifError(
          new Error(
            `Unable to execute '$and'. Use a dataset with 'multiple_values' key OR if issue exists, update current query.`
          )
        );
        return done();
      }
    });

    it(`(#47) Find - $or`, function(done) {
      let query, _entries, _random_index;
      _entries = _.cloneDeep(_insertedEntries);
      _random_index = utility.getRandomNumber(0, _entries.length);
      query = {
        _data: {
          $or: [
            {
              title: _entries[_random_index]._data.title
            },
            {
              uid: "_dummy_uid_bltxyz"
            }
          ]
        }
      };
      if (!_.isEmpty(_entries)) {
        fsDB
          .find(
            {
              _content_type_uid: _entries[_random_index]._content_type_uid,
              _locale: _entries[_random_index]._locale,
              _include_references: false,
              $or: query._data["$or"]
            },
            {}
          )
          .then(result => {
            assert.property(
              result,
              "entries",
              `Does the result have 'entries' property?`
            );
            assert.isArray(
              result.entries,
              `Is the result key 'entries' of type Array?`
            );
            assert.lengthOf(result.entries, 1);
            assert.deepEqual(result.entries[0], _entries[_random_index]._data);
            return done();
          })
          .catch(error => {
            assert.ifError(error);
            return done();
          });
      } else {
        assert.ifError(
          new Error(
            `Unable to execute '$or'. Use a dataset with 'multiple_values' key OR if issue exists, update current query.`
          )
        );
        return done();
      }
    });

    it(`(#48) Find - $nor`, function(done) {
      let query, _entries, _random_index;
      _entries = _.cloneDeep(_insertedEntries);
      _random_index = utility.getRandomNumber(0, _entries.length);
      query = {
        _data: {
          $nor: [
            {
              title: _entries[_random_index]._data.title
            },
            {
              uid: _entries[_random_index]._data.uid
            }
          ]
        }
      };
      if (!_.isEmpty(_entries)) {
        fsDB
          .find(
            {
              _content_type_uid: _entries[_random_index]._content_type_uid,
              _locale: _entries[_random_index]._locale,
              _include_references: false,
              $nor: query._data["$nor"]
            },
            {}
          )
          .then(result => {
            _.remove(_entries, entry => {
              if (
                entry._content_type_uid !==
                _entries[_random_index]._content_type_uid
              )
                return entry;
            });
            _entries = _.map(sift(query, _entries), "_data");
            assert.property(
              result,
              "entries",
              `Does the result have 'entries' property?`
            );
            assert.isArray(
              result.entries,
              `Is the result key 'entries' of type Array?`
            );
            assert.lengthOf(
              result.entries,
              _entries.length,
              `Do their lengths match?`
            );
            _.map(result.entries, entry => {
              let _entry = _.find(_entries, { uid: entry.uid });
              assert.deepEqual(entry, _entry, `Do the entry match deeply..?`);
            });
            return done();
          })
          .catch(error => {
            assert.ifError(error);
            return done();
          });
      } else {
        assert.ifError(
          new Error(
            `Unable to execute '$nor'. Use a dataset with 'multiple_values' key OR if issue exists, update current query.`
          )
        );
        return done();
      }
    });

    // Implementation pending
    // it(`(#34) Fetch - $regex`, function (done) {});
    it(`(#49) Fetch - $where`, function(done) {
      let query, _entries, _random_index;
      _entries = _.cloneDeep(_insertedEntries);
      _random_index = utility.getRandomNumber(0, _entries.length);

      query = {
        _data: {
          $where: function() {
            return this.title === _entries[_random_index]._data.title;
          }
        }
      };

      if (!_.isEmpty(_entries)) {
        fsDB
          .findOne({
            _uid: _entries[_random_index]._uid,
            _content_type_uid: _entries[_random_index]._content_type_uid,
            _locale: _entries[_random_index]._locale,
            _include_references: false,
            $where: query._data["$where"]
          })
          .then(result => {
            assert.property(
              result,
              "entry",
              `Does the result have 'entry' property?`
            );
            assert.deepEqual(result.entry, _entries[_random_index]._data);
            return done();
          })
          .catch(error => {
            assert.ifError(error);
            return done();
          });
      } else {
        assert.ifError(
          new Error(
            `Unable to execute '$where'. Use a dataset with 'multiple_values' key OR if issue exists, update current query.`
          )
        );
        return done();
      }
    });
    // it(`(#36) Fetch - $elemMatch`, function (done) {});
  });

  describe(`#Test content-management - Remove`, function() {
    it(`(#51.1) Remove - entry`, function(done) {
      let _random_index = utility.getRandomNumber(0, _insertedEntries.length);
      let _removed_entry = _insertedEntries.splice(_random_index, 1)[0];

      fsDB
        .remove({
          _uid: _removed_entry._uid,
          _locale: _removed_entry._locale,
          _content_type_uid: _removed_entry._content_type_uid
        })
        .then(result => {
          assert.property(result, "status", `Does the result have 'status'?`);
          assert.property(result, "msg", `Does the result have 'msg'?`);
          assert.equal(result.status, 1, `Was the entry removed successfully?`);
          assert.equal(
            result.msg,
            `Entry ${_removed_entry._uid} of ${
              _removed_entry._content_type_uid
            } in ${_removed_entry._locale} was removed successfully.`
          );
          _removedEntries.push(_removed_entry);
          return done();
        })
        .catch(error => {
          assert.ifError(error);
          return done();
        });
    });

    it(`(#51.2) Look for removed entry`, function(done) {
      fsDB
        .findOne({
          _uid: _removedEntries[0]._uid,
          _content_type_uid: _removedEntries[0]._content_type_uid,
          _locale: _removedEntries[0]._locale
        })
        .then(result => {
          assert.property(result, "entry", `Does the result have 'entry' key?`);
          assert.isObject(result.entry, `Is the result.entry of type Object?`);
          assert.isEmpty(result.entry);
          return done();
        })
        .catch(error => {
          assert.ifError(error);
          return done();
        });
    });

    it(`(#52.3) Remove - Content Type`, function(done) {
      let _random_index = utility.getRandomNumber(
        0,
        _insertedContentTypes.length
      );
      let _removed_entry = _insertedContentTypes.splice(_random_index, 1)[0];

      _removedContentTypes.push(_removed_entry);
      tmp.push(_removed_entry);
      fsDB
        .remove({
          _uid: _removed_entry._uid,
          _locale: _removed_entry._locale,
          _content_type_uid: _removed_entry._content_type_uid
        })
        .then(result => {
          assert.property(result, "status", `Does the result have 'status'?`);
          assert.property(result, "msg", `Does the result have 'msg'?`);
          assert.equal(
            result.status,
            1,
            `Was the content type removed successfully?`
          );
          assert.equal(
            result.msg,
            `Entries of ${
              _removed_entry._uid
            } were removed successfully.\nRoutes of ${
              _removed_entry._uid
            } in en-us language were removed successfully.\nContent type ${
              _removed_entry._uid
            } in en-us was removed successfully.`
          );
          return done();
        })
        .catch(error => {
          assert.ifError(error);
          return done();
        });
    });

    it(`(#52.4) Find - entries of deleted content type`, function(done) {
      fsDB
        .find(
          {
            _locale: tmp[0]._locale,
            _content_type_uid: tmp[0]._uid
          },
          {}
        )
        .then(result => {
          assert.ok(0, `This block should not have executed!`);
          return done();
        })
        .catch(error => {
          assert.property(error, "errno", `Does the error have 'errorno' key?`);
          assert.property(error, "code", `Does the error have 'code' key?`);
          assert.equal(error.errno, -2, `Do the 'errno' match?`);
          assert.equal(error.code, `ENOENT`, `Do the error code match?`);
          return done();
        });
    });
  });
  // describe(`#Test Entries - Find`, function () {});
  // describe(`#Test Entries - Remove`, function () {});
  // describe(`#Test Entries - Count`, function () {});

  after(function(done) {
    let contentPath = config.get("path.storage");
    console.log(`Running cleanup @${contentPath}`);
    if (fs.existsSync(contentPath)) {
      rimraf.sync(contentPath);
      console.log(`DB contents cleaned successfully!`);
      return done();
    } else {
      console.info(`Unable to find DB path : ${contentPath}`);
      return done();
    }
  });
});
