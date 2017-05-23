'use strict';

/**
 * Module Dependencies.
 */
var _ = require('lodash'),
    fs = require('fs'),
    path = require('path'),
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

test('[en-us]Database Find Operation', function (TC) {
    TC.test('All Source Entries :: find().then()', function (assert) {
        //setTimeout(function () {
        DB
            .ContentType(contentTypes.source)
            .language(defaultLocale)
            .Query()
            .toJSON()
            .find()
            .then(function success(entries) {
                // assert.plan(2);
                assert.ok(entries[0].length, '"entries" present in the resultset.');
                assert.equal(entries[0].length, 5, 'Five entries found.');
                var prev = entries[0][0]['published_at'];
                var sorting = entries[0].filter(function (entry) {
                    var flag = (prev >= entry.published_at);
                    prev = entry.published_at;
                    return flag;
                });
                assert.equal(entries[0].length, sorting.length, 'Descending "published_at" sorting is maintained.');
                assert.end();
            }, function error(err) {
                log.error('All Source Entries :: find() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
        //}, 1000);
    });

    TC.test('All Source Entries :: find()', function (assert) {
        //setTimeout(function () {
        DB
            .ContentType(contentTypes.source)
            .language(defaultLocale)
            .Query()
            .toJSON()
            .find()
            .spread(function success(entries) {
                // assert.plan(2);
                assert.ok(entries.length, '"entries" present in the resultset.');
                assert.equal(entries.length, 5, 'Five entries found.');
                var prev = entries[0]['published_at'];
                var sorting = entries.filter(function (entry) {
                    var flag = (prev >= entry.published_at);
                    prev = entry.published_at;
                    return flag;
                });
                assert.equal(entries.length, sorting.length, 'Descending "published_at" sorting is maintained.');
                assert.end();
            }, function error(err) {
                log.error('All Source Entries :: find() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
        //}, 1000);
    });

    TC.test('All Source Entries :: .ascending(\'created_at\')', function (assert) {
        DB
            .ContentType(contentTypes.source)
            .language(defaultLocale)
            .Query()
            .ascending('created_at')
            .toJSON()
            .find()
            .spread(function success(entries) {
                // assert.plan(2);
                assert.ok(entries.length, '"entries" present in the resultset.');
                assert.equal(entries.length, 5, 'Five entries found.');
                var prev = entries[0]['created_at'];
                var sorting = entries.filter(function (entry) {
                    var flag = (prev <= entry.created_at);
                    prev = entry.created_at;
                    return flag;
                });
                assert.equal(entries.length, sorting.length, 'Ascending "created_at" sorting is maintained.');
                assert.end();
            }, function error(err) {
                log.error('All Source Entries :: .ascending(\'created_at\') error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('All Source Entries :: .descending(\'updated_at\')', function (assert) {
        //setTimeout(function () {
        DB
            .ContentType(contentTypes.source)
            .language(defaultLocale)
            .Query()
            .descending('updated_at')
            .toJSON()
            .find()
            .spread(function success(entries) {
                // assert.plan(2);
                assert.ok(entries.length, '"entries" present in the resultset.');
                assert.equal(entries.length, 5, 'Five entries found.');
                var prev = entries[0]['updated_at'];
                var sorting = entries.filter(function (entry) {
                    var flag = (prev >= entry.updated_at);
                    prev = entry.updated_at;
                    return flag;
                });
                assert.equal(entries.length, sorting.length, 'Descending "updated_at" sorting is maintained.');
                assert.end();
            }, function error(err) {
                log.error('All Source Entries :: .descending(\'updated_at\') error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
        //}, 1000);
    });

    TC.test('Source entries :: .skip(1), .limit(2)', function (assert) {
        //setTimeout(function () {
        DB
            .ContentType(contentTypes.source)
            .language(defaultLocale)
            .Query()
            .toJSON()
            .find()
            .spread(function success(allEntries) {
                assert.ok(allEntries.length, '"entries" present in the result.');
                assert.equal(allEntries.length, 5, 'All(5) entries found.');
                var prev = allEntries[0]['published_at'];
                var sorting = allEntries.filter(function (entry) {
                    var flag = (prev >= entry.published_at);
                    prev = entry.published_at;
                    return flag;
                });
                assert.equal(allEntries.length, sorting.length, 'Descending "published_at" sorting is maintained.');
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
                        assert.deepEqual(allEntries.slice(1, 3), entries, 'Element skiped and limit worked.');
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
            }, function error(err) {
                log.error('Source entries :: .skip(1), .limit(2) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
        //}, 1000);
    });

    TC.test('Source Entries :: .where(\'reference.title\', \'ref1\')', function (assert) {
        DB
            .ContentType(contentTypes.source)
            .language(defaultLocale)
            .Query()
            .where('reference.title', 'ref1')
            .toJSON()
            .find()
            .spread(function success(entries) {
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

    TC.test('NumberContentType Entries greater than 6 :: .greaterThan(\'num_field\', 6)', function (assert) {
        DB
            .ContentType(contentTypes.numbers)
            .language(defaultLocale)
            .Query()
            .greaterThan('num_field', 6)
            .descending('num_field')
            .toJSON()
            .find()
            .spread(function success(entries) {
                assert.ok(entries.length, '"entries" present in the resultset.');
                assert.equal(entries.length, 2, 'Two entries found.');
                var prev = entries[0]['num_field'];
                var sorting = entries.filter(function (entry) {
                    var flag = (prev >= entry.num_field);
                    prev = entry.num_field;
                    return flag;
                });
                assert.equal(entries.length, sorting.length, 'Descending "num_field" sorting is maintained.');
                assert.end();
            }, function error(err) {
                log.error('NumberContentType Entries greater than 6 :: .greaterThan(\'num_field\', 6) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('NumberContentType Entries greater than equal to 6 :: .greaterThanEqualTo(\'num_field\', 6)', function (assert) {
        DB
            .ContentType(contentTypes.numbers)
            .language(defaultLocale)
            .Query()
            .greaterThanEqualTo('num_field', 6)
            .ascending('num_field')
            .toJSON()
            .find()
            .spread(function success(entries) {
                assert.ok(entries.length, '"entries" present in the resultset.');
                assert.equal(entries.length, 3, 'Three entries found.');
                var prev = entries[0]['num_field'];
                var sorting = entries.filter(function (entry) {
                    var flag = (prev <= entry.num_field);
                    prev = entry.num_field;
                    return flag;
                });
                assert.equal(entries.length, sorting.length, 'Ascending "num_field" sorting is maintained.');
                assert.end();
            }, function error(err) {
                log.error('NumberContentType Entries greater than equal to 6 :: .greaterThanEqualTo(\'num_field\', 6) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('NumberContentType Entries less than 11 :: .lessThan(\'num_field\', 11)', function (assert) {
        DB
            .ContentType(contentTypes.numbers)
            .language(defaultLocale)
            .Query()
            .lessThan('num_field', 11)
            .descending('num_field')
            .toJSON()
            .find()
            .spread(function success(entries) {
                assert.ok(entries.length, '"entries" present in the resultset.');
                assert.equal(entries.length, 1, 'One entry found.');
                assert.end();
            }, function error(err) {
                log.error('NumberContentType Entries less than 11 :: .lessThan(\'num_field\', 11) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('NumberContentType Entries less than equal to 11 :: .greaterThanEqualTo(\'num_field\', 11)', function (assert) {
        DB
            .ContentType(contentTypes.numbers)
            .language(defaultLocale)
            .Query()
            .greaterThanEqualTo('num_field', 11)
            .ascending('num_field')
            .toJSON()
            .find()
            .spread(function success(entries) {
                assert.ok(entries.length, '"entries" present in the resultset.');
                assert.equal(entries.length, 2, 'Two entries found.');
                var prev = entries[0]['num_field'];
                var sorting = entries.filter(function (entry) {
                    var flag = (prev <= entry.num_field);
                    prev = entry.num_field;
                    return flag;
                });
                assert.equal(entries.length, sorting.length, 'Ascending "num_field" sorting is maintained.');
                assert.end();
            }, function error(err) {
                log.error('NumberContentType Entries less than equal to 11 :: .greaterThanEqualTo(\'num_field\', 11) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('MultipleAssets entries :: .containedIn(\'title\', ["Multiple Assets", "Multiple Assets 2"])', function (assert) {
        var _in = ["Multiple Assets", "Multiple Assets 2"];
        DB
            .ContentType(contentTypes.contains)
            .language(defaultLocale)
            .Query()
            .containedIn('title', _in)
            .toJSON()
            .find()
            .spread(function success(entries) {
                assert.ok(entries.length, '"entries" present in the resultset.');
                assert.equal(entries.length, 2, 'Two entries found.');
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entries :: .containedIn(\'title\', ["Multiple Assets", "Multiple Assets 2"]) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('MultipleAssets entries :: .notContainedIn(\'title\',["Multiple Assets", "Multiple Assets 2"])', function (assert) {
        var _nin = ["Multiple Assets", "Multiple Assets 2"];
        DB
            .ContentType(contentTypes.contains)
            .language(defaultLocale)
            .Query()
            .notContainedIn('title', _nin)
            .toJSON()
            .find()
            .spread(function success(entries) {
                assert.notok(entries.length, '"entries" present in the resultset.');
                assert.equal(entries.length, 0, 'Zero entry found.');
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entries :: .notContainedIn(\'title\',["Multiple Assets", "Multiple Assets 2"]) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('MultipleAssets entries :: .notExists(\'isspecial\')', function (assert) {
        DB
            .ContentType(contentTypes.contains)
            .language(defaultLocale)
            .Query()
            .notExists('isspecial')
            .toJSON()
            .find()
            .spread(function success(entries) {
                assert.notok(entries.length, '"entries" present in the resultset.');
                assert.equal(entries.length, 0, 'Zero entry found.');
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entries :: .notExists(\'isspecial\') error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('MultipleAssets entries :: .exists(\'isspecial\')', function (assert) {
        DB
            .ContentType(contentTypes.contains)
            .language(defaultLocale)
            .Query()
            .exists('isspecial')
            .toJSON()
            .find()
            .spread(function success(entries) {
                assert.ok(entries.length, '"entries" present in the resultset.');
                assert.equal(entries.length, 2, 'Two entries found.');
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entries :: .exists(\'isspecial\') error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('Source entries :: .regex(\'title\', \'source\', \'gi\')', function (assert) {
        DB
            .ContentType(contentTypes.source)
            .language(defaultLocale)
            .Query()
            .regex('title', 'source', 'gi')
            .toJSON()
            .find()
            .spread(function success(entries) {
                assert.ok(entries.length, '"entries" present in the resultset.');
                assert.ok(entries.length, 'Result entries found.');
                var regex = new RegExp('source', 'gi');
                var flag = entries.filter(function (entry) {
                    return (entry.title && regex.test(entry.title));
                });
                assert.ok(flag, "All entries pass the regex test");
                assert.end();
            }, function error(err) {
                log.error('Source entries :: .regex(\'title\', \'source\', \'gi\') error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('Source entries :: .regex(\'title\', /source/gi)', function (assert) {
        var regex = new RegExp('source', 'gi');
        DB
            .ContentType(contentTypes.source)
            .language(defaultLocale)
            .Query()
            .regex('title', regex)
            .toJSON()
            .find()
            .spread(function success(entries) {
                assert.ok(entries.length, '"entries" present in the resultset.');
                assert.ok(entries.length, 'Result entries found.');
                var flag = entries.filter(function (entry) {
                    return (entry.title && regex.test(entry.title));
                });
                assert.ok(flag, "All entries pass the regex test");
                assert.end();
            }, function error(err) {
                log.error('Source entries :: .regex(\'title\', /source/gi) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('Source Entries :: .and((.where("reference.title", "ref1"), .where("other_reference.title", "Other ref1"))', function (assert) {
        var q1 = DB.ContentType(contentTypes.source).Query().where('reference.title', 'ref1');
        var q2 = DB.ContentType(contentTypes.source).Query().where('other_reference.title', 'Other ref1');

        DB
            .ContentType(contentTypes.source)
            .language(defaultLocale)
            .Query()
            .and(q1, q2)
            .toJSON()
            .find()
            .spread(function success(entries) {
                assert.ok(entries.length, '"entries" present in the resultset.');
                assert.ok(entries.length, 'Result entries exists.');
                var prev = entries[0]['published_at'],
                    refPresent = true,
                    otherRefPresent = true;
                var sorting = entries.filter(function (entry) {
                    var flag = (prev >= entry.published_at);
                    prev = entry.published_at;
                    if (!(entry && entry.reference && entry.reference.length && entry.reference[0].title == "ref1")) refPresent = false;
                    if (!(entry && entry.other_reference && entry.other_reference.length && entry.other_reference[0].title == "Other ref1")) otherRefPresent = false;
                    return flag;
                });
                assert.equal(entries.length, sorting.length, 'Descending "published_at" sorting is maintained.');
                assert.ok(refPresent, "'ref1' is present in all the fetched entries");
                assert.ok(otherRefPresent, "'Other ref1' is present in all the fetched entries");
                assert.end();
            }, function error(err) {
                log.error('Source Entries :: .and((.where("reference.title", "ref1"), .where("other_reference.title", "Other ref1")) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('Source Entries :: .or(.where("reference.title", "ref1"), .where("other_reference.title", "Other ref1"))', function (assert) {
        var q1 = DB.ContentType(contentTypes.source).Query().where('reference.title', 'ref1');
        var q2 = DB.ContentType(contentTypes.source).Query().where('other_reference.title', 'Other ref1');

        DB
            .ContentType(contentTypes.source)
            .language(defaultLocale)
            .Query()
            .or(q1, q2)
            .toJSON()
            .find()
            .spread(function success(entries) {
                assert.ok(entries.length, '"entries" present in the resultset.');
                assert.ok(entries.length, 'Result entry found.');
                if (entries.length) {
                    var prev = entries[0]['published_at'],
                        refPresent = false,
                        otherRefPresent = false;
                    var sorting = entries.filter(function (entry) {
                        var flag = (prev >= entry.published_at);
                        prev = entry.published_at;
                        if (!refPresent && entry && entry.reference && entry.reference.length && entry.reference[0].title == "ref1") refPresent = true;
                        if (!otherRefPresent && entry && entry.other_reference && entry.other_reference.length && entry.other_reference[0].title == "Other ref1") otherRefPresent = true;
                        return flag;
                    });
                    assert.equal(entries.length, sorting.length, 'Descending "published_at" sorting is maintained.');
                    assert.ok(refPresent, "'ref1' is present in one of the fetched entries");
                    assert.ok(otherRefPresent, "'Other ref1' is present in one of the fetched entries");
                }
                assert.end();
            }, function error(err) {
                log.error('Source Entries :: .or(.where("reference.title", "ref1"), .where("other_reference.title", "Other ref1")) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('Multiple Assets tags :: .tags(["tag1", "tag2"])', function (assert) {
        var _tags = ["workspace", "readwrite", "pic02"];
        DB
            .ContentType(contentTypes.contains)
            .language(defaultLocale)
            .Query()
            .tags(_tags)
            .toJSON()
            .find()
            .spread(function success(entries) {
                assert.ok(entries.length, '"entries" present in the resultset.');
                assert.ok(entries.length, 'Result entries exists.');
                var sorting = entries.filter(function (entry) {
                    return (_.intersection(_tags, entry.tags).length);
                });
                assert.equal(entries.length, sorting.length, 'Specified "tags" are found in result.');
                assert.end();
            }, function error(err) {
                log.error('Multiple Assets tags :: .tags(["tag1", "tag2"]) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });
});

test('[ja-jp]Database Find Operation', function (TC) {
    TC.test('All Source Entries :: find().then()', function (assert) {
        //setTimeout(function () {
        DB
            .ContentType(contentTypes.source)
            .language(locale)
            .Query()
            .toJSON()
            .find()
            .then(function success(entries) {
                // assert.plan(2);
                assert.ok(entries[0].length, '"entries" present in the resultset.');
                assert.equal(entries[0].length, 5, 'Five entries found.');
                var prev = entries[0][0]['published_at'];
                var sorting = entries[0].filter(function (entry) {
                    var flag = (prev >= entry.published_at);
                    prev = entry.published_at;
                    return flag;
                });
                assert.equal(entries[0].length, sorting.length, 'Descending "published_at" sorting is maintained.');
                assert.end();
            }, function error(err) {
                log.error('All Source Entries :: find() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
        //}, 1500);
    });

    TC.test('All Source Entries :: find()', function (assert) {
        //setTimeout(function () {
        DB
            .ContentType(contentTypes.source)
            .language(locale)
            .Query()
            .toJSON()
            .find()
            .spread(function success(entries) {
                // assert.plan(2);
                assert.ok(entries.length, '"entries" present in the resultset.');
                assert.equal(entries.length, 5, 'Five entries found.');
                var prev = entries[0]['published_at'];
                var sorting = entries.filter(function (entry) {
                    var flag = (prev >= entry.published_at);
                    prev = entry.published_at;
                    return flag;
                });
                assert.equal(entries.length, sorting.length, 'Descending "published_at" sorting is maintained.');
                assert.end();
            }, function error(err) {
                log.error('All Source Entries :: find() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
        //}, 1500);
    });

    TC.test('All Source Entries :: .ascending(\'created_at\')', function (assert) {
        //setTimeout(function () {
        DB
            .ContentType(contentTypes.source)
            .language(locale)
            .Query()
            .ascending('created_at')
            .toJSON()
            .find()
            .spread(function success(entries) {
                // assert.plan(2);
                assert.ok(entries.length, '"entries" present in the resultset.');
                assert.equal(entries.length, 5, 'Five entries found.');
                var prev = entries[0]['created_at'];
                var sorting = entries.filter(function (entry) {
                    var flag = (prev <= entry.created_at);
                    prev = entry.created_at;
                    return flag;
                });
                assert.equal(entries.length, sorting.length, 'Ascending "created_at" sorting is maintained.');
                assert.end();
            }, function error(err) {
                log.error('All Source Entries :: .ascending(\'created_at\') error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
        //}, 1000);
    });

    TC.test('All Source Entries :: .descending(\'updated_at\')', function (assert) {
        //setTimeout(function () {
        DB
            .ContentType(contentTypes.source)
            .language(locale)
            .Query()
            .descending('updated_at')
            .toJSON()
            .find()
            .spread(function success(entries) {
                // assert.plan(2);
                assert.ok(entries.length, '"entries" present in the resultset.');
                assert.equal(entries.length, 5, 'Five entries found.');
                var prev = entries[0]['updated_at'];
                var sorting = entries.filter(function (entry) {
                    var flag = (prev >= entry.updated_at);
                    prev = entry.updated_at;
                    return flag;
                });
                assert.equal(entries.length, sorting.length, 'Descending "updated_at" sorting is maintained.');
                assert.end();
            }, function error(err) {
                log.error('All Source Entries :: .descending(\'updated_at\') error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
        //}, 1000);
    });

    TC.test('Source entries :: .skip(1), .limit(2)', function (assert) {
        //setTimeout(function () {
        DB
            .ContentType(contentTypes.source)
            .language(locale)
            .Query()
            .toJSON()
            .find()
            .spread(function success(allEntries) {
                assert.ok(allEntries.length, '"entries" present in the result.');
                assert.equal(allEntries.length, 5, 'All(5) entries found.');
                var prev = allEntries[0]['published_at'];
                var sorting = allEntries.filter(function (entry) {
                    var flag = (prev >= entry.published_at);
                    prev = entry.published_at;
                    return flag;
                });
                assert.equal(allEntries.length, sorting.length, 'Descending "published_at" sorting is maintained.');
                DB
                    .ContentType(contentTypes.source)
                    .language(locale)
                    .Query()
                    .skip(1)
                    .limit(2)
                    .toJSON()
                    .find()
                    .spread(function success(entries) {
                        assert.ok(entries.length, '"entries" present in the resultset.');
                        assert.equal(entries.length, 2, '2 entries fetched.');
                        assert.deepEqual(allEntries.slice(1, 3), entries, 'Element skiped and limit worked.');
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
            }, function error(err) {
                log.error('Source entries :: .skip(1), .limit(2) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
        //}, 1000);
    });

    TC.test('Source Entries :: .where(\'reference.title\', \'ref1\')', function (assert) {
        DB
            .ContentType(contentTypes.source)
            .language(locale)
            .Query()
            .where('reference.title', 'ref1')
            .toJSON()
            .find()
            .spread(function success(entries) {
                assert.ok(entries.length, '"entries" present in the resultset.');
                assert.equal(entries.length, 1, 'One entry found.');
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

    TC.test('NumberContentType Entries greater than 6 :: .greaterThan(\'num_field\', 6)', function (assert) {
        DB
            .ContentType(contentTypes.numbers)
            .language(locale)
            .Query()
            .greaterThan('num_field', 6)
            .descending('num_field')
            .toJSON()
            .find()
            .spread(function success(entries) {
                assert.ok(entries.length, '"entries" present in the resultset.');
                assert.equal(entries.length, 2, 'Two entries found.');
                var prev = entries[0]['num_field'];
                var sorting = entries.filter(function (entry) {
                    var flag = (prev >= entry.num_field);
                    prev = entry.num_field;
                    return flag;
                });
                assert.equal(entries.length, sorting.length, 'Descending "num_field" sorting is maintained.');
                assert.end();
            }, function error(err) {
                log.error('NumberContentType Entries greater than 6 :: .greaterThan(\'num_field\', 6) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('NumberContentType Entries greater than equal to 6 :: .greaterThanEqualTo(\'num_field\', 6)', function (assert) {
        DB
            .ContentType(contentTypes.numbers)
            .language(locale)
            .Query()
            .greaterThanEqualTo('num_field', 6)
            .ascending('num_field')
            .toJSON()
            .find()
            .spread(function success(entries) {
                assert.ok(entries.length, '"entries" present in the resultset.');
                assert.equal(entries.length, 3, 'Three entries found.');
                var prev = entries[0]['num_field'];
                var sorting = entries.filter(function (entry) {
                    var flag = (prev <= entry.num_field);
                    prev = entry.num_field;
                    return flag;
                });
                assert.equal(entries.length, sorting.length, 'Ascending "num_field" sorting is maintained.');
                assert.end();
            }, function error(err) {
                log.error('NumberContentType Entries greater than equal to 6 :: .greaterThanEqualTo(\'num_field\', 6) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('NumberContentType Entries less than 11 :: .lessThan(\'num_field\', 11)', function (assert) {
        DB
            .ContentType(contentTypes.numbers)
            .language(locale)
            .Query()
            .lessThan('num_field', 11)
            .descending('num_field')
            .toJSON()
            .find()
            .spread(function success(entries) {
                assert.ok(entries.length, '"entries" present in the resultset.');
                assert.equal(entries.length, 1, 'One entry found.');
                assert.end();
            }, function error(err) {
                log.error('NumberContentType Entries less than 11 :: .lessThan(\'num_field\', 11) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('NumberContentType Entries less than equal to 11 :: .greaterThanEqualTo(\'num_field\', 11)', function (assert) {
        DB
            .ContentType(contentTypes.numbers)
            .language(locale)
            .Query()
            .greaterThanEqualTo('num_field', 11)
            .ascending('num_field')
            .toJSON()
            .find()
            .spread(function success(entries) {
                assert.ok(entries.length, '"entries" present in the resultset.');
                assert.equal(entries.length, 2, 'Two entries found.');
                var prev = entries[0]['num_field'];
                var sorting = entries.filter(function (entry) {
                    var flag = (prev <= entry.num_field);
                    prev = entry.num_field;
                    return flag;
                });
                assert.equal(entries.length, sorting.length, 'Ascending "num_field" sorting is maintained.');
                assert.end();
            }, function error(err) {
                log.error('NumberContentType Entries less than equal to 11 :: .greaterThanEqualTo(\'num_field\', 11) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('MultipleAssets entries :: .containedIn(\'title\', ["Multiple Assets", "Multiple Assets 2"])', function (assert) {
        var _in = ["Multiple Assets", "Multiple Assets 2"];
        DB
            .ContentType(contentTypes.contains)
            .language(locale)
            .Query()
            .containedIn('title', _in)
            .toJSON()
            .find()
            .spread(function success(entries) {
                assert.ok(entries.length, '"entries" present in the resultset.');
                assert.equal(entries.length, 2, 'Two entries found.');
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entries :: .containedIn(\'title\', ["Multiple Assets", "Multiple Assets 2"]) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('MultipleAssets entries :: .notContainedIn(\'title\',["Multiple Assets", "Multiple Assets 2"])', function (assert) {
        var _nin = ["Multiple Assets", "Multiple Assets 2"];
        DB
            .ContentType(contentTypes.contains)
            .language(locale)
            .Query()
            .notContainedIn('title', _nin)
            .toJSON()
            .find()
            .spread(function success(entries) {
                assert.notok(entries.length, '"entries" present in the resultset.');
                assert.equal(entries.length, 0, 'Zero entry found.');
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entries :: .notContainedIn(\'title\',["Multiple Assets", "Multiple Assets 2"]) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('MultipleAssets entries :: .notExists(\'isspecial\')', function (assert) {
        DB
            .ContentType(contentTypes.contains)
            .language(locale)
            .Query()
            .notExists('isspecial')
            .toJSON()
            .find()
            .spread(function success(entries) {
                //console.log("====", result);
                assert.notok(entries.length, '"entries" present in the resultset.');
                assert.equal(entries.length, 0, 'Zero entry found.');
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entries :: .notExists(\'isspecial\') error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('MultipleAssets entries :: .exists(\'isspecial\')', function (assert) {
        DB
            .ContentType(contentTypes.contains)
            .language(locale)
            .Query()
            .exists('isspecial')
            .toJSON()
            .find()
            .spread(function success(entries) {
                assert.ok(entries.length, '"entries" present in the resultset.');
                assert.equal(entries.length, 2, 'Two entries found.');
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entries :: .exists(\'isspecial\') error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('Source entries :: .regex(\'title\', \'source\', \'gi\')', function (assert) {
        DB
            .ContentType(contentTypes.source)
            .language(locale)
            .Query()
            .regex('title', 'source', 'gi')
            .toJSON()
            .find()
            .spread(function success(entries) {
                assert.ok(entries.length, '"entries" present in the resultset.');
                assert.ok(entries.length, 'Result entries found.');
                var regex = new RegExp('source', 'gi');
                var flag = entries.filter(function (entry) {
                    return (entry.title && regex.test(entry.title));
                });
                assert.ok(flag, "All entries pass the regex test");
                assert.end();
            }, function error(err) {
                log.error('Source entries :: .regex(\'title\', \'source\', \'gi\') error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('Source entries :: .regex(\'title\', /source/gi)', function (assert) {
        var regex = new RegExp('source', 'gi');
        DB
            .ContentType(contentTypes.source)
            .language(locale)
            .Query()
            .regex('title', regex)
            .toJSON()
            .find()
            .spread(function success(entries) {
                assert.ok(entries.length, '"entries" present in the resultset.');
                assert.ok(entries.length, 'Result entries found.');
                var flag = entries.filter(function (entry) {
                    return (entry.title && regex.test(entry.title));
                });
                assert.ok(flag, "All entries pass the regex test");
                assert.end();
            }, function error(err) {
                log.error('Source entries :: .regex(\'title\', /source/gi) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('Source Entries :: .and((.where("reference.title", "ref1"), .where("other_reference.title", "Other ref2"))', function (assert) {
        var q1 = DB.ContentType(contentTypes.source).Query().where('reference.title', 'ref1');
        var q2 = DB.ContentType(contentTypes.source).Query().where('other_reference.title', 'Other ref2');

        DB
            .ContentType(contentTypes.source)
            .language(locale)
            .Query()
            .and(q1, q2)
            .toJSON()
            .find()
            .spread(function success(entries) {
                assert.ok(entries.length, '"entries" present in the resultset.');
                assert.ok(entries.length, 'Result entries exists.');
                var prev = entries[0]['published_at'],
                    refPresent = true,
                    otherRefPresent = true;
                var sorting = entries.filter(function (entry) {
                    var flag = (prev >= entry.published_at);
                    prev = entry.published_at;
                    if (!(entry && entry.reference && entry.reference.length && entry.reference[0].title == "ref1")) refPresent = false;
                    if (!(entry && entry.other_reference && entry.other_reference.length && entry.other_reference[0].title == "Other ref2")) otherRefPresent = false;
                    return flag;
                });
                assert.equal(entries.length, sorting.length, 'Descending "published_at" sorting is maintained.');
                assert.ok(refPresent, "'ref1' is present in all the fetched entries");
                assert.ok(otherRefPresent, "'Other ref2' is present in all the fetched entries");
                assert.end();
            }, function error(err) {
                log.error('Source Entries :: .and((.where("reference.title", "ref1"), .where("other_reference.title", "Other ref2")) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('Source Entries :: .or(.where("reference.title", "ref1"), .where("other_reference.title", "Other ref1"))', function (assert) {
        var q1 = DB.ContentType(contentTypes.source).Query().where('reference.title', 'ref1');
        var q2 = DB.ContentType(contentTypes.source).Query().where('other_reference.title', 'Other ref1');

        DB
            .ContentType(contentTypes.source)
            .language(locale)
            .Query()
            .or(q1, q2)
            .toJSON()
            .find()
            .spread(function success(entries) {
                assert.ok(entries.length, '"entries" present in the resultset.');
                assert.ok(entries.length, 'Result entry found.');
                if (entries.length) {
                    var prev = entries[0]['published_at'],
                        refPresent = false,
                        otherRefPresent = false;
                    var sorting = entries.filter(function (entry) {
                        var flag = (prev >= entry.published_at);
                        prev = entry.published_at;
                        if (!refPresent && entry && entry.reference && entry.reference.length && entry.reference[0].title == "ref1") refPresent = true;
                        if (!otherRefPresent && entry && entry.other_reference && entry.other_reference.length && entry.other_reference[0].title == "Other ref1") otherRefPresent = true;
                        return flag;
                    });
                    assert.equal(entries.length, sorting.length, 'Descending "published_at" sorting is maintained.');
                    assert.ok((refPresent || otherRefPresent), "either 'ref1' or 'Other ref1' is present in one of the fetched entries");
                }
                assert.end();
            }, function error(err) {
                log.error('Source Entries :: .or(.where("reference.title", "ref1"), .where("other_reference.title", "Other ref1")) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('Multiple Assets tags :: .tags(["tag1", "tag2"])', function (assert) {
        var _tags = ["workspace", "readwrite", "pic02"];
        DB
            .ContentType(contentTypes.contains)
            .language(locale)
            .Query()
            .tags(_tags)
            .toJSON()
            .find()
            .spread(function success(entries) {
                assert.ok(entries.length, '"entries" present in the resultset.');
                assert.ok(entries.length, 'Result entries exists.');
                var sorting = entries.filter(function (entry) {
                    return (_.intersection(_tags, entry.tags).length);
                });
                assert.equal(entries.length, sorting.length, 'Specified "tags" are found in result.');
                assert.end();
            }, function error(err) {
                log.error('Multiple Assets tags :: .tags(["tag1", "tag2"]) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });
});

test('[en-us]Database Findone Operation', function (TC) {
    TC.test('Single Source Entry :: .findOne().spread()', function (assert) {
        //setTimeout(function() {
        DB
            .ContentType(contentTypes.source)
            .language(defaultLocale)
            .Query()
            .toJSON()
            .findOne()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the result entry.');
                assert.notEqual(entry, null, 'Single entry exists.');
                assert.end();
            }, function error(err) {
                log.error('Single Source Entry :: .findOne() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
        //}, 1000);
    });

    TC.test('Single Source Entry :: .findOne()', function (assert) {
        //setTimeout(function() {
        DB
            .ContentType(contentTypes.source)
            .language(defaultLocale)
            .Query()
            .toJSON()
            .findOne()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the result entry.');
                assert.notEqual(entry, null, 'Single entry exists.');
                assert.end();
            }, function error(err) {
                log.error('Single Source Entry :: .findOne() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
        //}, 1000);
    });

    TC.test('Source Entry :: .where(\'reference.title\', \'ref1\')', function (assert) {
        DB
            .ContentType(contentTypes.source)
            .language(defaultLocale)
            .Query()
            .where('reference.title', 'ref1')
            .toJSON()
            .findOne()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the result entry.');
                assert.notEqual(entry, null, 'Single entry exists.');
                assert.equal(entry.reference[0]['title'], "ref1", '"ref1" exists as the reference field value.');
                assert.end();
            }, function error(err) {
                log.error('Source Entry :: .where(\'reference.title\', \'ref1\') error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('Source entry :: .and((.where("reference.title", "ref1"), .where("other_reference.title", "Other ref2"))', function (assert) {
        var q1 = DB.ContentType(contentTypes.source).Query().where('reference.title', 'ref1');
        var q2 = DB.ContentType(contentTypes.source).Query().where('other_reference.title', 'Other ref2');

        DB
            .ContentType(contentTypes.source)
            .language(defaultLocale)
            .Query()
            .and(q1, q2)
            .toJSON()
            .findOne()
            .then(function success(entry) {
                //console.log("====", entry);
                assert.ok(entry, '"entry" present in the result entry.');
                assert.notEqual(entry, null, 'Single entry exists.');
                if (entry) {
                    assert.equal(entry.reference[0]['title'], "ref1", '"ref1" exists as the reference field value.');
                    assert.equal(entry.other_reference[0]['title'], "Other ref2", '"Other ref2" exists as the other_reference field value.');
                }
                assert.end();
            }, function error(err) {
                log.error('Source entry :: .and((.where("reference.title", "ref1"), .where("other_reference.title", "Other ref2")) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('Source entry :: .or(.where("reference.title", "ref1"), .where("other_reference.title", "Other ref1"))', function (assert) {
        var q1 = DB.ContentType(contentTypes.source).Query().where('reference.title', 'ref1');
        var q2 = DB.ContentType(contentTypes.source).Query().where('other_reference.title', 'Other ref1');

        DB
            .ContentType(contentTypes.source)
            .Query()
            .or(q1, q2)
            .toJSON()
            .findOne()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the result entry.');
                assert.notEqual(entry, null, 'Single entry exists.');
                if (entry) {
                    assert.equal(entry.reference[0]['title'], "ref1", '"ref1" exists as the reference field value.');
                    assert.equal(entry.other_reference[0]['title'], "Other ref1", '"Other ref1" exists as the other_reference field value.');
                }
                assert.end();
            }, function error(err) {
                log.error('Source Entries :: .or(.where("reference.title", "ref1"), .where("other_reference.title", "Other ref1")) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('NumberContentType :: .greaterThan("num_field", 6)', function (assert) {
        DB
            .ContentType(contentTypes.numbers)
            .language(defaultLocale)
            .Query()
            .greaterThan('num_field', 6)
            .ascending('num_field')
            .toJSON()
            .findOne()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the result entry.');
                assert.notEqual(entry, null, 'Single entry exists.');
                if (entry) {
                    assert.equal((entry.num_field > 6), true, 'Num_field value is greated than 6');
                }
                assert.end();
            }, function error(err) {
                log.error('NumberContentType :: .greaterThan("num_field", 6) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('NumberContentType entry :: .greaterThanEqualTo(\'num_field\', 6)', function (assert) {
        DB
            .ContentType(contentTypes.numbers)
            .language(defaultLocale)
            .Query()
            .greaterThanEqualTo('num_field', 6)
            .descending('num_field')
            .toJSON()
            .findOne()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the result entry.');
                assert.notEqual(entry, null, 'Single entry exists.');
                if (entry) {
                    assert.equal((entry.num_field >= 6), true, 'Num_field value is greated than equal to 6');
                }
                assert.end();
            }, function error(err) {
                log.error('NumberContentType entry :: .greaterThanEqualTo(\'num_field\', 6) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('NumberContentType entry :: .lessThan("num_field", 11)', function (assert) {
        DB
            .ContentType(contentTypes.numbers)
            .language(defaultLocale)
            .Query()
            .lessThan('num_field', 11)
            .ascending('num_field')
            .toJSON()
            .findOne()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the result entry.');
                assert.notEqual(entry, null, 'Single entry exists.');
                if (entry) {
                    assert.equal((entry.num_field < 11), true, 'Num_field value is less than 11');
                }
                assert.end();
            }, function error(err) {
                log.error('NumberContentType entry :: .lessThan("num_field", 11) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('NumberContentType entry :: .lessThanEqualTo("num_field", 11)', function (assert) {
        DB
            .ContentType(contentTypes.numbers)
            .language(defaultLocale)
            .Query()
            .lessThanEqualTo('num_field', 11)
            .descending('num_field')
            .toJSON()
            .findOne()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the result entry.');
                assert.notEqual(entry, null, 'Single entry exists.');
                if (entry) {
                    assert.equal((entry.num_field <= 11), true, 'Num_field value is less than equal to 11');
                }
                assert.end();
            }, function error(err) {
                log.error('NumberContentType entry :: .lessThanEqualTo("num_field", 11) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('MultipleAssets entry :: .containedIn("title", ["Multiple Assets", "Multiple Assets 2"])', function (assert) {
        var _in = ["Multiple Assets", "Multiple Assets 2"];
        DB
            .ContentType(contentTypes.contains)
            .language(defaultLocale)
            .Query()
            .containedIn('title', _in)
            .toJSON()
            .findOne()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the result entry.');
                assert.notEqual(entry, null, 'Single entry exists.');
                if (entry) {
                    assert.equal((_in.indexOf(entry.title) > -1), true, 'Entry has the one of the title from ' + _in.join(', '));
                }
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entry :: .containedIn("title", ["Multiple Assets", "Multiple Assets 2"]) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('MultipleAssets entry :: .notContainedIn("title", ["Multiple Assets", "Multiple Assets 2"])', function (assert) {
        var _nin = ["Multiple Assetss", "Multiple Asset"];
        DB
            .ContentType(contentTypes.contains)
            .language(defaultLocale)
            .Query()
            .notContainedIn('title', _nin)
            .toJSON()
            .findOne()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the result entry.');
                assert.notEqual(entry, null, 'Single entry exists.');
                if (entry) {
                    assert.equal((_nin.indexOf(entry.title) == -1), true, 'Entry has the none of the title from ' + _nin.join(', '));
                }
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entry :: .notContainedIn("title", ["Multiple Assets", "Multiple Assets 2"]) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('MultipleAssets entry :: .notExists("isspecial")', function (assert) {
        DB
            .ContentType(contentTypes.contains)
            .language(defaultLocale)
            .Query()
            .notExists('isspecial')
            .toJSON()
            .findOne()
            .then(function success(entry) {
                assert.notok(entry, '"entry" present in the result entry.');
                assert.equal(entry, null, 'No entry found.');
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entry :: .notExists("isspecial") error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('MultipleAssets entry :: .exists("isspecial")', function (assert) {
        DB
            .ContentType(contentTypes.contains)
            .language(defaultLocale)
            .Query()
            .exists('isspecial')
            .toJSON()
            .findOne()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the result entry.');
                assert.notEqual(entry, null, 'Single entry exists.');
                if (entry) {
                    assert.equal(typeof entry.isspecial, "boolean", 'Entry has the "isspecial" with boolean value');
                }
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entry :: .exists("isspecial") error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('Multiple Assets tags :: .tags(["tag1", "tag2"])', function (assert) {
        var _tags = ["workspace", "readwrite", "pic02"];
        DB
            .ContentType(contentTypes.contains)
            .language(defaultLocale)
            .Query()
            .tags(_tags)
            .toJSON()
            .findOne()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the result entry.');
                assert.notEqual(entry, null, 'Single entry exists.');
                if (entry) {
                    assert.ok(_.intersection(_tags, entry.tags).length, 'Specified "tags" are found in entry.');
                }
                assert.end();
            }, function error(err) {
                log.error('Multiple Assets tags :: .tags(["tag1", "tag2"]) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });
});

test('[ja-jp]Database Findone Operation', function (TC) {
    TC.test('Single Source Entry :: .findOne().spread()', function (assert) {
        DB
            .ContentType(contentTypes.source)
            .language(locale)
            .Query()
            .toJSON()
            .findOne()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the result entry.');
                assert.notEqual(entry, null, 'Single entry exists.');
                assert.end();
            }, function error(err) {
                log.error('Single Source Entry :: .findOne() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('Single Source Entry :: .findOne()', function (assert) {
        //setTimeout(function() {
        DB
            .ContentType(contentTypes.source)
            .language(locale)
            .Query()
            .toJSON()
            .findOne()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the result entry.');
                assert.notEqual(entry, null, 'Single entry exists.');
                assert.end();
            }, function error(err) {
                log.error('Single Source Entry :: .findOne() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
        //}, 1000);
    });

    TC.test('Source Entry :: .where(\'reference.title\', \'ref1\')', function (assert) {
        DB
            .ContentType(contentTypes.source)
            .language(locale)
            .Query()
            .where('reference.title', 'ref1')
            .toJSON()
            .findOne()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the result entry.');
                assert.notEqual(entry, null, 'Single entry exists.');
                assert.equal(entry.reference[0]['title'], "ref1", '"ref1" exists as the reference field value.');
                assert.end();
            }, function error(err) {
                log.error('Source Entry :: .where(\'reference.title\', \'ref1\') error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('Source entry :: .and((.where("reference.title", "ref1"), .where("other_reference.title", "Other ref2"))', function (assert) {
        var q1 = DB.ContentType(contentTypes.source).Query().where('reference.title', 'ref1');
        var q2 = DB.ContentType(contentTypes.source).Query().where('other_reference.title', 'Other ref2');

        DB
            .ContentType(contentTypes.source)
            .language(locale)
            .Query()
            .and(q1, q2)
            .toJSON()
            .findOne()
            .then(function success(entry) {
                // console.log("====", entry);
                assert.ok(entry, '"entry" present in the result entry.');
                assert.notEqual(entry, null, 'Single entry exists.');
                if (entry) {
                    assert.equal(entry.reference[0]['title'], "ref1", '"ref1" exists as the reference field value.');
                    assert.equal(entry.other_reference[0]['title'], "Other ref2", '"Other ref2" exists as the other_reference field value.');
                }
                assert.end();
            }, function error(err) {
                log.error('Source entry :: .and((.where("reference.title", "ref1"), .where("other_reference.title", "Other ref2")) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('Source entry :: .or(.where("reference.title", "ref1"), .where("other_reference.title", "Other ref1"))', function (assert) {
        var q1 = DB.ContentType(contentTypes.source).Query().where('reference.title', 'ref1');
        var q2 = DB.ContentType(contentTypes.source).Query().where('other_reference.title', 'Other ref1');

        DB
            .ContentType(contentTypes.source)
            .language(locale)
            .Query()
            .or(q1, q2)
            .toJSON()
            .findOne()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the result entry.');
                assert.notEqual(entry, null, 'Single entry exists.');
                if (entry) {
                    var refPresent = (entry.reference && entry.reference.length && entry.reference[0]['title'] === 'ref1') ? true : false,
                        otherRefPresent = (entry.other_reference && entry.other_reference.length && entry.other_reference['title'] === 'Other ref1') ? true : false;
                    assert.ok((refPresent || otherRefPresent), "either 'ref1' or 'Other ref1' is present in one of the fetched entries");
                }
                assert.end();
            }, function error(err) {
                log.error('Source Entries :: .or(.where("reference.title", "ref1"), .where("other_reference.title", "Other ref1")) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('NumberContentType :: .greaterThan("num_field", 6)', function (assert) {
        DB
            .ContentType(contentTypes.numbers)
            .language(locale)
            .Query()
            .greaterThan('num_field', 6)
            .ascending('num_field')
            .toJSON()
            .findOne()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the result entry.');
                assert.notEqual(entry, null, 'Single entry exists.');
                if (entry) {
                    assert.equal((entry.num_field > 6), true, 'Num_field value is greated than 6');
                }
                assert.end();
            }, function error(err) {
                log.error('NumberContentType :: .greaterThan("num_field", 6) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('NumberContentType entry :: .greaterThanEqualTo(\'num_field\', 6)', function (assert) {
        DB
            .ContentType(contentTypes.numbers)
            .language(locale)
            .Query()
            .greaterThanEqualTo('num_field', 6)
            .descending('num_field')
            .toJSON()
            .findOne()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the result entry.');
                assert.notEqual(entry, null, 'Single entry exists.');
                if (entry) {
                    assert.equal((entry.num_field >= 6), true, 'Num_field value is greated than equal to 6');
                }
                assert.end();
            }, function error(err) {
                log.error('NumberContentType entry :: .greaterThanEqualTo(\'num_field\', 6) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('NumberContentType entry :: .lessThan("num_field", 11)', function (assert) {
        DB
            .ContentType(contentTypes.numbers)
            .language(locale)
            .Query()
            .lessThan('num_field', 11)
            .ascending('num_field')
            .toJSON()
            .findOne()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the result entry.');
                assert.notEqual(entry, null, 'Single entry exists.');
                if (entry) {
                    assert.equal((entry.num_field < 11), true, 'Num_field value is less than 11');
                }
                assert.end();
            }, function error(err) {
                log.error('NumberContentType entry :: .lessThan("num_field", 11) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('NumberContentType entry :: .lessThanEqualTo("num_field", 11)', function (assert) {
        DB
            .ContentType(contentTypes.numbers)
            .language(locale)
            .Query()
            .lessThanEqualTo('num_field', 11)
            .descending('num_field')
            .toJSON()
            .findOne()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the result entry.');
                assert.notEqual(entry, null, 'Single entry exists.');
                if (entry) {
                    assert.equal((entry.num_field <= 11), true, 'Num_field value is less than equal to 11');
                }
                assert.end();
            }, function error(err) {
                log.error('NumberContentType entry :: .lessThanEqualTo("num_field", 11) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('MultipleAssets entry :: .containedIn("title", ["Multiple Assets", "Multiple Assets 2"])', function (assert) {
        var _in = ["Multiple Assets", "Multiple Assets 2"];
        DB
            .ContentType(contentTypes.contains)
            .language(locale)
            .Query()
            .containedIn('title', _in)
            .toJSON()
            .findOne()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the result entry.');
                assert.notEqual(entry, null, 'Single entry exists.');
                if (entry) {
                    assert.equal((_in.indexOf(entry.title) > -1), true, 'Entry has the one of the title from ' + _in.join(', '));
                }
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entry :: .containedIn("title", ["Multiple Assets", "Multiple Assets 2"]) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('MultipleAssets entry :: .notContainedIn("title", ["Multiple Assets", "Multiple Assets 2"])', function (assert) {
        var _nin = ["Multiple Assetss", "Multiple Asset"];
        DB
            .ContentType(contentTypes.contains)
            .language(locale)
            .Query()
            .notContainedIn('title', _nin)
            .toJSON()
            .findOne()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the result entry.');
                assert.notEqual(entry, null, 'Single entry exists.');
                if (entry) {
                    assert.equal((_nin.indexOf(entry.title) == -1), true, 'Entry has the none of the title from ' + _nin.join(', '));
                }
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entry :: .notContainedIn("title", ["Multiple Assets", "Multiple Assets 2"]) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('MultipleAssets entry :: .notExists("isspecial")', function (assert) {
        DB
            .ContentType(contentTypes.contains)
            .language(locale)
            .Query()
            .notExists('isspecial')
            .toJSON()
            .findOne()
            .then(function success(entry) {
                assert.notok(entry, '"entry" present in the result entry.');
                assert.equal(entry, null, 'No entry found.');
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entry :: .notExists("isspecial") error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('MultipleAssets entry :: .exists("isspecial")', function (assert) {
        DB
            .ContentType(contentTypes.contains)
            .language(locale)
            .Query()
            .exists('isspecial')
            .toJSON()
            .findOne()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the result entry.');
                assert.notEqual(entry, null, 'Single entry exists.');
                if (entry) {
                    assert.equal(typeof entry.isspecial, "boolean", 'Entry has the "isspecial" with boolean value');
                }
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entry :: .exists("isspecial") error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('Multiple Assets tags :: .tags(["tag1", "tag2"])', function (assert) {
        var _tags = ["workspace", "readwrite", "pic02"];
        DB
            .ContentType(contentTypes.contains)
            .language(locale)
            .Query()
            .tags(_tags)
            .toJSON()
            .findOne()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the result entry.');
                assert.notEqual(entry, null, 'Single entry exists.');
                if (entry) {
                    assert.ok(_.intersection(_tags, entry.tags).length, 'Specified "tags" are found in entry.');
                }
                assert.end();
            }, function error(err) {
                log.error('Multiple Assets tags :: .tags(["tag1", "tag2"]) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });
});

test('[en-us]Database Fetch Operation', function (TC) {
    var uid;
    TC.test('Single Source Entry :: .fetch().spread() - result methods', function (assert) {
        uid = 'blt23bac68b63bf150f';
        // setTimeout(function() {
        DB
            .ContentType(contentTypes.source)
            .language(defaultLocale)
            .Entry(uid)
            .fetch()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the resultset.');
                assert.notEqual(entry.toJSON(), null, 'Single ' + uid + ' entry exists.');
                assert.equal(entry.get('uid'), uid, 'Entry UID matched');
                assert.end();
            }, function error(err) {
                log.error('Single Source Entry :: .fetch() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
        // }, 1000);
    });

    TC.test('Single Source Entry :: .fetch()', function (assert) {
        uid = 'blt23bac68b63bf150f';
        // setTimeout(function() {
        DB
            .ContentType(contentTypes.source)
            .language(defaultLocale)
            .Entry(uid)
            .toJSON()
            .fetch()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the resultset.');
                assert.notEqual(entry, null, 'Single ' + uid + ' entry exists.');
                assert.equal(entry.uid, uid, 'Entry UID matched');
                assert.end();
            }, function error(err) {
                log.error('Single Source Entry :: .fetch() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
        // }, 1000);
    });

    TC.test('Source Entry :: .where(\'reference.title\', \'ref1\')', function (assert) {
        uid = 'blte21d52cf765913e8';
        DB
            .ContentType(contentTypes.source)
            .language(defaultLocale)
            .Entry(uid)
            .where('reference.title', 'ref1')
            .toJSON()
            .fetch()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the resultset.');
                assert.notEqual(entry, null, 'Single ' + uid + ' entry exists.');
                assert.equal(entry.uid, uid, 'Entry UID matched');
                assert.equal(entry.reference[0]['title'], "ref1", '"ref1" exists as the reference field value.');
                assert.end();
            }, function error(err) {
                log.error('Source Entry :: .where(\'reference.title\', \'ref1\') error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('Source entry :: .and((.where("reference.title", "ref1"), .where("other_reference.title", "Other ref2"))', function (assert) {
        var q1 = DB.ContentType(contentTypes.source).Query().where('reference.title', 'ref1');
        var q2 = DB.ContentType(contentTypes.source).Query().where('other_reference.title', 'Other ref2');

        uid = 'blt5cbb9523685c42bf';
        DB
            .ContentType(contentTypes.source)
            .language(defaultLocale)
            .Entry(uid)
            .and(q1, q2)
            .toJSON()
            .fetch()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the resultset.');
                assert.notEqual(entry, null, 'Single ' + uid + ' entry exists.');
                if (entry) {
                    assert.equal(entry.uid, uid, 'Entry UID matched');
                    assert.equal(entry.reference[0]['title'], "ref1", '"ref1" exists as the reference field value.');
                    assert.equal(entry.other_reference[0]['title'], "Other ref2", '"Other ref2" exists as the other_reference field value.');
                }
                assert.end();
            }, function error(err) {
                log.error('Source entry :: .and((.where("reference.title", "ref1"), .where("other_reference.title", "Other ref2")) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('Source entry :: .or(.where("reference.title", "ref1"), .where("other_reference.title", "Other ref1"))', function (assert) {
        var q1 = DB.ContentType(contentTypes.source).Query().where('reference.title', 'ref1');
        var q2 = DB.ContentType(contentTypes.source).Query().where('other_reference.title', 'Other ref1');

        uid = 'blte21d52cf765913e8';
        DB
            .ContentType(contentTypes.source)
            .language(defaultLocale)
            .Entry(uid)
            .or(q1, q2)
            .toJSON()
            .fetch()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the resultset.');
                assert.notEqual(entry, null, 'Entry ' + uid + ' entry exists.');
                if (entry) {
                    assert.equal(entry.uid, uid, 'Entry UID matched');
                    var refPresent = (entry.reference && entry.reference.length && entry.reference[0]['title'] === 'ref1') ? true : false,
                        otherRefPresent = (entry.other_reference && entry.other_reference.length && entry.other_reference['title'] === 'Other ref1') ? true : false;
                    assert.ok((refPresent || otherRefPresent), "either 'ref1' or 'Other ref1' is present in one of the fetched entries");
                }
                assert.end();
            }, function error(err) {
                log.error('Source entry :: .or(.where("reference.title", "ref1"), .where("other_reference.title", "Other ref1")) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('NumberContentType :: .greaterThan("num_field", 6)', function (assert) {
        uid = 'blt2416f4ad5da1eeee';
        DB
            .ContentType(contentTypes.numbers)
            .language(defaultLocale)
            .Entry(uid)
            .greaterThan('num_field', 6)
            .ascending('num_field')
            .toJSON()
            .fetch()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the resultset.');
                assert.notEqual(entry, null, 'Single ' + uid + ' entry exists.');
                if (entry) {
                    assert.equal(entry.uid, uid, 'Entry UID matched');
                    assert.equal((entry.num_field > 6), true, 'Num_field value is greated than 6');
                }
                assert.end();
            }, function error(err) {
                log.error('NumberContentType :: .greaterThan("num_field", 6) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('NumberContentType entry :: .greaterThanEqualTo(\'num_field\', 6)', function (assert) {
        uid = 'bltaaa2eeb1dafcb128';
        DB
            .ContentType(contentTypes.numbers)
            .language(defaultLocale)
            .Entry(uid)
            .greaterThanEqualTo('num_field', 6)
            .descending('num_field')
            .toJSON()
            .fetch()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the resultset.');
                assert.notEqual(entry, null, 'Single ' + uid + ' entry exists.');
                if (entry) {
                    assert.equal(entry.uid, uid, 'Entry UID matched');
                    assert.equal((entry.num_field >= 6), true, 'Num_field value is greated than equal to 6');
                }
                assert.end();
            }, function error(err) {
                log.error('NumberContentType entry :: .greaterThanEqualTo(\'num_field\', 6) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('NumberContentType entry :: .lessThan("num_field", 11)', function (assert) {
        uid = 'bltaaa2eeb1dafcb128';
        DB
            .ContentType(contentTypes.numbers)
            .language(defaultLocale)
            .Entry(uid)
            .lessThan('num_field', 11)
            .ascending('num_field')
            .toJSON()
            .fetch()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the resultset.');
                assert.notEqual(entry, null, 'Single ' + uid + ' entry exists.');
                if (entry) {
                    assert.equal(entry.uid, uid, 'Entry UID matched');
                    assert.equal((entry.num_field < 11), true, 'Num_field value is less than 11');
                }
                assert.end();
            }, function error(err) {
                log.error('NumberContentType entry :: .lessThan("num_field", 11) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('NumberContentType entry :: .lessThanEqualTo("num_field", 11)', function (assert) {
        uid = 'blt511c2bf6611e7ec8';
        DB
            .ContentType(contentTypes.numbers)
            .language(defaultLocale)
            .Entry(uid)
            .lessThanEqualTo('num_field', 11)
            .descending('num_field')
            .toJSON()
            .fetch()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the resultset.');
                assert.notEqual(entry, null, 'Single ' + uid + ' entry exists.');
                if (entry) {
                    assert.equal(entry.uid, uid, 'Entry UID matched');
                    assert.equal((entry.num_field <= 11), true, 'Num_field value is less than equal to 11');
                }
                assert.end();
            }, function error(err) {
                log.error('NumberContentType entry :: .lessThanEqualTo("num_field", 11) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('MultipleAssets entry :: .containedIn("title", ["Multiple Assets", "Multiple Assets 2"])', function (assert) {
        var _in = ["Multiple Assets", "Multiple Assets 2"],
            uid = 'blt260a30f46ae2513f';
        DB
            .ContentType(contentTypes.contains)
            .language(defaultLocale)
            .Entry(uid)
            .containedIn('title', _in)
            .toJSON()
            .fetch()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the resultset.');
                assert.notEqual(entry, null, 'Single ' + uid + ' entry exists.');
                if (entry) {
                    assert.equal(entry.uid, uid, 'Entry UID matched');
                    assert.equal((_in.indexOf(entry.title) > -1), true, 'Entry has the one of the title from ' + _in.join(', '));
                }
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entry :: .containedIn("title", ["Multiple Assets", "Multiple Assets 2"]) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('MultipleAssets entry :: .notContainedIn("title", ["Multiple Assets", "Multiple Assets 2"])', function (assert) {
        var _nin = ["Multiple Assetss", "Multiple Asset"],
            uid = 'blt909d11a7cf578372';
        DB
            .ContentType(contentTypes.contains)
            .language(defaultLocale)
            .Entry(uid)
            .notContainedIn('title', _nin)
            .toJSON()
            .fetch()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the resultset.');
                assert.notEqual(entry, null, 'Single ' + uid + ' entry exists.');
                if (entry) {
                    assert.equal(entry.uid, uid, 'Entry UID matched');
                    assert.equal((_nin.indexOf(entry.title) == -1), true, 'Entry has the none of the title from ' + _nin.join(', '));
                }
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entry :: .notContainedIn("title", ["Multiple Assets", "Multiple Assets 2"]) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('MultipleAssets entry :: .notExists("isspecial")', function (assert) {
        uid = 'blt909d11a7cf578372';
        DB
            .ContentType(contentTypes.contains)
            .language(defaultLocale)
            .Entry(uid)
            .notExists('isspecial')
            .toJSON()
            .fetch()
            .then(function success(entry) {
                assert.notok(entry, '"entry" present in the resultset.');
                assert.equal(entry, null, 'No entry[' + uid + '] found.');
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entry :: .notExists("isspecial") error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('MultipleAssets entry :: .exists("isspecial")', function (assert) {
        uid = 'blt909d11a7cf578372';
        DB
            .ContentType(contentTypes.contains)
            .language(defaultLocale)
            .Entry(uid)
            .exists('isspecial')
            .toJSON()
            .fetch()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the resultset.');
                assert.notEqual(entry, null, 'Single ' + uid + ' entry exists.');
                if (entry) {
                    assert.equal(entry.uid, uid, 'Entry UID matched');
                    assert.equal(typeof entry.isspecial, "boolean", 'Entry has the "isspecial" with boolean value');
                }
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entry :: .exists("isspecial") error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('Multiple Assets tags :: .tags(["tag1", "tag2"])', function (assert) {
        var _tags = ["workspace", "readwrite", "pic02"];
        uid = 'blt909d11a7cf578372';
        DB
            .ContentType(contentTypes.contains)
            .language(defaultLocale)
            .Entry(uid)
            .tags(_tags)
            .toJSON()
            .fetch()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the resultset.');
                assert.notEqual(entry, null, 'Single entry exists.');
                if (entry) {
                    assert.ok(_.intersection(_tags, entry.tags).length, 'Specified "tags" are found in entry.');
                }
                assert.end();
            }, function error(err) {
                log.error('Multiple Assets tags :: .tags(["tag1", "tag2"]) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });
});

test('[ja-jp]Database Fetch Operation', function (TC) {
    var uid;
    TC.test('Single Source Entry :: .fetch().spread() - results API', function (assert) {
        uid = 'bltb874c3ac0d6a44da';
        DB
            .ContentType(contentTypes.source)
            .language(locale)
            .Entry(uid)
            .fetch()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the resultset.');
                assert.notEqual(entry.toJSON(), null, 'Single ' + uid + ' entry exists.');
                assert.equal(entry.get('uid'), uid, 'Entry UID matched');
                assert.end();
            }, function error(err) {
                log.error('Single Source Entry :: .fetch() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('Single Source Entry :: .fetch()', function (assert) {
        uid = 'bltb874c3ac0d6a44da';
        // setTimeout(function () {
        DB
            .ContentType(contentTypes.source)
            .language(locale)
            .Entry(uid)
            .toJSON()
            .fetch()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the resultset.');
                assert.notEqual(entry, null, 'Single ' + uid + ' entry exists.');
                assert.equal(entry.uid, uid, 'Entry UID matched');
                assert.end();
            }, function error(err) {
                log.error('Single Source Entry :: .fetch() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
        // }, 1000);
    });

    TC.test('Source Entry :: .where(\'reference.title\', \'ref1\')', function (assert) {
        uid = 'blt5cbb9523685c42bf';
        DB
            .ContentType(contentTypes.source)
            .language(locale)
            .Entry(uid)
            .where('reference.title', 'ref1')
            .toJSON()
            .fetch()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the resultset.');
                assert.notEqual(entry, null, 'Single ' + uid + ' entry exists.');
                assert.equal(entry.uid, uid, 'Entry UID matched');
                assert.equal(entry.reference[0]['title'], "ref1", '"ref1" exists as the reference field value.');
                assert.end();
            }, function error(err) {
                log.error('Source Entry :: .where(\'reference.title\', \'ref1\') error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('Source entry :: .and((.where("reference.title", "ref1"), .where("other_reference.title", "Other ref2"))', function (assert) {
        var q1 = DB.ContentType(contentTypes.source).Query().where('reference.title', 'ref1');
        var q2 = DB.ContentType(contentTypes.source).Query().where('other_reference.title', 'Other ref2');

        uid = 'blt5cbb9523685c42bf';
        DB
            .ContentType(contentTypes.source)
            .language(locale)
            .Entry(uid)
            .and(q1, q2)
            .toJSON()
            .fetch()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the resultset.');
                assert.notEqual(entry, null, 'Single ' + uid + ' entry exists.');
                if (entry) {
                    assert.equal(entry.uid, uid, 'Entry UID matched');
                    assert.equal(entry.reference[0]['title'], "ref1", '"ref1" exists as the reference field value.');
                    assert.equal(entry.other_reference[0]['title'], "Other ref2", '"Other ref2" exists as the other_reference field value.');
                }
                assert.end();
            }, function error(err) {
                log.error('Source entry :: .and((.where("reference.title", "ref1"), .where("other_reference.title", "Other ref2")) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('Source entry :: .or(.where("reference.title", "ref1"), .where("other_reference.title", "Other ref1"))', function (assert) {
        uid = 'bltb874c3ac0d6a44da';
        var q1 = DB.ContentType(contentTypes.source).Query().where('reference.title', 'ref1');
        var q2 = DB.ContentType(contentTypes.source).Query().where('other_reference.title', 'Other ref1');

        DB
            .ContentType(contentTypes.source)
            .language(locale)
            .Entry(uid)
            .or(q1, q2)
            .toJSON()
            .fetch()
            .then(function success(entry) {
                assert.notok(entry, '"entry" present in the resultset.');
                assert.equal(entry, null, 'No ' + uid + ' entry exists.');
                if (entry) {
                    assert.equal(entry.uid, uid, 'Entry UID matched');
                    var refPresent = (entry.reference && entry.reference.length && entry.reference[0]['title'] === 'ref1') ? true : false,
                        otherRefPresent = (entry.other_reference && entry.other_reference.length && entry.other_reference['title'] === 'Other ref1') ? true : false;
                    assert.ok((refPresent || otherRefPresent), "either 'ref1' or 'Other ref1' is present in one of the fetched entries");
                }
                assert.end();
            }, function error(err) {
                log.error('Source entry :: .or(.where("reference.title", "ref1"), .where("other_reference.title", "Other ref1")) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('NumberContentType :: .greaterThan("num_field", 6)', function (assert) {
        uid = 'blt511c2bf6611e7ec8';
        DB
            .ContentType(contentTypes.numbers)
            .language(locale)
            .Entry(uid)
            .greaterThan('num_field', 6)
            .ascending('num_field')
            .toJSON()
            .fetch()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the resultset.');
                assert.notEqual(entry, null, 'Single ' + uid + ' entry exists.');
                if (entry) {
                    assert.equal(entry.uid, uid, 'Entry UID matched');
                    assert.equal((entry.num_field > 6), true, 'Num_field value is greated than 6');
                }
                assert.end();
            }, function error(err) {
                log.error('NumberContentType :: .greaterThan("num_field", 6) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('NumberContentType entry :: .greaterThanEqualTo(\'num_field\', 6)', function (assert) {
        uid = 'bltaaa2eeb1dafcb128';
        DB
            .ContentType(contentTypes.numbers)
            .language(locale)
            .Entry(uid)
            .greaterThanEqualTo('num_field', 6)
            .descending('num_field')
            .toJSON()
            .fetch()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the resultset.');
                assert.notEqual(entry, null, 'Single ' + uid + ' entry exists.');
                if (entry) {
                    assert.equal(entry.uid, uid, 'Entry UID matched');
                    assert.equal((entry.num_field >= 6), true, 'Num_field value is greated than equal to 6');
                }
                assert.end();
            }, function error(err) {
                log.error('NumberContentType entry :: .greaterThanEqualTo(\'num_field\', 6) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('NumberContentType entry :: .lessThan("num_field", 11)', function (assert) {
        uid = 'bltaaa2eeb1dafcb128';
        DB
            .ContentType(contentTypes.numbers)
            .language(locale)
            .Entry(uid)
            .lessThan('num_field', 11)
            .ascending('num_field')
            .toJSON()
            .fetch()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the resultset.');
                assert.notEqual(entry, null, 'Single ' + uid + ' entry exists.');
                if (entry) {
                    assert.equal(entry.uid, uid, 'Entry UID matched');
                    assert.equal((entry.num_field < 11), true, 'Num_field value is less than 11');
                }
                assert.end();
            }, function error(err) {
                log.error('NumberContentType entry :: .lessThan("num_field", 11) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('NumberContentType entry :: .lessThanEqualTo("num_field", 11)', function (assert) {
        uid = 'blt511c2bf6611e7ec8';
        DB
            .ContentType(contentTypes.numbers)
            .language(locale)
            .Entry(uid)
            .lessThanEqualTo('num_field', 11)
            .descending('num_field')
            .toJSON()
            .fetch()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the resultset.');
                assert.notEqual(entry, null, 'Single ' + uid + ' entry exists.');
                if (entry) {
                    assert.equal(entry.uid, uid, 'Entry UID matched');
                    assert.equal((entry.num_field <= 11), true, 'Num_field value is less than equal to 11');
                }
                assert.end();
            }, function error(err) {
                log.error('NumberContentType entry :: .lessThanEqualTo("num_field", 11) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('MultipleAssets entry :: .containedIn("title", ["Multiple Assets", "Multiple Assets 2"])', function (assert) {
        var _in = ["Multiple Assets", "Multiple Assets 2"],
            uid = 'blt909d11a7cf578372';
        DB
            .ContentType(contentTypes.contains)
            .language(locale)
            .Entry(uid)
            .containedIn('title', _in)
            .toJSON()
            .fetch()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the resultset.');
                assert.notEqual(entry, null, 'Single ' + uid + ' entry exists.');
                if (entry) {
                    assert.equal(entry.uid, uid, 'Entry UID matched');
                    assert.equal((_in.indexOf(entry.title) > -1), true, 'Entry has the one of the title from ' + _in.join(', '));
                }
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entry :: .containedIn("title", ["Multiple Assets", "Multiple Assets 2"]) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('MultipleAssets entry :: .notContainedIn("title", ["Multiple Assets", "Multiple Assets 2"])', function (assert) {
        var _nin = ["Multiple Assetss", "Multiple Asset"],
            uid = 'blt909d11a7cf578372';
        DB
            .ContentType(contentTypes.contains)
            .language(locale)
            .Entry(uid)
            .notContainedIn('title', _nin)
            .toJSON()
            .fetch()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the resultset.');
                assert.notEqual(entry, null, 'Single ' + uid + ' entry exists.');
                if (entry) {
                    assert.equal(entry.uid, uid, 'Entry UID matched');
                    assert.equal((_nin.indexOf(entry.title) === -1), true, 'Entry has the none of the title from ' + _nin.join(', '));
                }
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entry :: .notContainedIn("title", ["Multiple Assets", "Multiple Assets 2"]) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('MultipleAssets entry :: .notExists("isspecial")', function (assert) {
        uid = 'blt260a30f46ae2513f';
        DB
            .ContentType(contentTypes.contains)
            .language(locale)
            .Entry(uid)
            .notExists('isspecial')
            .toJSON()
            .fetch()
            .then(function success(entry) {
                assert.notok(entry, '"entry" present in the resultset.');
                assert.equal(entry, null, 'No entry[' + uid + '] found.');
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entry :: .notExists("isspecial") error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('MultipleAssets entry :: .exists("isspecial")', function (assert) {
        uid = 'blt909d11a7cf578372';
        DB
            .ContentType(contentTypes.contains)
            .language(locale)
            .Entry(uid)
            .exists('isspecial')
            .toJSON()
            .fetch()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the resultset.');
                assert.notEqual(entry, null, 'Single ' + uid + ' entry exists.');
                if (entry) {
                    assert.equal(entry.uid, uid, 'Entry UID matched');
                    assert.equal(typeof entry.isspecial, "boolean", 'Entry has the "isspecial" with boolean value');
                }
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entry :: .exists("isspecial") error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('Multiple Assets tags :: .tags(["tag1", "tag2"])', function (assert) {
        var _tags = ["workspace", "readwrite", "pic02"];
        uid = 'blt260a30f46ae2513f';
        DB
            .ContentType(contentTypes.contains)
            .language(locale)
            .Entry(uid)
            .tags(_tags)
            .toJSON()
            .fetch()
            .then(function success(entry) {
                assert.ok(entry, '"entry" present in the resultset.');
                assert.notEqual(entry, null, 'Single entry exists.');
                if (entry) {
                    assert.ok(_.intersection(_tags, entry.tags).length, 'Specified "tags" are found in entry.');
                }
                assert.end();
            }, function error(err) {
                log.error('Multiple Assets tags :: .tags(["tag1", "tag2"]) error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });
});

test('[en-us]Database Count Operation', function (TC) {

    TC.test('All Source Entries :: count()', function (assert) {
        //setTimeout(function () {
        DB
            .ContentType(contentTypes.source)
            .language(defaultLocale)
            .Query()
            .count()
            .then(function success(count) {
                assert.ok(count.entries, '"entries" present in the resultset.');
                assert.equal(count.entries, 5, 'five entries found.');
                assert.end();
            }, function error(err) {
                log.error('All Source Entries :: count() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });

    });

    TC.test('All Source Entries :: .where("title", "Source1").count()', function (assert) {
        //setTimeout(function () {
        DB
            .ContentType(contentTypes.source)
            .language(defaultLocale)
            .Query()
            .where("title", "Source1")
            .count()
            .then(function success(count) {
                assert.ok(count.entries, '"entries" present in the resultset.');
                assert.equal(count.entries, 1, 'one entry found.');
                assert.end();
            }, function error(err) {
                log.error('All Source Entries :: .where("title", "Source1").count() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });

    });

    TC.test('NumberContentType Entries greater than 6 :: .greaterThan(\'number\', 6) .count()', function (assert) {
        //setTimeout(function () {
        DB
            .ContentType(contentTypes.numbers)
            .language(defaultLocale)
            .Query()
            .greaterThan("num_field", 6)
            .count()
            .then(function success(count) {
                assert.ok(count.entries, '"entries" present in the resultset.');
                assert.equal(count.entries, 2, 'two entries found.');
                assert.end();
            }, function error(err) {
                log.error('NumberContentType Entries greater than 6 :: .greaterThan(\'number\', 6).count() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });

    });

    TC.test('NumberContentType Entries less than 11 :: .lessThan(\'number\', 11) .count()', function (assert) {
        DB
            .ContentType(contentTypes.numbers)
            .language(defaultLocale)
            .Query()
            .lessThan("num_field", 11)
            .count()
            .then(function success(count) {
                assert.ok(count.entries, '"entries" present in the resultset.');
                assert.equal(count.entries, 1, 'one entry found.');
                assert.end();
            }, function error(err) {
                log.error('NumberContentType Entries less than 11 :: .lessThan(\'num_field\', 11) .count() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });

    });

    TC.test('NumberContentType Entries less than Equal to 6 :: .lessThanEqualTo(\'num_field\', 11) .count()', function (assert) {
        DB
            .ContentType(contentTypes.numbers)
            .language(defaultLocale)
            .Query()
            .lessThanEqualTo("num_field", 11)
            .count()
            .then(function success(count) {
                assert.ok(count.entries, '"entries" present in the resultset.');
                assert.equal(count.entries, 2, 'two entries found.');
                assert.end();
            }, function error(err) {
                log.error('NumberContentType Entries less than equalto 11:: .lessThanEqualTo(\'number\', 11).count() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });

    });

    TC.test('NumberContentType Entries greater than EqualTo 11 :: .greaterThanEqualTo(\'num_field\', 6) .count()', function (assert) {
        DB
            .ContentType(contentTypes.numbers)
            .language(defaultLocale)
            .Query()
            .greaterThanEqualTo("num_field", 6)
            .count()
            .then(function success(count) {
                assert.ok(count.entries, '"entries" present in the resultset.');
                assert.equal(count.entries, 3, 'three entries found.');
                assert.end();
            }, function error(err) {
                log.error('NumberContentType Entries greater Than Equal To than 6 :: .greaterThanEqualTo(\'num_field\', 6).count() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });

    });

    TC.test('All Source Entries :: .where("reference.title", "ref1").count()', function (assert) {
        DB
            .ContentType(contentTypes.source)
            .language(defaultLocale)
            .Query()
            .where("reference.title", "ref1")
            .count()
            .then(function success(count) {
                assert.ok(count.entries, '"entries" present in the resultset.');
                assert.equal(count.entries, 1, 'one entry found.');
                assert.end();
            }, function error(err) {
                log.error('All Source Entries :: .where("reference.title", "test1").count() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });

    });

    TC.test('MultipleAssets entries :: .containedIn(\'title\',["Multiple Assets", "Multiple Assets 2"]) .count()', function (assert) {
        var _in = ["Multiple Assets", "Multiple Assets 2"];
        DB
            .ContentType(contentTypes.contains)
            .language(defaultLocale)
            .Query()
            .containedIn('title', _in)
            .toJSON()
            .count()
            .then(function success(count) {
                assert.ok(count.entries, '"entries" present in the resultset.');
                assert.equal(count.entries, 2, 'Two entries found.');
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entries :: .containedIn(\'title\',["test1", "test2"]) .count() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            }).catch(function () {
                assert.ok('"contentTypeUID" not present in the resultset.');
                assert.end();
            });
    });

    TC.test('MultipleAssets entries :: .notContainedIn(\'title\',["Multiple Assets", "Multiple Assets 2"]) .count()', function (assert) {
        var _nin = ["Multiple Assets", "Multiple Assets 2"];
        DB
            .ContentType(contentTypes.contains)
            .language(defaultLocale)
            .Query()
            .notContainedIn('title', _nin)
            .toJSON()
            .count()
            .then(function success(count) {
                assert.notok(count.entries, '"entries" present in the resultset.');
                assert.equal(count.entries, 0, 'Zero entries found.');
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entries :: .notContainedIn(\'title\',["test1", "test2"]) .count() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            }).catch(function () {
                assert.ok('"contentTypeUID" not present in the resultset.');
                assert.end();
            });
    });

    TC.test('MultipleAssets entries :: .notExists(\'isspecial\') .count()', function (assert) {
        DB
            .ContentType(contentTypes.contains)
            .language(defaultLocale)
            .Query()
            .notExists('isspecial')
            .toJSON()
            .count()
            .then(function success(count) {
                assert.notok(count.entries, '"entries" present in the resultset.');
                assert.equal(count.entries, 0, 'Zero entry found.');
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entries :: .notExists(\'isspecial\') .count() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('MultipleAssets entries :: .exists(\'isspecial\') .count()', function (assert) {
        DB
            .ContentType(contentTypes.contains)
            .language(defaultLocale)
            .Query()
            .exists('isspecial')
            .toJSON()
            .count()
            .then(function success(count) {
                assert.ok(count.entries, '"entries" present in the resultset.');
                assert.equal(count.entries, 2, 'Two entries found.');
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entries :: .exists(\'isspecial\') .count() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('Source entries :: .regex(\'title\', \'source\', \'gi\') .count()', function (assert) {
        DB
            .ContentType(contentTypes.source)
            .language(defaultLocale)
            .Query()
            .regex('title', 'source', 'gi')
            .toJSON()
            .count()
            .then(function success(count) {
                assert.ok(count.entries, '"entries" present in the resultset.');
                assert.ok(count.entries, 'Result entries found.');
                assert.end();
            }, function error(err) {
                log.error('Source entries :: .regex(\'title\', \'source\', \'gi\') .count() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('Multiple Assets tags :: .tags(["test1", "test2", "test3"]) .count()', function (assert) {
        var _tags = ["workspace", "readwrite", "pic02"];
        DB
            .ContentType(contentTypes.contains)
            .language(defaultLocale)
            .Query()
            .tags(_tags)
            .toJSON()
            .count()
            .then(function success(count) {
                assert.ok(count.entries, '"entries" present in the resultset.');
                assert.ok(count.entries, 'Result entries exists.');
                assert.end();
            }, function error(err) {
                log.error('Multiple Assets tags :: .tags(["test1", "test2", "test3"] .count() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

});

test('[ja-jp]Database Count Operation', function (TC) {

    TC.test('All Source Entries :: count()', function (assert) {
        //setTimeout(function () {
        DB
            .ContentType(contentTypes.source)
            .language(locale)
            .Query()
            .count()
            .then(function success(count) {
                assert.ok(count.entries, '"entries" present in the resultset.');
                assert.equal(count.entries, 5, 'five entries found.');
                assert.end();
            }, function error(err) {
                log.error('All Source Entries :: count() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });

    });

    TC.test('All Source Entries :: .where("title", "Source1").count()', function (assert) {
        //setTimeout(function () {
        DB
            .ContentType(contentTypes.source)
            .language(locale)
            .Query()
            .where("title", "Source1")
            .count()
            .then(function success(count) {
                assert.ok(count.entries, '"entries" present in the resultset.');
                assert.equal(count.entries, 1, 'one entry found.');
                assert.end();
            }, function error(err) {
                log.error('All Source Entries :: .where("title", "Source1").count() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });

    });

    TC.test('NumberContentType Entries greater than 6 :: .greaterThan(\'number\', 6) .count()', function (assert) {
        //setTimeout(function () {
        DB
            .ContentType(contentTypes.numbers)
            .language(locale)
            .Query()
            .greaterThan("num_field", 6)
            .count()
            .then(function success(count) {
                assert.ok(count.entries, '"entries" present in the resultset.');
                assert.equal(count.entries, 2, 'two entries found.');
                assert.end();
            }, function error(err) {
                log.error('NumberContentType Entries greater than 6 :: .greaterThan(\'number\', 6).count() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });

    });

    TC.test('NumberContentType Entries less than 11 :: .lessThan(\'number\', 11) .count()', function (assert) {
        DB
            .ContentType(contentTypes.numbers)
            .language(locale)
            .Query()
            .lessThan("num_field", 11)
            .count()
            .then(function success(count) {
                assert.ok(count.entries, '"entries" present in the resultset.');
                assert.equal(count.entries, 1, 'one entry found.');
                assert.end();
            }, function error(err) {
                log.error('NumberContentType Entries less than 11 :: .lessThan(\'num_field\', 11) .count() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });

    });

    TC.test('NumberContentType Entries less than Equal to 6 :: .lessThanEqualTo(\'num_field\', 11) .count()', function (assert) {
        DB
            .ContentType(contentTypes.numbers)
            .language(locale)
            .Query()
            .lessThanEqualTo("num_field", 11)
            .count()
            .then(function success(count) {
                assert.ok(count.entries, '"entries" present in the resultset.');
                assert.equal(count.entries, 2, 'two entries found.');
                assert.end();
            }, function error(err) {
                log.error('NumberContentType Entries less than equalto 11:: .lessThanEqualTo(\'number\', 11).count() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });

    });

    TC.test('NumberContentType Entries greater than EqualTo 11 :: .greaterThanEqualTo(\'num_field\', 6) .count()', function (assert) {
        DB
            .ContentType(contentTypes.numbers)
            .language(locale)
            .Query()
            .greaterThanEqualTo("num_field", 6)
            .count()
            .then(function success(count) {
                assert.ok(count.entries, '"entries" present in the resultset.');
                assert.equal(count.entries, 3, 'three entries found.');
                assert.end();
            }, function error(err) {
                log.error('NumberContentType Entries greater Than Equal To than 6 :: .greaterThanEqualTo(\'num_field\', 6).count() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });

    });

    TC.test('All Source Entries :: .where("reference.title", "ref1").count()', function (assert) {
        DB
            .ContentType(contentTypes.source)
            .language(locale)
            .Query()
            .where("reference.title", "ref1")
            .count()
            .then(function success(count) {
                assert.ok(count.entries, '"entries" present in the resultset.');
                assert.equal(count.entries, 1, 'one entry found.');
                assert.end();
            }, function error(err) {
                log.error('All Source Entries :: .where("reference.title", "test1").count() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });

    });

    TC.test('MultipleAssets entries :: .containedIn(\'title\',["Multiple Assets", "Multiple Assets 2"]) .count()', function (assert) {
        var _in = ["Multiple Assets", "Multiple Assets 2"];
        DB
            .ContentType(contentTypes.contains)
            .language(locale)
            .Query()
            .containedIn('title', _in)
            .toJSON()
            .count()
            .then(function success(count) {
                assert.ok(count.entries, '"entries" present in the resultset.');
                assert.equal(count.entries, 2, 'Two entries found.');
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entries :: .containedIn(\'title\',["test1", "test2"]) .count() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            }).catch(function () {
                assert.ok('"contentTypeUID" not present in the resultset.');
                assert.end();
            });
    });

    TC.test('MultipleAssets entries :: .notContainedIn(\'title\',["Multiple Assets", "Multiple Assets 2"]) .count()', function (assert) {
        var _nin = ["Multiple Assets", "Multiple Assets 2"];
        DB
            .ContentType(contentTypes.contains)
            .language(locale)
            .Query()
            .notContainedIn('title', _nin)
            .toJSON()
            .count()
            .then(function success(count) {
                assert.notok(count.entries, '"entries" present in the resultset.');
                assert.equal(count.entries, 0, 'Zero entries found.');
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entries :: .notContainedIn(\'title\',["test1", "test2"]) .count() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            }).catch(function () {
                assert.ok('"contentTypeUID" not present in the resultset.');
                assert.end();
            });
    });

    TC.test('MultipleAssets entries :: .notExists(\'isspecial\') .count()', function (assert) {
        DB
            .ContentType(contentTypes.contains)
            .language(locale)
            .Query()
            .notExists('isspecial')
            .toJSON()
            .count()
            .then(function success(count) {
                assert.notok(count.entries, '"entries" present in the resultset.');
                assert.equal(count.entries, 0, 'Zero entry found.');
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entries :: .notExists(\'isspecial\') .count() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('MultipleAssets entries :: .exists(\'isspecial\') .count()', function (assert) {
        DB
            .ContentType(contentTypes.contains)
            .language(locale)
            .Query()
            .exists('isspecial')
            .toJSON()
            .count()
            .then(function success(count) {
                assert.ok(count.entries, '"entries" present in the resultset.');
                assert.equal(count.entries, 2, 'Two entries found.');
                assert.end();
            }, function error(err) {
                log.error('MultipleAssets entries :: .exists(\'isspecial\') .count() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('Source entries :: .regex(\'title\', \'source\', \'gi\') .count()', function (assert) {
        DB
            .ContentType(contentTypes.source)
            .language(locale)
            .Query()
            .regex('title', 'source', 'gi')
            .toJSON()
            .count()
            .then(function success(count) {
                assert.ok(count.entries, '"entries" present in the resultset.');
                assert.ok(count.entries, 'Result entries found.');
                assert.end();
            }, function error(err) {
                log.error('Source entries :: .regex(\'title\', \'source\', \'gi\') .count() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

    TC.test('Multiple Assets tags :: .tags(["test1", "test2", "test3"]) .count()', function (assert) {
        var _tags = ["workspace", "readwrite", "pic02"];
        DB
            .ContentType(contentTypes.contains)
            .language(locale)
            .Query()
            .tags(_tags)
            .toJSON()
            .count()
            .then(function success(count) {
                assert.ok(count.entries, '"entries" present in the resultset.');
                assert.ok(count.entries, 'Result entries exists.');
                assert.end();
            }, function error(err) {
                log.error('Multiple Assets tags :: .tags(["test1", "test2", "test3"] .count() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });

});

test('[en-us] Database insert operation', function (TC) {
    TC.test('Insert entry in "customClass" :: .insert()', function (assert) {
        //setTimeout(function () {
        DB
            .ContentType(contentTypes.customClass)
            .language(defaultLocale)
            .Entry('blt001')
            .insert(entry)
            .then(function (result) {
                DB
                    .ContentType(contentTypes.customClass)
                    .language(defaultLocale)
                    .Query()
                    .toJSON()
                    .findOne()
                    .then(function (resultEntry) {
                        assert.deepEqual(resultEntry, entry, 'Entry is same as provided - insert');
                        assert.end();
                    }, function (err) {
                        log.error('Insert entry in "customClass" :: .insert() error.' + err.message);
                        assert.fail(err.message);
                        assert.end();
                    });
            }, function (err) {
                log.error('Insert entry in "customClass" :: .insert() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
        //}, 1000);
    });

    TC.test('[Error] Duplicate entry with Insert in "customClass" :: insert()', function (assert) {
        DB
            .ContentType(contentTypes.customClass)
            .language(defaultLocale)
            .Entry('blt001')
            .insert(entry)
            .then(function (result) {
                DB
                    .ContentType(contentTypes.customClass)
                    .language(defaultLocale)
                    .Query()
                    .findOne()
                    .then(function (result) {
                        assert.deepEqual(result.entry, entry, 'Entry is same as provided - insert');
                        assert.end();
                    }, function (err) {
                        log.error('[Error] Duplicate entry with Insert in "customClass" error.' + err.message);
                        assert.fail(err.message);
                        assert.end();
                    });
            }, function (err) {
                log.error('[Error] Duplicate entry with Insert in "customClass" :: insert() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
    });
});

test('[en-us] Database update operation', function (TC) {
    TC.test('update entry in "customClass" :: .update()', function (assert) {
        //setTimeout(function () {
        entry.designation = "Application Engineer";
        DB
            .ContentType(contentTypes.customClass)
            .language(defaultLocale)
            .Entry('blt001')
            .update(entry)
            .then(function (result) {
                DB
                    .ContentType(contentTypes.customClass)
                    .language(defaultLocale)
                    .Query()
                    .toJSON()
                    .findOne()
                    .then(function (resultEntry) {
                        assert.deepEqual(resultEntry, entry, 'Entry is same as provided - update');
                        assert.end();
                    }, function (err) {
                        log.error('update entry in "customClass" :: .update() error.' + err.message);
                        assert.fail(err.message);
                        assert.end();
                    });
            }, function (err) {
                log.error('update entry in "customClass" :: .update() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
        //}, 1000);
    });
});

test('[en-us] Database remove operation', function (TC) {
    TC.test('Remove entry in "customClass" :: .remove()', function (assert) {
        //setTimeout(function () {
        DB
            .ContentType(contentTypes.customClass)
            .language(defaultLocale)
            .Entry('blt001')
            .remove()
            .then(function (result) {
                DB
                    .ContentType(contentTypes.customClass)
                    .language(defaultLocale)
                    .Query()
                    .toJSON()
                    .findOne()
                    .then(function (resultEntry) {
                        assert.deepEqual(resultEntry, null, 'Entry should be "null"');
                        assert.end();
                    }, function (err) {
                        log.error('Remove entry in "customClass" :: .remove() error.' + err.message);
                        assert.fail(err.message);
                        assert.end();
                    });
            }, function (err) {
                log.error('Remove entry in "customClass" :: .remove() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
        //}, 1000);
    });
});

test('[en-us] [ContentType] Database remove operation', function (TC) {
    TC.test('Remove ContentType "customClass" :: .remove()', function (assert) {
        //setTimeout(function () {
        DB
            .ContentType(contentTypes.customClass)
            .language(defaultLocale)
            .Entry()
            .remove()
            .then(function (result) {
                var lang = _.find(languages, {"code": defaultLocale}),
                    filePath;

                if (lang && lang.contentPath) {
                    filePath = path.join(lang.contentPath, contentTypes.customClass + '.json');
                    if (fs.existsSync(filePath)) {
                        assert.fail(contentTypes.customClass + ' file failed to deleted');
                    } else {
                        assert.pass(contentTypes.customClass + ' file deleted');
                    }
                } else {
                    assert.fail('Language not found');
                }
                assert.end();
            }, function (err) {
                log.error('Remove ContentType "customClass" :: .remove() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
        //}, 100);
    });
});

test('[ja-jp] Database insert operation', function (TC) {
    TC.test('Insert entry in "customClass" :: .insert()', function (assert) {
        //setTimeout(function () {
        DB
            .ContentType(contentTypes.customClass)
            .language(locale)
            .Entry('blt001')
            .insert(entry)
            .then(function (result) {
                DB
                    .ContentType(contentTypes.customClass)
                    .language(locale)
                    .Query()
                    .toJSON()
                    .findOne()
                    .then(function (resultEntry) {
                        assert.deepEqual(resultEntry, entry, 'Entry is same as provided - insert');
                        assert.end();
                    }, function (err) {
                        log.error('Insert entry in "customClass" error.' + err.message);
                        assert.fail(err.message);
                        assert.end();
                    });
            }, function (err) {
                log.error('Insert entry in "customClass" :: .insert() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
        //}, 1000);
    });

    TC.test('[Error] Duplicate entry with Insert in "customClass" :: .insert()', function (assert) {
        DB
            .ContentType(contentTypes.customClass)
            .language(locale)
            .Entry('blt001')
            .insert(entry)
            .then(function (result) {
                DB
                    .ContentType(contentTypes.customClass)
                    .language(locale)
                    .Query()
                    .toJSON()
                    .findOne()
                    .then(function (resultEntry) {
                        assert.deepEqual(resultEntry, entry, 'Entry is same as provided - insert');
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
});

test('[ja-jp] Database update operation', function (TC) {
    TC.test('update entry in "customClass" :: .update()', function (assert) {
        //setTimeout(function () {
        entry.designation = "Application Engineer";
        DB
            .ContentType(contentTypes.customClass)
            .language(locale)
            .Entry('blt001')
            .update(entry)
            .then(function (result) {
                DB
                    .ContentType(contentTypes.customClass)
                    .language(locale)
                    .Query()
                    .toJSON()
                    .findOne()
                    .then(function (resultEntry) {
                        assert.deepEqual(resultEntry, entry, 'Entry is same as provided - update');
                        assert.end();
                    }, function (err) {
                        log.error('update entry in "customClass" :: .update() error.' + err.message);
                        assert.fail(err.message);
                        assert.end();
                    });
            }, function (err) {
                log.error('update entry in "customClass" :: .update() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
        //}, 1000);
    });
});

test('[ja-jp] Database remove operation', function (TC) {
    TC.test('Remove entry in "customClass" :: .remove()', function (assert) {
        //setTimeout(function () {
        DB
            .ContentType(contentTypes.customClass)
            .language(locale)
            .Entry('blt001')
            .remove()
            .then(function (result) {
                DB
                    .ContentType(contentTypes.customClass)
                    .language(locale)
                    .Query()
                    .toJSON()
                    .findOne()
                    .then(function (resultEntry) {
                        assert.deepEqual(resultEntry, null, 'Entry should be "null"');
                        assert.end();
                    }, function (err) {
                        log.error('Remove entry in "customClass" :: .remove() error.' + err.message);
                        assert.fail(err.message);
                        assert.end();
                    });
            }, function (err) {
                log.error('Remove entry in "customClass" :: .remove() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
        //}, 1000);
    });
});

test('[ja-jp] [ContentType] Database remove operation', function (TC) {
    TC.test('Remove ContentType "customClass" :: .remove()', function (assert) {
        //setTimeout(function () {
        DB
            .ContentType(contentTypes.customClass)
            .language(locale)
            .Entry()
            .remove()
            .then(function (result) {
                var lang = _.find(languages, {"code": locale}),
                    filePath;

                if (lang && lang.contentPath) {
                    filePath = path.join(lang.contentPath, contentTypes.customClass + '.json');
                    if (fs.existsSync(filePath)) {
                        assert.fail(contentTypes.customClass + ' file failed to deleted');
                    } else {
                        assert.pass(contentTypes.customClass + ' file deleted');
                    }
                } else {
                    assert.fail('Language not found');
                }
                assert.end();
            }, function (err) {
                log.error('Remove ContentType "customClass" :: .remove() error.' + err.message);
                assert.fail(err.message);
                assert.end();
            });
        //}, 100);
    });
});

test.onFinish(function () {
    console.log('tests Finished');
});
