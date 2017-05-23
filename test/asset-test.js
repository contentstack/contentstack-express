/**
 * Created by Aamod Pisat on 05-04-2017.
 */
var _ = require('lodash'),
    request = require('request'),
    path = require('path'),
    test = require('tape'),
    utils = require('./../node_modules/contentstack-express/lib/utils'),
    logger = require('./../node_modules/contentstack-express/lib/utils/logger');

var config = utils.config,
    languages = config.get('languages'),
    api = config.get('contentstack'),
    assetDownloadFlag = config.get("assets.download"),
    DB = utils.db,
    log = logger( {
        console: true,
        type: 'unittests',
        level: 'info',
        json: true,
        path: config.get('path.logs')
    }),
    contentTypes = {
        source: "source"
    },
    credentials = {
        "email": "hitesh.baldaniya+unit@raweng.com",
        "password": "unittest"
    },
    headers = {
        api_key: api.api_key,
        authtoken: api.access_token
    },
    entry = {
        "first_name": "Hitesh",
        "last_name": "Baldaniya1"
    },
    assets = [{
        "uid": "blt46b6661b9463cb29",
        "created_at": "2015-07-13T11:37:23.759Z",
        "updated_at": "2015-07-13T11:37:23.759Z",
        "created_by": "blt5e47a42c081522df4fc5ac57",
        "updated_by": "blt5e47a42c081522df4fc5ac57",
        "content_type": "image/jpeg",
        "file_size": "4629",
        "tags": [],
        "filename": "pic04.jpg",
        "url": "https://images.contentstack.io/v3/assets/bltf9cdecd012ea43cc/blt46b6661b9463cb29/55a3a2f3172d93a97c9926c1/download",
        "_internal_url": "/jp/assets/blt46b6661b9463cb29/pic04.jpg"
    }, "blt5a95972e0cc38bb8"],
    defaultLocale = 'en-us',
    locale = 'ja-jp',
    authtoken,
    environment = {name: config.get('environment')},
    entryToBeEvent,
    actionDate,
    eventEntry = {};

test('Login the user with given credentials', function (assert) {
    if (!authtoken) {
        request({
            url: api.host + api.urls.session,
            method: "POST",
            json: {
                user: credentials
            }
        }, function (err, res, body) {
            if (!err && body && body.user) {
                headers.authtoken = authtoken = body.user.authtoken;
                assert.pass("Authenticated");
            } else {
                assert.fail("Not Authenticated");
            }
            assert.end();
        });
    } else {
        headers.authtoken = authtoken;
        assert.pass("Authenticated");
        assert.end();
    }
});

test('Publish the source entry', function (TC) {

    TC.test('[en-us]Publish the "Source" entry from the server', function (assert) {
        request({
            url: api.host + api.urls.content_types + contentTypes.source + api.urls.entries,
            method: "GET",
            qs: {
                limit: 1,
                skip: 0,
                desc: "created_at",
                locale: defaultLocale
            },
            headers: headers,
            json: true
        }, function (err, res, body) {
            if (!err && body && body.entries && body.entries.length) {
                assert.pass('Entry fetched');
                entryToBeEvent = body.entries.pop();
                eventEntry = {
                    "content_type": {
                        "uid": contentTypes.source,
                        "title": contentTypes.source
                    },
                    "entry": {
                        "entry_uid": entryToBeEvent.uid,
                        "locale": [defaultLocale]
                    },
                    "locale": [defaultLocale],
                    "environments": [environment["name"]],
                    "version": (entryToBeEvent._version > 1) ? entryToBeEvent._version - 1 : 1
                };
                request({
                    url: api.host + api.urls.content_types + contentTypes.source + api.urls.entries + eventEntry.entry.entry_uid + "/" + api.events.publish,
                    method: "POST",
                    headers: headers,
                    json: {
                        entry: eventEntry
                    }
                }, function (err, res, eventBody) {
                    if (!err && eventBody && eventBody.notice) {
                        actionDate = new Date().getTime();
                        assert.pass("Entry event.");
                    } else {
                        assert.fail("Entry event error." + (JSON.stringify(body) || err.message));
                    }
                    assert.end();
                });
            } else {
                assert.fail("Entry post error." + (JSON.stringify(body) || err.message));
                assert.end();
            }
        });
    });

});

test('Loading the database', function (TC) {
    TC.test('Loading the database', function (assert) {
        setTimeout(function () {
            assert.end();
        }, 5000);
    });
});

test('[en-us] Find the source entry', function (assert) {
    DB
        .ContentType(contentTypes.source)
        .language(defaultLocale)
        .Query()
        .toJSON()
        .find()
        .then(function (entries) {
            assert.ok(entries[0].length, "entries present in resultset");
            assert.equal(entries[0].length, 1, "entries present in resultset");
            assert.end();
        }, function (err) {
            log.error('Find the source entry error.' + err.message);
            assert.fail(err.message);
            assert.end();
        });
});

test('Publish the asset', function (assert) {
    var asset = {
        "environments": [environment["name"]],
        "locales": [locale]
    };
    request({
        url: api.host + api.urls.assets + assets[0].uid + "/" + api.events.publish,
        method: "POST",
        headers: headers,
        json: {
            asset: asset
        }
    }, function (err, res, eventBody) {
        if (!err && eventBody && eventBody.notice) {
            actionDate = new Date().getTime();
            assert.pass("Asset event received.");
        } else {
            assert.fail("Asset event error." + (JSON.stringify(err) || err.message));
        }
        assert.end();
    });
});

test('Loading the database', function (TC) {
    TC.test('Loading the database', function (assert) {
        setTimeout(function () {
            assert.end();
        }, 20000);
    });
});

test('[en-us] Find the source entry including asset', function (assert) {
    DB
        .ContentType(contentTypes.source)
        .language(defaultLocale)
        .Query()
        .toJSON()
        .find()
        .spread(function (entries) {
            assert.ok(entries.length, "entries present in resultset");
            assert.equal(entries.length, 1, "one 'entry' present in resultset");
            assert.equal(entries[0].file, {} , "asset is included in file");

            assert.end();
        }, function (err) {
            log.error('Find the source entry error.' + err.message);
            assert.fail(err.message);
            assert.end();
        });
});

