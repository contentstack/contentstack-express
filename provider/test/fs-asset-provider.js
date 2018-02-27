const assert = require("chai").assert,
  expect = require("chai").expect,
  _ = require("lodash"),
  fs = require("fs"),
  Promise = require("bluebird"),
  rimraf = require("rimraf"),
  sift = require("sift");

const utility = require("./utility");

let assetDB,
  config,
  assets = [],
  _custom_assets = [
    {
      _uid: "blt070cfd9c4daddb07",
      _locale: "en-us",
      _content_type_uid: "_assets",
      _data: {
        uid: "blt070cfd9c4daddb07",
        content_type: "image/jpeg",
        file_size: "10245",
        tags: [],
        filename: "articuno-custom.jpg",
        url:
          "https://images.contentstack.io/v3/assets/blt0a3e0fa8bf2766a9/blt070cfd9c4daddb07/5a182b47e796d29d7bc96251/download",
        is_dir: false,
        _version: 1,
        title: "Articuno Custom",
        _internal_url: "/assets/blt070cfd9c4daddb07/articuno-custom.jpg"
      }
    }
  ],
  _custom_rte = [
    {
      _data: {
        uid: "5a1570bd54501ab14f7acfc3",
        url:
          "https://images.contentstack.io/v3/assets/blt0a3e0fa8bf2766a9/blt4705bf389f70ab86/5a1570bd54501ab14f7acfc3/download",
        download_id: "blt4705bf389f70ab86/5a1570bd54501ab14f7acfc3/download",
        filename: "Pingu.jpg",
        _internal_url: "/assets/5a1570bd54501ab14f7acfc3/squirttle.jpg"
      },
      _content_type_uid: "_assets",
      _uid: "blt4705bf389f70ab86/5a1570bd54501ab14f7acfc3/download",
      _locale: "en-us"
    }
  ];

let _insertedAssets = [];

describe(`Test asset-management provider`, function() {
  this.timeout(1000);
  // ./data/en-us/assets/_assets.json
  it(`(#1) Load asset-management provider`, function() {
    try {
      const Provider = require("contentstack-provider");
      const provider = new Provider();
      assetDB = provider.db;
      config = require("../lib/config");
      assert.isObject(assetDB, "Is provider loaded?");
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });

  it("(#2) Asset management provider should have all the mandatory methods", function() {
    let mandatory_methods = [
      "findOne",
      "find",
      "count",
      "remove",
      "insert",
      "upsert"
    ];
    let assetMethods = Object.getOwnPropertyNames(
      Object.getPrototypeOf(assetDB)
    );
    _.map(mandatory_methods, method => {
      assert.isOk(
        assetMethods.indexOf(method),
        method + " present in provider?"
      );
      assert.isFunction(assetDB[method], method + " type is function?");
    });
  });

  it(`(#3) Load 'en-us' asset metadata`, function() {
    assets = require("./data/en-us/assets/_assets.json");
    assets_u = require("./data_upsert/en-us/assets/_assets.json");
  });

  describe(`Test 'asset-management': Insert`, function() {
    it(`(#4) Insert assets`, function(done) {
      this.timeout(10000);
      Promise.map(
        assets,
        asset => {
          return new Promise((resolve, reject) => {
            assetDB
              .insert(asset)
              .then(result => {
                try {
                  assert.property(
                    result,
                    "status",
                    `Does the response have 'status' key?`
                  );
                  assert.property(
                    result,
                    "msg",
                    `Does the response have 'status' key?`
                  );
                  assert.equal(
                    result.status,
                    1,
                    `Has the asset been inserted successfully?`
                  );
                  expect(result.msg).to.be.oneOf([
                    `Asset ${asset._uid} was inserted in ${
                      asset._locale
                    } language successfully.`,
                    `Asset ${asset._uid} in ${
                      asset._locale
                    } already exists. Avoiding duplicate download.\nAsset ${
                      asset._uid
                    } was inserted in ${asset._locale} language successfully.`
                  ]);
                  _insertedAssets.push(asset);
                  return resolve();
                } catch (error) {
                  return reject(error);
                }
              })
              .catch(insertError => {
                console.log("insertError", insertError);
                return reject(insertError);
              });
          });
        },
        { concurrency: 1 }
      )
        .then(result => {
          return done();
        })
        .catch(error => {
          assert.ifError(error);
          return done();
        });
    });

    it(`(#5) Re-insert assets`, function(done) {
      this.timeout(20000);
      Promise.map(
        assets,
        asset => {
          return new Promise((resolve, reject) => {
            assetDB
              .insert(asset)
              .then(result => {
                try {
                  assert.property(
                    result,
                    "status",
                    `Does the response have 'status' key?`
                  );
                  assert.property(
                    result,
                    "msg",
                    `Does the response have 'status' key?`
                  );
                  assert.equal(
                    result.status,
                    0,
                    `Has the asset been inserted successfully?`
                  );
                  assert.equal(
                    result.msg,
                    `Asset ${asset._uid} in ${
                      asset._locale
                    } language already exists!`,
                    `Do the message match?`
                  );
                  return resolve();
                } catch (error) {
                  return reject(error);
                }
              })
              .catch(insertError => {
                console.log("insertError", insertError);
                return reject(insertError);
              });
          });
        },
        { concurrency: 1 }
      )
        .then(result => {
          return done();
        })
        .catch(error => {
          assert.ifError(error);
          return done();
        });
    });
  });

  describe(`Test 'asset-management': Upsert`, function() {
    it(`(#6) Upsert asset: Asset that's already present.`, function(done) {
      this.timeout(12000);
      Promise.map(
        [assets_u[0]],
        asset => {
          return new Promise((resolve, reject) => {
            assetDB
              .upsert(asset)
              .then(result => {
                try {
                  assert.property(
                    result,
                    "status",
                    `Does the response have 'status' key?`
                  );
                  assert.property(
                    result,
                    "msg",
                    `Does the response have 'status' key?`
                  );
                  assert.equal(
                    result.status,
                    0,
                    `Has the asset been updated successfully?`
                  );
                  expect(result.msg).to.be.oneOf([
                    `Asset ${assets_u[0]._uid} in ${
                      assets_u[0]._locale
                    } already exists.`
                  ]);
                  return resolve();
                } catch (error) {
                  return reject(error);
                }
              })
              .catch(error => {
                return reject(error);
              });
          });
        },
        { concurrency: 1 }
      )
        .then(result => {
          return done();
        })
        .catch(error => {
          assert.ifError(error);
          return done();
        });
    });

    it(`(#7) Upsert asset: Asset that's actually updated.`, function(done) {
      this.timeout(12000);
      Promise.map(
        [assets_u[1]],
        asset => {
          return new Promise((resolve, reject) => {
            assetDB
              .upsert(asset)
              .then(result => {
                try {
                  assert.property(
                    result,
                    "status",
                    `Does the response have 'status' key?`
                  );
                  assert.property(
                    result,
                    "msg",
                    `Does the response have 'status' key?`
                  );
                  assert.equal(
                    result.status,
                    1,
                    `Has the asset been updated successfully?`
                  );
                  assert.equal(
                    result.msg,
                    `Asset ${assets_u[1]._uid} in ${
                      assets_u[1]._locale
                    } language has been updated successfully.`,
                    `Do the messages match`
                  );
                  let pos = _.find(_insertedAssets, { _uid: assets_u[1]._uid });
                  if (~pos) _insertedAssets.splice(pos, 1, assets_u[1]);
                  else console.error(`Something went wrong during upsert.`);
                  return resolve();
                } catch (error) {
                  return reject(error);
                }
              })
              .catch(error => {
                return reject(error);
              });
          });
        },
        { concurrency: 1 }
      )
        .then(result => {
          return done();
        })
        .catch(error => {
          assert.ifError(error);
          return done();
        });
    });

    it(`(#8) Upsert asset: Asset that's already present, but with updated metadata.`, function(done) {
      this.timeout(12000);
      Promise.map(
        [assets_u[2]],
        asset => {
          return new Promise((resolve, reject) => {
            assetDB
              .upsert(asset)
              .then(result => {
                try {
                  assert.property(
                    result,
                    "status",
                    `Does the response have 'status' key?`
                  );
                  assert.property(
                    result,
                    "msg",
                    `Does the response have 'status' key?`
                  );
                  // assert.equal(result.status, 1, `Has the asset been updated successfully?`);
                  assert.equal(
                    result.msg,
                    `Asset ${assets_u[2]._uid} in ${
                      assets_u[2]._locale
                    } language has been updated successfully.`,
                    `Do the messages match`
                  );
                  let pos = _.find(_insertedAssets, { _uid: assets_u[2]._uid });
                  if (~pos) _insertedAssets.splice(pos, 1, assets_u[2]);
                  else console.error(`Something went wrong during upsert.`);
                  return resolve();
                } catch (error) {
                  return reject(error);
                }
              })
              .catch(error => {
                return reject(error);
              });
          });
        },
        { concurrency: 1 }
      )
        .then(result => {
          return done();
        })
        .catch(error => {
          assert.ifError(error);
          return done();
        });
    });

    it(`(#9) Upsert asset: New asset`, function(done) {
      this.timeout(12000);
      assetDB
        .upsert(_custom_assets[0])
        .then(result => {
          try {
            assert.property(
              result,
              "status",
              `Does the response have 'status' key?`
            );
            assert.property(
              result,
              "msg",
              `Does the response have 'status' key?`
            );
            assert.equal(
              result.status,
              1,
              `Has the asset been updated successfully?`
            );
            assert.equal(
              result.msg,
              `Asset ${_custom_assets[0]._uid} in ${
                _custom_assets[0]._locale
              } language has been updated successfully.`,
              `Do the messages match`
            );
            let pos = _.findIndex(_insertedAssets, {
              _uid: _custom_assets[0]._uid
            });
            if (~pos)
              console.error(new Error(`Something went wrong during upsert.`));
            else _insertedAssets.push(_custom_assets[0]);
            return done();
          } catch (error) {
            assert.ifError(error);
            return done();
          }
        })
        .catch(error => {
          assert.ifError(error);
          return done();
        });
    });
  });

  describe(`Test 'asset-management': Fetch`, function() {
    it(`(#10) Fetch asset`, function(done) {
      assetDB
        .findOne({
          _uid: _custom_assets[0]._uid,
          _locale: _custom_assets[0]._locale,
          _content_type_uid: _custom_assets[0]._content_type_uid
        })
        .then(result => {
          assert.property(
            result,
            "asset",
            `Does the response have 'asset' key?`
          );
          assert.isObject(result.asset, `Is the result.asset of type Object?`);
          assert.deepEqual(result.asset, _custom_assets[0]._data);
          return done();
        })
        .catch(error => {
          assert.ifError(error);
          return done();
        });
    });
  });

  // Update test case
  describe(`Test 'asset-management': Find`, function() {
    it(`(#11) Find asset`, function(done) {
      assetDB
        .find(
          {
            _locale: _insertedAssets[0]._locale,
            _content_type_uid: _insertedAssets[0]._content_type_uid
          },
          {}
        )
        .then(result => {
          assert.property(
            result,
            "assets",
            `Does the response have 'asset' key?`
          );
          assert.isArray(result.assets, `Is the result.asset of type 'Array'?`);
          assert.equal(
            result.assets.length,
            _insertedAssets.length,
            `Do the length match to that of _insertedAssets?`
          );
          return done();
        })
        .catch(error => {
          assert.ifError(error);
          return done();
        });
    });
  });

  describe(`Test 'asset-management': Delete`, function() {
    it(`(#12) Delete asset`, function(done) {
      let _random_index = utility.getRandomNumber(0, _insertedAssets.length);
      let _removed_assets = _.remove(_insertedAssets, asset => {
        if (asset._data.uid === _insertedAssets[_random_index]._data.uid)
          return asset;
      });
      assetDB
        .remove({
          _uid: _removed_assets[0]._data.uid,
          _locale: _removed_assets[0]._locale,
          _content_type_uid: _removed_assets[0]._content_type_uid,
          _delete: true
        })
        .then(result => {
          assert.property(
            result,
            "status",
            `Does the result have 'status' key?`
          );
          assert.property(result, "msg", `Does the result have 'msg' key?`);
          assert.isNumber(result.status, `Is the status a number?`);
          assert.isString(result.msg, `Is the msg of type string?`);
          assert.equal(result.status, 1, `Was the asset successfully deleted?`);
          // TODO: add message check
          return done();
        })
        .catch(error => {
          assert.ifError(error);
          return done();
        });
    });
  });

  describe(`Test 'asset-management': Unpublish`, function() {
    it(`(#13) Unpublish asset`, function(done) {
      let _random_index = utility.getRandomNumber(0, _insertedAssets.length);
      let _removed_asset = _insertedAssets.splice(_random_index, 1)[0];

      assetDB
        .remove({
          _uid: _removed_asset._data.uid,
          _locale: _removed_asset._locale,
          _content_type_uid: _removed_asset._content_type_uid,
          _delete: false
        })
        .then(result => {
          assert.property(
            result,
            "status",
            `Does the result have 'status' key?`
          );
          assert.property(result, "msg", `Does the result have 'msg' key?`);
          assert.isNumber(result.status, `Is the status a number?`);
          assert.isString(result.msg, `Is the msg of type string?`);
          assert.equal(
            result.status,
            1,
            `Was the asset successfully 'unpublished'?`
          );
          assert.equal(
            result.msg,
            `Asset ${_removed_asset._data.uid} in ${
              _removed_asset._locale
            } language was unpublished successfully.\n`,
            `Do the messages match?`
          );
          return done();
        })
        .catch(error => {
          assert.ifError(error);
          return done();
        });
    });
  });

  // after(function (done) {
  // 	let contentPath = config.get('path.storage');
  // 	console.log(`Running cleanup @${contentPath}`);
  // 	if (fs.existsSync(contentPath)) {
  // 		rimraf.sync(contentPath);
  // 		console.log(`DB contents cleaned successfully!`);
  // 		return done();
  // 	} else {
  // 		console.info(`Unable to find DB path : ${contentPath}`);
  // 		return done();
  // 	}
  // });
});
