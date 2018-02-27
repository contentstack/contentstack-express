const assert = require("chai").assert,
  _ = require("lodash"),
  fs = require("fs"),
  Promise = require("bluebird"),
  rimraf = require("rimraf"),
  sift = require("sift");

const utility = require("./utility");

let QueryBuilder = {},
  config = {},
  amul = [],
  _schemas = [],
  _routes = [],
  ref_references = [],
  refer_me = [],
  u_amul = [],
  u_schemas = [],
  u_routes = [],
  u_ref_references = [],
  u_refer_me = [],
  tmp = [];

let _insertedContentTypes = [],
  _insertedEntries = [],
  _removedEntries = [],
  _removedContentTypes = [];

describe(`Test Contentstack Provider's QueryBuilder`, function() {
  // TODO: Add this suite to 'before'
  describe(`Run init cases (Sanity)`, function() {
    it(`(#1) Load QueryBuilder instance`, function() {
      QueryBuilder = require("../lib/QueryBuilder");
      QueryBuilder = new QueryBuilder();
      config = require("../lib/config");
    });
    it(`(#2) Load required content instance for QueryBuilder`, function() {
      amul = require("./data/en-us/data/amul");
      _schemas = require("./data/en-us/data/_content_types");
      _routes = require("./data/en-us/data/_routes");
      ref_references = require("./data/en-us/data/ref_references");
      refer_me = require("./data/en-us/data/refer_me");

      u_amul = require("./data_upsert/en-us/data/amul");
      u_schemas = require("./data_upsert/en-us/data/_content_types");
      u_routes = require("./data_upsert/en-us/data/_routes");
      u_ref_references = require("./data_upsert/en-us/data/ref_references");
      u_refer_me = require("./data_upsert/en-us/data/refer_me");
    });
  });

  describe(`QueryBuilder - Basic functionality`, function () {
    this.timeout(5000);
    describe(`Test querybuilder functionality on entries`, function() {
      it(`(#3) QueryBuilder - entry insert`, function(done) {
        QueryBuilder.ContentType(amul[0]._content_type_uid)
          .language(amul[0]._locale)
          .Entry(amul[0]._uid)
          .insert(amul[0]._data)
          .then(result => {
            assert.property(result, "status", `Does the response have 'status' key?`);
            assert.property(result, "msg", `Does the response have 'status' key?`);
            assert.equal(result.status, 1, `Has the asset been inserted successfully?`);
            assert.equal(result.msg, `Entry '${amul[0]._uid}' was inserted into Content type '${amul[0]._content_type_uid}' of en-us language successfully.`)
            return done();
          })
          .catch(error => {
            console.error(error);
            return done();
          });
      });
      // it(`(#4) QueryBuilder - entry fetch`, function(done) {
      //   QueryBuilder.ContentType(amul[0]._content_type_uid)
      //     .language(amul[0]._locale)
      //     .Entry(amul[0]._uid)
      //     .fetch()
      //     .then(result => {
      //       console.log('@QB fetch result -', JSON.stringify(result));
      //       assert.property(result, 'entry', `Does the result have 'entry' key?`);
      //       assert.isObject(result.entry, `Is the result.entry of type 'Object'?`);
      //       assert.isNotEmpty(result.entry, `Result should not be empty.`);
      //       // TODO: need to update so as to match keys
      //       // assert.deepEqual(result.entry, amul[0]._data, `Entry should deep equal`);
      //       return done();
      //     })
      //     .catch(error => {
      //       console.error(error);
      //       return done();
      //     });
      // });
      // it(`(#5) QueryBuilder - entry find`, function (done) {
      //   QueryBuilder.ContentType(amul[0]._content_type_uid)
      //     .language(amul[0]._locale)
      //     .find()
      //     .then(result => {
      //       console.log('@QB find result -', JSON.stringify(result));
      //       assert.property(result, 'entry', `Does the result have 'entry' key?`);
      //       assert.isObject(result.entry, `Is the result.entry of type 'Object'?`);
      //       assert.isNotEmpty(result.entry, `Result should not be empty.`);
      //       // TODO: need to update so as to match keys
      //       assert.deepEqual(result.entry, amul[0]._data, `Entry should deep equal`);
      //       return done();
      //     })
      //     .catch(error => {
      //       console.error(error);
      //       return done();
      //     });
      // });
      
      it(`(#6) QueryBuilder - entry find - excludeReference`, function (done) {
        QueryBuilder.ContentType(amul[0]._content_type_uid)
          .language(amul[0]._locale)
          .excludeReference()
          .find()
          .then(result => {
            assert.property(result, 'entries', `Does the result have 'entry' key?`);
            assert.isArray(result.entries, `Is the result.entry of type 'Array'?`);
            assert.isNotEmpty(result.entries, `Result should not be empty.`);
            // TODO: need to update so as to match keys
            assert.deepEqual(result.entries[0], amul[0]._data, `Entry should deep equal`);
            return done();
          })
          .catch(error => {
            console.error(error);
            return done();
          });
      });

      it(`(#7) QueryBuilder - upsert entry`, function (done) {
        QueryBuilder.ContentType(u_amul[0]._content_type_uid)
          .Entry(u_amul[0]._uid)
          .language(u_amul[0]._locale)
          .upsert(u_amul[0]._data)
          .then(result => {
            assert.property(result, "status", `Does the response have 'status' key?`);
            assert.property(result, "msg", `Does the response have 'status' key?`);
            assert.equal(result.status, 1, `Has the asset been inserted successfully?`);
            assert.equal(result.msg, `Entry '${u_amul[0]._uid}' in Content type '${u_amul[0]._content_type_uid}' of ${u_amul[0]._locale} language has been updated successfully.`)
            return done();
          })
          .catch(error => {
            assert.ifError(error);
            return done();
          });
      });      

      it(`(#8) QueryBuilder - fetch updated entry - excludeReference`, function (done) {
        QueryBuilder.ContentType(u_amul[0]._content_type_uid)
          .Entry(u_amul[0]._content_type_uid)
          .language(u_amul[0]._locale)
          .excludeReference()
          .toJSON()
          .fetch()
          .then(result => {
            assert.property(result, 'entry', `Does the result have 'entry' key?`);
            assert.isObject(result.entry, `Is the result.entry of type 'Object'?`);
            assert.isNotEmpty(result.entry, `Result should not be empty.`);
            // TODO: need to update so as to match keys
            assert.deepEqual(result.entry, u_amul[0]._data, `Entry should deep equal`);
            return done();
          })
          .catch(error => {
            console.error(error);
            return done();
          });
      });

      it(`(#9) QueryBuilder - find updated entry - excludeReference`, function (done) {
        QueryBuilder.ContentType(u_amul[0]._content_type_uid)
          .language(u_amul[0]._locale)
          .excludeReference()
          .find()
          .then(result => {
            assert.property(result, 'entries', `Does the result have 'entry' key?`);
            assert.isArray(result.entries, `Is the result.entry of type 'Array'?`);
            assert.isNotEmpty(result.entries, `Result should not be empty.`);
            // TODO: need to update so as to match keys
            assert.deepEqual(result.entries[0], u_amul[0]._data, `Entry should deep equal`);
            return done();
          })
          .catch(error => {
            console.error(error);
            return done();
          });
      });

      it(`(#10) QueryBuilder - remove updated entry`, function (done) {
        QueryBuilder.ContentType(u_amul[0]._content_type_uid)
          .Entry(u_amul[0]._uid)
          .language(u_amul[0]._locale)
          .remove()
          .then(result => {
            assert.property(result, "status", `Does the response have 'status' key?`);
            assert.property(result, "msg", `Does the response have 'status' key?`);
            assert.equal(result.status, 1, `Has the asset been removed successfully?`);
            return done();
          })
          .catch(error => {
            console.error(error);
            return done();
          });
      });

      it(`(#11) QueryBuilder - fetch updated entry`, function (done) {
        QueryBuilder.ContentType(u_amul[0]._content_type_uid)
          .Entry(u_amul[0]._content_type_uid)
          .language(u_amul[0]._locale)
          .excludeReference()
          .toJSON()
          .fetch()
          .then(result => {
            assert.property(result, 'entry', `Does the result have 'entry' key?`);
            assert.isObject(result.entry, `Is the result.entry of type 'Object'?`);
            assert.isEmpty(result.entry, `Result should be empty.`);
            // TODO: need to update so as to match keys
            return done();
          })
          .catch(error => {
            console.error(error);
            return done();
          });
      });

      it(`(#12) QueryBuilder - find updated entry - excludeReference`, function (done) {
        QueryBuilder.ContentType(u_amul[0]._content_type_uid)
          .language(u_amul[0]._locale)
          .excludeReference()
          .find()
          .then(result => {
            assert.property(result, 'entries', `Does the result have 'entries' key?`);
            assert.isArray(result.entries, `Is the result.entry of type 'Array'?`);
            assert.isEmpty(result.entries, `Result should be empty.`);
            return done();
          })
          .catch(error => {
            console.error(error);
            return done();
          });
      });

      it(`(#13) QueryBuilder - count - excludeReference`, function (done) {
        QueryBuilder.ContentType(u_amul[0]._content_type_uid)
          .language(u_amul[0]._locale)
          .excludeReference()
          .count()
          .then(result => {
            assert.property(result, 'entries', `Does the result have 'entries' key?`);
            // assert.property(result, 'count', `Does the result have 'count' key?`);
            // assert.isArray(result.entries, `Is the result.entry of type 'Array'?`);
            // assert.isEmpty(result.entries, `Result should be empty.`);
            assert.isNumber(result.entries, `Is result.count of type 'Number'?`);
            assert.equal(result.entries, 0, `Does the length of response match 'count'`);
            return done();
          })
          .catch(error => {
            console.error(error);
            return done();
          });
      });
    });

    describe(`Test querybuilder functionality on content_types`, function() {
      it(`(#2.1) QueryBuilder - Insert - Content Type`, function(done) {
        QueryBuilder.ContentType(u_schemas[0]._content_type_uid)
          .language(u_schemas[0]._locale)
          .Entry(u_schemas[0]._uid)
          .insert(u_schemas[0]._data)
          .then(result => {
            assert.property(result, "status", `Does the response have 'status' key?`);
            assert.property(result, "msg", `Does the response have 'status' key?`);
            assert.equal(result.status, 1, `Has the asset been inserted successfully?`);
            assert.equal(result.msg, `Entry '${amul[0]._uid}' was inserted into Content type '${amul[0]._content_type_uid}' of en-us language successfully.`)
            return done();
          })
          .catch(error => {
            console.error(error);
            return done();
          });
      });
      // it(`(#4) QueryBuilder - entry fetch`, function(done) {
      //   QueryBuilder.ContentType(amul[0]._content_type_uid)
      //     .language(amul[0]._locale)
      //     .Entry(amul[0]._uid)
      //     .fetch()
      //     .then(result => {
      //       console.log('@QB fetch result -', JSON.stringify(result));
      //       assert.property(result, 'entry', `Does the result have 'entry' key?`);
      //       assert.isObject(result.entry, `Is the result.entry of type 'Object'?`);
      //       assert.isNotEmpty(result.entry, `Result should not be empty.`);
      //       // TODO: need to update so as to match keys
      //       // assert.deepEqual(result.entry, amul[0]._data, `Entry should deep equal`);
      //       return done();
      //     })
      //     .catch(error => {
      //       console.error(error);
      //       return done();
      //     });
      // });
      // it(`(#5) QueryBuilder - entry find`, function (done) {
      //   QueryBuilder.ContentType(amul[0]._content_type_uid)
      //     .language(amul[0]._locale)
      //     .find()
      //     .then(result => {
      //       console.log('@QB find result -', JSON.stringify(result));
      //       assert.property(result, 'entry', `Does the result have 'entry' key?`);
      //       assert.isObject(result.entry, `Is the result.entry of type 'Object'?`);
      //       assert.isNotEmpty(result.entry, `Result should not be empty.`);
      //       // TODO: need to update so as to match keys
      //       assert.deepEqual(result.entry, amul[0]._data, `Entry should deep equal`);
      //       return done();
      //     })
      //     .catch(error => {
      //       console.error(error);
      //       return done();
      //     });
      // });
      
      it(`(#6) QueryBuilder - entry find - excludeReference`, function (done) {
        QueryBuilder.ContentType(amul[0]._content_type_uid)
          .language(amul[0]._locale)
          .excludeReference()
          .find()
          .then(result => {
            assert.property(result, 'entries', `Does the result have 'entry' key?`);
            assert.isArray(result.entries, `Is the result.entry of type 'Array'?`);
            assert.isNotEmpty(result.entries, `Result should not be empty.`);
            // TODO: need to update so as to match keys
            assert.deepEqual(result.entries[0], amul[0]._data, `Entry should deep equal`);
            return done();
          })
          .catch(error => {
            console.error(error);
            return done();
          });
      });

      it(`(#7) QueryBuilder - upsert entry`, function (done) {
        QueryBuilder.ContentType(u_amul[0]._content_type_uid)
          .Entry(u_amul[0]._uid)
          .language(u_amul[0]._locale)
          .upsert(u_amul[0]._data)
          .then(result => {
            assert.property(result, "status", `Does the response have 'status' key?`);
            assert.property(result, "msg", `Does the response have 'status' key?`);
            assert.equal(result.status, 1, `Has the asset been inserted successfully?`);
            assert.equal(result.msg, `Entry '${u_amul[0]._uid}' in Content type '${u_amul[0]._content_type_uid}' of ${u_amul[0]._locale} language has been updated successfully.`)
            return done();
          })
          .catch(error => {
            assert.ifError(error);
            return done();
          });
      });      

      it(`(#8) QueryBuilder - fetch updated entry - excludeReference`, function (done) {
        QueryBuilder.ContentType(u_amul[0]._content_type_uid)
          .Entry(u_amul[0]._content_type_uid)
          .language(u_amul[0]._locale)
          .excludeReference()
          .toJSON()
          .fetch()
          .then(result => {
            assert.property(result, 'entry', `Does the result have 'entry' key?`);
            assert.isObject(result.entry, `Is the result.entry of type 'Object'?`);
            assert.isNotEmpty(result.entry, `Result should not be empty.`);
            // TODO: need to update so as to match keys
            assert.deepEqual(result.entry, u_amul[0]._data, `Entry should deep equal`);
            return done();
          })
          .catch(error => {
            console.error(error);
            return done();
          });
      });

      it(`(#9) QueryBuilder - find updated entry - excludeReference`, function (done) {
        QueryBuilder.ContentType(u_amul[0]._content_type_uid)
          .language(u_amul[0]._locale)
          .excludeReference()
          .find()
          .then(result => {
            assert.property(result, 'entries', `Does the result have 'entry' key?`);
            assert.isArray(result.entries, `Is the result.entry of type 'Array'?`);
            assert.isNotEmpty(result.entries, `Result should not be empty.`);
            // TODO: need to update so as to match keys
            assert.deepEqual(result.entries[0], u_amul[0]._data, `Entry should deep equal`);
            return done();
          })
          .catch(error => {
            console.error(error);
            return done();
          });
      });

      it(`(#10) QueryBuilder - remove updated entry`, function (done) {
        QueryBuilder.ContentType(u_amul[0]._content_type_uid)
          .Entry(u_amul[0]._uid)
          .language(u_amul[0]._locale)
          .remove()
          .then(result => {
            assert.property(result, "status", `Does the response have 'status' key?`);
            assert.property(result, "msg", `Does the response have 'status' key?`);
            assert.equal(result.status, 1, `Has the asset been removed successfully?`);
            return done();
          })
          .catch(error => {
            console.error(error);
            return done();
          });
      });

      it(`(#11) QueryBuilder - fetch updated entry`, function (done) {
        QueryBuilder.ContentType(u_amul[0]._content_type_uid)
          .Entry(u_amul[0]._content_type_uid)
          .language(u_amul[0]._locale)
          .excludeReference()
          .toJSON()
          .fetch()
          .then(result => {
            assert.property(result, 'entry', `Does the result have 'entry' key?`);
            assert.isObject(result.entry, `Is the result.entry of type 'Object'?`);
            assert.isEmpty(result.entry, `Result should be empty.`);
            // TODO: need to update so as to match keys
            return done();
          })
          .catch(error => {
            console.error(error);
            return done();
          });
      });

      it(`(#12) QueryBuilder - find updated entry - excludeReference`, function (done) {
        QueryBuilder.ContentType(u_amul[0]._content_type_uid)
          .language(u_amul[0]._locale)
          .excludeReference()
          .find()
          .then(result => {
            assert.property(result, 'entries', `Does the result have 'entries' key?`);
            assert.isArray(result.entries, `Is the result.entry of type 'Array'?`);
            assert.isEmpty(result.entries, `Result should be empty.`);
            return done();
          })
          .catch(error => {
            console.error(error);
            return done();
          });
      });

      it(`(#13) QueryBuilder - count - excludeReference`, function (done) {
        QueryBuilder.ContentType(u_amul[0]._content_type_uid)
          .language(u_amul[0]._locale)
          .excludeReference()
          .count()
          .then(result => {
            assert.property(result, 'entries', `Does the result have 'entries' key?`);
            // assert.property(result, 'count', `Does the result have 'count' key?`);
            // assert.isArray(result.entries, `Is the result.entry of type 'Array'?`);
            // assert.isEmpty(result.entries, `Result should be empty.`);
            assert.isNumber(result.entries, `Is result.count of type 'Number'?`);
            assert.equal(result.entries, 0, `Does the length of response match 'count'`);
            return done();
          })
          .catch(error => {
            console.error(error);
            return done();
          });
      });
    });
  });

  describe(`QueryBuilder - Querying`, function () {
  });

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
