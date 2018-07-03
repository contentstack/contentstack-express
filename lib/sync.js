/*!
 * contentstack-sync
 * copyright (c) Contentstack.com
 * MIT Licensed
 */

'use strict';

/**
 * Module Dependencies.
 */

const Q = require('q'),
    _ = require('lodash'),
    async = require('async'),
    EventEmitter = require('events').EventEmitter;

let _utility = require('./utils'),
    utility = new _utility(),
    helper = require('./helper'),
    config = require('./config')(),
    sync = require('./sync/sync'),
    utils = require('./utils/index'),
    log = utils.sync,
    languages,env,datetime,content_types,skip_content_types,
    q, isProgress, backup, bound = 50;


class Sync extends EventEmitter{
    constructor(args){
        super();

        q = [];
        isProgress = false;

        this._options = args || {};
       
        // Remove memory-leak warning about max listeners
        this.setMaxListeners(0);

        // expose prototypes
        this.initialise = _.bind(this.initialise, this);

        // initalise the Synchronize command
        this.initialise();

        // proceed next queue if present
        let next = () => {
            if (q.length > 0) {
                let entryData = q.shift();
                this.sync.start(entryData);
                log.info("\nEntry " + JSON.stringify(entryData.message.body));
            } else {
                isProgress = false;
                log.info("=============== Synchronization requests completed successfully ===============");
            }
        };

        // start sync-utility
        this.sync = new sync(next, true);

        next.bind(this.sync);
    }

 /*
 * Get the user inputs
 * */
    initialise(){
        try {
            let self = this;

            self.inputs = {};
            utility.init();
            backup = utility.matchConfirm(config.get('backup'));
            languages = config.get('languages');
            env = config.get('environment');
            datetime = config.get('datetime');
            skip_content_types = config.get('skip_content_types');
            content_types = config.get('content_types');

            async.series([
                (cb) => {
                    if (env) {
                        utility
                            .getEnvironment(env)
                            .then( (result) => {
                                env = result
                                cb(null,null);
                            })
                            .fail( (err) => {
                                cb(err);
                            });
                    }
                },
                (cb) => {
                    utility
                        .getStack()
                        .then( (body) => {
                            if (body && body.stack) {
                                if (body.stack.discrete_variables && body.stack.discrete_variables._version && body.stack.discrete_variables._version >= 3) {
                                    cb(null, body.stack.master_locale)
                                } else {
                                    cb("\x1b[31mThe " + body.stack.name + " stack is currently on version 2 which is not supported by contentstack-express version 3. \nKindly contact support-contentstack@built.io for upgrading your Stack to version 3.\x1b[0m");
                                }
                            } else {
                                cb("\x1b[31mApi key or access token is not valid. Please retry.\x1b[0m");
                            }
                        }, (err) => {
                            cb(err);
                        });
                }

                ], (err) => {
                    let _type = config.get('type');

                    if (!err) {
                        helper.confirm(languages, backup, (err) => {
                            if (err) throw err;
                            async.every(languages, (lang) => {
                                async.waterfall([
                                    (cb) => {
                                        switch (_type) {
                                            case "assets":
                                                self.assets(cb,lang.code);
                                                break;
                                            case "content_types":
                                                self.loadData(lang.code);
                                                break;
                                            default:
                                                async.series([
                                                    (cb) => {
                                                        self.assets(cb, lang.code);
                                                    },
                                                    () => {
                                                        self.loadData(lang.code);
                                                    }
                                                ]);
                                        }
                                    }

                                ], () => {

                                });
                            }, () => {
                            });
                        });
                    } else {
                        log.error("Init Error : ", err.message || err);
                    }
                });
        } catch (err) {
            log.error("Init Error : ", err.message);
         }
    }

    /*
 * Load all the entries from the content_types
 * */
    loadData(_lang){
        let self = this,
            lang = _lang,
            _calls = [];
        let _loadEntries = (_content_types) => {
            for (let i = 0, total = _content_types.length; i < total; i++) {
                _calls.push(function (content_type) {
                    return utility.getEntries(content_type, lang, {}, ['publish_details', '_version'], env.environment.name)
                        .then( (entries) => {
                            let _entries = [];
                            if (datetime) {
                                for (let i = 0; i < entries.length; i++) {
                                    // this is for the API Stack 3.1 with new response
                                    if (!(entries[i]['publish_details'] instanceof Array) && typeof entries[i]['publish_details'] === "object") {
                                        entries[i]['publish_details']['version'] = entries[i]["_version"]
                                        entries[i]['publish_details'] = [entries[i]['publish_details']]
                                    }
                                    _.findIndex(entries[i]['publish_details'], (object) => {
                                        if (object.locale === lang && object.environment === env.environment.uid && object.time && object.time >= datetime) {
                                            _entries.push(entries[i]);
                                        }
                                    });
                                }
                            } else {
                                _entries = entries || [];
                            }
                            log.info("Total %d entries of ContentType %s retrieved.", _entries.length, content_type);
                            return self.parseEntries(_entries, content_type, lang);
                        })
                        .fail( (err) => {
                            log.error("Error in retriveing entries: ", err, content_type);
                        });
                }(_content_types[i]));
            }
            Q.all(_calls)
                .then( (entries) => {
                    entries = entries.reduce( (prev, crnt) => {
                        if (Array.isArray(crnt)) {
                            prev = prev.concat(crnt);
                        }
                        return prev;
                    }, []);
                    log.info("Total entries %d are synchronized.", entries.length);
                })
                .fail( (error) => {
                    log.error("Synchronization error: ", error.message);
                });
        };

        // calculating the content_types to be used
        if (content_types.length) {
            content_types = _.difference(content_types, skip_content_types);
            _loadEntries(content_types);
        } else {
            utility
                .getContentTypes()
                .then( (content_types) => {
                    if (content_types && content_types.content_types && content_types.content_types.length) {
                        content_types = _.difference(_.map(content_types.content_types, "uid"), skip_content_types);
                        _loadEntries(content_types);
                    } else {
                        log.info("No ContentTypes found.");
                    }
                }).fail( (error) => {
                log.error("ContentTypes retrieval error: ", JSON.stringify(error));
            });
        }
    }

    /*
 * Load all the parse Entries
 * */
    parseEntries(entries, content_type, _lang){
        try {
            let self = this,
                lang = _lang;
            let deferred = Q.defer();
            log.info("Restoring %d entries of %s ContentType.", entries.length, content_type);
            for (let i = 0, total = entries.length; i < total; i++) {
                if (entries[i] && entries[i]['publish_details']) {
                    // this is for the API Stack 3.1 with new response
                    if (!(entries[i]['publish_details'] instanceof Array) && typeof entries[i]['publish_details'] === "object") {
                        entries[i]['publish_details']['version'] = entries[i]["_version"]
                        entries[i]['publish_details'] = [entries[i]['publish_details']]
                    }
                    let idx = _.findIndex(entries[i]['publish_details'], {
                        environment: env.environment.uid,
                        locale: lang
                    });
                    let _lang = _.findIndex(languages, {'code': lang});
                    if (~idx && ~_lang) {
                        q.push({
                            message: {
                                body: {
                                    object: {
                                        content_type: {
                                            title: content_type,
                                            uid: content_type
                                        },
                                        entry: {
                                            title: entries[i]['title'] || entries[i]['uid'],
                                            locale: entries[i]['publish_details'][idx]['locale'] || "en-us",
                                            version: entries[i]['publish_details'][idx]['version'],
                                            entry_uid: entries[i]['uid']
                                        },
                                        locale: [lang],
                                        environment: [env.environment.uid],
                                        action: "publish",
                                        type: "entry"
                                    },
                                    restore: true
                                }
                            },
                            lang: languages[_lang]
                        });
                        if (!isProgress) {
                            let entryData = q.shift();
                            log.info("=============== Started synchronizing content ===============");
                            self.sync.start(entryData);
                            isProgress = true;
                            log.info("Entry info: " + JSON.stringify(entryData.message.body));
                        }
                    }
                }
            }
            deferred.resolve(entries);
            return deferred.promise;
        } catch (e) {
           log.error("Error " + e.message);
         }
    }

    /*
 * Load all the assets from the Stack
 * */
    assets(_callback, _lang){
        let self = this,
            lang = _lang,
            options = {
                environment: env.environment,
                locale: lang,
                skip: 0,
                limit: bound,
                include_count: true,
                query: {
                    "publish_details.locale": lang
                },
                only: {
                    BASE: ['publish_details', 'filename', '_version']
                }
            };

            let loadBatch =  (total) => {
                let index = 0,
                    calls = [];
                while (index < total) {
                    calls.push(function (skip, limit) {
                        return function (cb) {
                            options.skip = skip;
                            options.limit = limit;
                            delete options.include_count;
                            utility
                                .getAssets(options)
                                .then( (body) => {
                                    if (body && body.assets && body.assets.length) {
                                        cb(null, body.assets);
                                    } else {
                                        cb(body, null);
                                    }
                                })
                        }
                    }(index, bound));
                    index = index + bound;
                }

                async.series(calls, (err, data) => {
                        let _calls = [];
                        if (!err && data && data.length) {
                            for (let i = 0; i < data.length; i++) {
                                _calls.push(function (assets) {
                                        return function (_cb) {
                                            let _assets;
                                            if (datetime) {
                                                _assets = [];
                                                for (let i = 0; i < assets.length; i++) {
                                                    if (assets[i] && assets[i]['publish_details']) {
                                                        // this is for the API Stack 3.1 with new response
                                                        if (!(assets[i]['publish_details'] instanceof Array) && typeof assets[i]['publish_details'] === "object") {
                                                            assets[i]['publish_details'] = [assets[i]['publish_details']]
                                                        }
                                                        _.findIndex(assets[i]['publish_details'], (object) => {
                                                            if (object.locale === lang && object.environment === env.environment.uid && object.time && object.time >= datetime) {
                                                                _assets.push(assets[i]);
                                                            }
                                                        });
                                                    }
                                                }
                                            }
                                            else {
                                                _assets = assets;
                                            }
                                            publishAssets(_assets, _cb);
                                            _cb(null, _assets);
                                        }

                                    }(data[i])
                                )
                            }
                            async.parallel(_calls, (err, data) => {
                                if (!err && data && data.length) {
                                    let total = 0;
                                    for (let i = 0; i < data.length; i++) {
                                        total = total + data[i].length;
                                    }
                                    log.info("Assets = ", total);
                                }
                                _callback();
                            });
                        }
                        else {

                        }
                    }
                )
                ;
            };
            let publishAssets = (assets) => {
                try {

                    for (let i = 0; i < assets.length; i++) {
                        if (assets[i] && assets[i]['publish_details']) {
                            let _lang = _.findIndex(languages, {'code': lang});
                            if (~_lang) {
                                let _entry = {
                                    title: assets[i]['filename'] || assets[i]['uid'],
                                    entry_uid: assets[i]['uid']
                                };

                                if (assets[i]['_version']) _entry['version'] = assets[i]['_version'];

                                q.push({
                                    message: {
                                        body: {
                                            object: {
                                                entry: _entry,
                                                locale: [lang],
                                                environment: [env.environment.uid],
                                                action: "publish",
                                                type: "asset"
                                            },
                                            restore: true
                                        }
                                    },
                                    lang: languages[_lang]
                                });

                                if (!isProgress) {
                                    let assetData = q.shift();
                                    log.info("=============== Started synchronizing Assets ===============");
                                    self.sync.start(assetData);
                                    isProgress = true;
                                    log.info("Asset info: " + JSON.stringify(assetData.message.body));
                                }
                            }
                        }
                    }
                } catch (e) {
                    log.error("Asset publishing/unpublishing failed ", e.message);
                }
            };

            utility
                .getAssets(options)
                .then( (body) => {
                    if (body && body.assets && body.assets.length) {
                        loadBatch(body.count);
                    } else {
                        log.error('Asset count "Not Received", skipping assets sync.');
                        _callback();
                     }
                })
                .fail( (err) => {
                    log.error("Asset publishing/unpublishing failed ", JSON.stringify(err));
                    _callback();
                }); 
    }
}

module.exports = Sync;

