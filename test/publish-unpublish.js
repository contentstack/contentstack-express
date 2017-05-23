'use strict';

/**
 * Module Dependencies.
 */
var test = require('tape'),
    request = require('request'),
    supertest = require('supertest'),
    contentstack = require('contentstack-express'),
    app = contentstack(),
    utils = require('./../node_modules/contentstack-express/lib/utils'),
    logger = require('./../node_modules/contentstack-express/lib/utils/logger');

var config = contentstack.config,
    Stack = contentstack.Stack(),
    api = config.get('contentstack'),
    credentials = {
        "email": "hitesh.baldaniya+unit@raweng.com",
        "password": "unittest"
    },
    log = logger({
        console: true,
        type: 'unittests',
        level: 'info',
        json: true,
        path: config.get('path.logs')
    }),
    contentTypes = {
        source: "source"
    },
    defaultLocale = 'en-us',
    locale = 'ja-jp',
    headers = {
        api_key: api.api_key,
        authtoken: api.access_token
    },
    authtoken,
    environment,
    entryToBeEvent,
    actionDate,
    eventEntry = {};

// task before the Test-Suite starts
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

test('Get the environments', function (assert) {
    if (!environment) {
        request({
            url: api.host + api.urls.environments + "development",
            method: "GET",
            headers: headers,
            json: true
        }, function (err, res, body) {
            if (!err && body && body.environment) {
                environment = body.environment;
                assert.pass("Environment found");
            } else {
                assert.fail("Environment not found error." + (err && err.message));
            }
            assert.end();
        });
    } else {
        assert.pass("Environment not exists");
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

test('Check the last published entry', function (TC) {
    TC.test('[en-us]Find the "Source" entry from the server', function (assert) {
        var prev;

        function findAnEntry(cb) {
            Stack
                .ContentType(eventEntry.content_type.uid)
                .language(defaultLocale)
                .Entry(eventEntry.entry.entry_uid)
                .toJSON()
                .fetch()
                .then(function (entry) {
                    cb(null, entry);
                }, cb);
        }

        function callback(err, entry) {
            if (!err) {
                if (entry && entry.published_at) {
                    //console.log("Entry : ", publishedDate, actionDate, Math.abs(publishedDate - actionDate));
                    if (prev && entry.published_at !== prev || !prev) {
                        assert.pass("Recent published entry found.");
                        assert.end();
                    } else {
                        setImmediate(function () {
                            setTimeout(function () {
                                if (!prev) prev = entry.published_at;
                                assert.pass("Not Recent published entry found.");
                                findAnEntry(callback);
                            }, 3000);
                        });
                    }
                } else {
                    setImmediate(function () {
                        setTimeout(function () {
                            assert.pass("Published_at not found in an entry.");
                            findAnEntry(callback);
                        }, 3000);
                    });
                }
            } else {
                assert.fail("Entry fetch error." + err.message);
            }
        }

        findAnEntry(callback);
    });
});

test('Unpublish the source entry', function (TC) {
    TC.test('[en-us]Unpublish the "Source" entry from the server', function (assert) {
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
            url: api.host + api.urls.content_types + contentTypes.source + api.urls.entries + eventEntry.entry.entry_uid + "/" + api.events.unpublish,
            qs: {
                locale: defaultLocale,
                version: eventEntry.entry.version
            },
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
    });
});

test('Check the last unpublished entry', function (TC) {
    TC.test('[en-us]Find the "Source" entry from the server', function (assert) {
        function findAnEntry(cb) {
            Stack
                .ContentType(eventEntry.content_type.uid)
                .language(defaultLocale)
                .Entry(eventEntry.entry.entry_uid)
                .toJSON()
                .fetch()
                .then(function (entry) {
                    //console.log("----entry", entry);
                    cb(null, entry);
                }, cb);
        }

        function callback(err, entry) {
            if (!err) {
                if (!entry) {
                    assert.pass("Recent unpublished entry found.");
                    assert.end();
                } else {
                    setImmediate(function () {
                        setTimeout(function () {
                            assert.pass("Published_at not found in an entry.");
                            findAnEntry(callback);
                        }, 3000);
                    });
                }
            } else {
                assert.fail("Entry fetch error." + err.message);
            }
        }

        findAnEntry(callback);
    });
});


test('Schedule publish the source entry', function (TC) {
    TC.test('[en-us]Schedule Publish the "Source" entry from the server', function (assert) {
        request({
            url: api.host + api.urls.content_types + contentTypes.source + api.urls.entries,
            method: "GET",
            qs: {
                limit: 1,
                skip: 1,
                desc: "updated_at",
                locale: defaultLocale
            },
            headers: headers,
            json: true
        }, function (err, res, body) {
            if (!err && body && body.entries && body.entries.length) {
                assert.pass('Entry fetched');
                actionDate = (new Date().getTime() + (50 * 1000));
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
                    "version": (entryToBeEvent._version > 1) ? entryToBeEvent._version - 1 : 1,
                    "scheduled_at": new Date(actionDate).toISOString()
                };
                request({
                    url: api.host + api.urls.content_types + contentTypes.source + api.urls.entries + eventEntry.entry.entry_uid + "/" + api.events.publish,
                    qs: {
                        locale: defaultLocale,
                        version: eventEntry.entry.version
                    },
                    method: "POST",
                    headers: headers,
                    json: {
                        entry: eventEntry
                    }
                }, function (err, res, eventBody) {
                    if (!err && eventBody && eventBody.notice) {
                        assert.pass("Entry event.");
                    } else {
                        assert.fail("Entry event error." + (JSON.stringify(body) || err.message));
                    }
                    assert.end();
                });
            } else {
                assert.fail("Entry fetch error." + (JSON.stringify(body) || err.message));
                assert.end();
            }
        });
    });
});

test('Check the last scheduled-published entry', function (TC) {
    TC.test('[en-us]Find the Scheduled "Source" entry from the server', function (assert) {
        var prev;

        function findAnEntry(cb) {
            Stack
                .ContentType(eventEntry.content_type.uid)
                .language(defaultLocale)
                .Entry(eventEntry.entry.entry_uid)
                .toJSON()
                .fetch()
                .then(function (entry) {
                    cb(null, entry);
                }, cb);
        }

        function callback(err, entry) {
            if (!err) {
                if (entry && entry.published_at) {
                    //console.log("Entry : ", publishedDate, actionDate, Math.abs(publishedDate - actionDate));
                    if (prev && prev !== entry.published_at || !prev) {
                        if (!prev) prev = entry.published_at;
                        assert.pass("Recent scheduled-published entry found.");
                        assert.end();
                    } else {
                        setImmediate(function () {
                            setTimeout(function () {
                                if (!prev) prev = entry.published_at;
                                assert.pass("Not Recent scheduled-published entry found.");
                                findAnEntry(callback);
                            }, 10000);
                        });
                    }
                } else {
                    setImmediate(function () {
                        setTimeout(function () {
                            assert.pass("Scheduled-Published_at not found in an entry.");
                            findAnEntry(callback);
                        }, 10000);
                    });
                }
            } else {
                assert.fail("Entry fetch error." + err.message);
            }
        }

        findAnEntry(callback);
    });
});

test('Schedule Unpublish the source entry', function (TC) {
    TC.test('[en-us]Schedule unpublish the "Source" entry from the server', function (assert) {
        actionDate = (new Date().getTime() + (50 * 1000));
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
            "version": (entryToBeEvent._version > 1) ? entryToBeEvent._version - 1 : 1,
            "scheduled_at": new Date(actionDate).toISOString()
        };
        request({
            url: api.host + api.urls.content_types + contentTypes.source + api.urls.entries + eventEntry.entry.entry_uid + "/" + api.events.unpublish,
            qs: {
                locale: defaultLocale,
                version: eventEntry.entry.version
            },
            method: "POST",
            headers: headers,
            json: {
                entry: eventEntry
            }
        }, function (err, res, eventBody) {
            //console.log('========', eventBody)
            if (!err && eventBody && eventBody.notice) {
                assert.pass("Entry event.");
            } else {
                assert.fail("Entry event error." + (JSON.stringify(body) || err.message));
            }
            assert.end();
        });
    });
});

test('Check the last scheduled-unpublished entry', function (TC) {
    TC.test('[en-us]Find the Scheduled "Source" entry from the server', function (assert) {
        function findAnEntry(cb) {
            Stack
                .ContentType(eventEntry.content_type.uid)
                .language(defaultLocale)
                .Entry(eventEntry.entry.entry_uid)
                .toJSON()
                .fetch()
                .then(function (entry) {
                    cb(null, entry);
                }, cb);
        }

        function callback(err, entry) {
            if (!err) {
                if (!entry) {
                    assert.pass("Recent scheduled-unpublished entry found.");
                    assert.end();
                } else {
                    setImmediate(function () {
                        setTimeout(function () {
                            assert.pass("Not Recent scheduled-unpublished entry found.");
                            findAnEntry(callback);
                        }, 10000);
                    });
                }
            } else {
                assert.fail("Entry fetch error." + err.message);
            }
        }

        findAnEntry(callback);
    });
});

test.onFinish(function () {
    console.error("Publish Unpublishing finished");
    process.exit(1);
});

