/**
 * Created by hitesh on 14/4/16.
 */
var _ = require('lodash'),
    fs = require('fs'),
    path = require('path'),
    test = require('tape'),
    utils = require('./../node_modules/contentstack-express/lib/utils'),
    logger = require('./../node_modules/contentstack-express/lib/utils/logger');

var config = utils.config,
    languages= config.get('languages'),
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
        "last_name": "Baldaniya1"
    },
    defaultLocale = 'en-us',
    locale = 'ja-jp';

test('Loading the database', function(TC) {
    TC.test('Loading the database', function(assert) {
        setTimeout(function() {
            assert.end();
        }, 2000);
    });
});

test('Unit testing Test', function (TC) {
    TC.test('Source Entries :: .where(\'reference.title\', \'ref1\')', function (assert) {
        var query = DB
            .ContentType(contentTypes.source)
            .language(defaultLocale)
            .Query()
            .where('reference.title', 'ref1')
            .toJSON()


        query.find().spread(function success(entries) {
                assert.ok(entries.length, '"entries" present in the resultset.');
                assert.equal(entries.length, 2, 'Two entries found.');
                var prev = entries[0]['published_at'],
                    refPresent = true;
                var sorting = entries.filter(function (entry) {
                    var flag = (prev >= entry.published_at);
                    prev = entry.published_at;
                    if (!(entry && entry.reference && entry.reference.length && entry.reference[0].title == "ref1")) refPresent = false;
                    return flag;
                });
                assert.ok(refPresent, "'ref1' is present in all the fetched entries");
                assert.equal(entries.length, sorting.length, 'Descending "published_at" sorting is maintained.');
                assert.end();
            }, function error(err) {
                log.error('Source Entries :: .where(\'reference.title\', \'ref1\') error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });
   /* TC.test('Source entry :: .or(.where("reference.title", "ref1"), .where("other_reference.title", "Other ref1"))', function (assert) {
        var q1 = DB.ContentType(contentTypes.source).Query().where('reference.title', 'ref1');
        var q2 = DB.ContentType(contentTypes.source).Query().where('other_reference.title', 'Other ref1');

        DB
            .ContentType(contentTypes.source)
            .language(locale)
            .Query()
            .or(q1, q2)
            .findOne()
            // .excludeReference()
            .includeCount()
            .then(function sucess(result) {
                console.log("==result ==", JSON.stringify(result));
                // assert.ok((typeof result.count !== 'undefined'), '"count" wrapper exists.');
                // assert.ok((typeof result.entries !== 'undefined'), '"entries" wrapper exists.');
                assert.ok("entries" in result, '"entries" wrapper exists.');
                assert.ok("entry" in result, '"entry" wrapper exists.');
                assert.notEqual(null, result, 'Single entry exists.');
                if(result && result.entry) {
                    result = result.entry;
                    var refPresent = (result.reference && result.reference.length && result.reference[0]['title'] === 'ref1') ? true : false,
                        otherRefPresent = (result.other_reference && result.other_reference.length && result.other_reference['title'] === 'Other ref1') ? true : false;
                    assert.ok((refPresent || otherRefPresent), "either 'ref1' or 'Other ref1' is present in one of the fetched entries");
                }
                assert.end();
            }, function error(err) {
                log.error('Source Entries :: .or(.where("reference.title", "ref1"), .where("other_reference.title", "Other ref1")) error.' + err.message);
                log.error(err.stack);
                assert.fail(err.message);
                assert.end();
            });
        DB
            .ContentType(contentTypes.source)
            .language(defaultLocale)
            .Query()
            .toJSON()
            .skip(1)
            .limit(2)
            .find()
            .spread(function success(entries) {
                assert.ok(entries.length, '"entries" present in the resultset.');
                assert.equal(entries.length, 2, '2 entries fetched.');
                // assert.deepEqual(allEntries.slice(1, 3), entries, 'Element skiped and limit worked.');
                var prev = entries[0]['published_at'];
                var sorting = entries.filter(function (entry) {
                    var flag = (prev >= entry.published_at);
                    prev = entry.published_at;
                    return flag;
                });
                assert.equal(entries.length, sorting.length, 'Descending "published_at" sorting is maintained in skip and limit.');
                assert.end();
            }, function error(err) {
                log.error('Source entries :: .skip(1), .limit(2) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });*/
    /*TC.test('[Error] Duplicate entry with Insert in "customClass" :: .insert()', function (assert) {
        DB
            .ContentType(contentTypes.customClass)
            .language(locale)
            .Entry('blt001')
            .insert(entry)
            .then(function (result) {
                console.log("Insert Result ", result);
                DB
                    .ContentType(contentTypes.customClass)
                    .language(locale)
                    .Query()
                    .findOne()
                    .toJSON()
                    .then(function (result) {
                        assert.deepEqual(result, entry, 'Entry is same as provided - insert');
                        assert.end();
                    }, function (err) {
                        log.error('[Error] Duplicate entry with Insert in "customClass" :: .insert() error.' + err.message);
                        assert.fail(err.message);
                        assert.end();
                    });
            }, function (err) {
                log.error('[Error] Duplicate entry with Insert in "customClass" :: .insert() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('[Error] Duplicate entry with Insert in "customClass" :: .insert()', function (assert) {
        DB
            .ContentType(contentTypes.customClass)
            .language(locale)
            .Entry('blt001')
            .remove()
            .then(function (result) {
                assert.deepEqual(result.entry, entry, 'Entry is same as provided - insert');
                assert.end();
            }, function (err) {
                log.error('[Error] Duplicate entry with Insert in "customClass" :: .insert() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });*/

    /*TC.test('MultipleAssets entry :: .notExists("isspecial")', function (assert) {
        var uid = 'blt260a30f46ae2513f';
        DB
            .ContentType(contentTypes.contains)
            .language(locale)
            // .Query()
            .Entry('blt909d11a7cf578372')
            // .find()
            // .notExists('isspecial')
            .fetch()
            // .findOne()
            // .toJSON()
            .then(function sucess(entry) {
                console.info("result\n\n\n");
                console.info(entry);
                // assert.ok((entry && entry.length), '"entry" wrapper present in the result.entry.');
                // assert.equal(entry[0], null, 'No entry[' + uid + '] found.');
                assert.ok((entry !== undefined), '"entry" wrapper present in the result.entry.');
                assert.equal(entry, null, 'No entry[' + uid + '] found.');
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entry :: .notExists("isspecial") error.' + err.message);
                // log.error('MultipleAssets entry :: .notExists("isspecial") error.' + err.stack);
                assert.fail(err.message);
                assert.end();
            });
    });*/
});