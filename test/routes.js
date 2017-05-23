'use strict';

/**
 * Module Dependencies.
 */
var _ = require('lodash'),
    fs = require('fs'),
    path = require('path'),
    when = require('when'),
    sequence = require('when/sequence'),
    request = require('./request'),
    test = require('tape'),
    utils = require('./../node_modules/contentstack-express/lib/utils'),
    logger = require('./../node_modules/contentstack-express/lib/utils/logger');

var config = utils.config,
    languages = config.get('languages'),
    DB = utils.db,
    log = logger({
        console: true,
        type: 'unittests',
        level: 'info',
        json: true,
        path: config.get('path.logs')
    }),
    contentTypes = {
        source: "source",
        numbers: "numbers_content_type",
        contains: "multiple_assets",
        customClass: "customClass"
    },
    entry = {
        "first_name": "Hitesh",
        "last_name": "Baldaniya"
    },
    defaultLocale = 'en-us',
    locale = 'ja-jp';

test('Loading the database', function (TC) {
    TC.test('Loading the database', function (assert) {
        setTimeout(function () {
            assert.end();
        }, 2000);
    });
});

test('Check the system routes', function (TC) {
    var routes = []
    TC.test('Loading all the system routes', function (assert) {
        DB.ContentType("_routes")
            .language(defaultLocale)
            .Query()
            .toJSON()
            .find()
            .spread(function (entries) {
                routes = entries
                assert.ok(entries.length, "Routes present in the system")
                assert.end()
            }, function (err) {
                assert.fail(err.message)
                assert.end()
            })
    })

    // making request to each of the routes
    TC.test('Requesting all the system routes', function (assert) {
        try {
            if(routes.length) {
                var validRoutes = true
                var requests = []
                var dbOperations = []
                var multipleOperations = []
                for(let i = 0, _i = routes.length; i < _i; i++) {
                    if(routes[i] && routes[i]['content_type'] && routes[i]['content_type']['uid'] && routes[i]['entry'] && routes[i]['entry']['uid'] && routes[i]['entry']['url']) {
                        // console.error(i, " => ",routes[i]['entry']['uid'], routes[i]['content_type']['uid'])
                        requests.push(function() {return request({url: routes[i]['entry']['url'] + '.json'}) })
                        dbOperations.push(function() {return DB.ContentType(routes[i]['content_type']['uid']).Entry(routes[i]['entry']['uid']).toJSON().fetch() })
                    } else {
                        validRoutes = false
                    }
                }
                assert.true(validRoutes, "All routes are valid")
                multipleOperations = [sequence(requests), sequence(dbOperations)]
                when
                    .all(multipleOperations)
                    .spread((allRoutesEntries, allDBEntries) => {
                        if(allRoutesEntries.length && allDBEntries.length) {
                            // checking the requested entry is same as DB entry
                            for(let i = 0, _i = allRoutesEntries.length; i < _i; i++) {
                                allRoutesEntries[i] = JSON.parse(allRoutesEntries[i])
                                if(!(allRoutesEntries[i] && allRoutesEntries[i]['entry'] && allDBEntries[i] && _.isEqual(allDBEntries[i], allRoutesEntries[i]['entry']))) {
                                    // console.error(i,allRoutesEntries[i]['entry']['uid'], " => ", allDBEntries[i]['uid'])
                                    assert.fail("Routes entries not same as DB - due to URL preference")
                                } else {
                                    assert.pass("Routes entry is same as DB")
                                }
                            }
                        } else {
                            assert.fail("Routes AND DB entries not present/valid")
                        }
                        assert.end()
                    })
                    .catch( (error) => {
                        // console.error(error.stack)
                        assert.fail(error.message)
                        assert.end()
                    })
            } else {
                assert.fail("No routes present.")
                assert.end()
            }
        } catch (error) {
            assert.fail(error.message)
            assert.end()
        }
    })
})