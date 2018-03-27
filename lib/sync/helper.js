/**
 * Module dependencies.
 */

var path = require('path'),
    fs = require('graceful-fs'),
    url = require('url'),
    _ = require('lodash'),
    pathToRegexp = require('path-to-regexp'),
    mkdirp = require('mkdirp'),
    request = require('request'),
    async = require('async'),
    utils = require('./../utils/index'),
    pkg = require('./../../package.json'),
    db = utils.db;

var config = utils.config,
    languages = config.get('languages'),
    _types = config.get('contentstack.types'),
    assetDownloadFlag = config.get('assets.download'),
    headers = {
        api_key: config.get('contentstack.api_key'),
        access_token: config.get('contentstack.access_token'),
        'X-User-Agent': 'contentstack-express/' + pkg.version
    },
    InMemory = require('../utils/db/inmemory'),
    assetsConf = config.get('assets');
var log = utils.sync;
var server = config.get('server');
var helper = module.exports = {};

// create all directories as per path
helper.mkdirAllSync = function (path, permission) {
    mkdirp.sync(path, permission);
};

// remove extra and unwanted keys from entry object
helper.deleteKeys = function (entry) {
    var keys = ["ACL", "publish_details"],
    entry = entry.object || entry,
    d = new Date();
    entry.uid = (entry._metadata && entry._metadata.uid) ? entry._metadata.uid : entry.uid;
    entry.published_at = d.toISOString();
    return _.omit(entry, keys);
};

/**
 * Helper method that fetches deployed releases
 * @param  {object}   release  : Release object that has been deployed
 * @param  {Function} callback : Error first callback to indicate status of the method
 * @return {object}
 */
helper.fetchRelease = function (release, callback) {
    console.log('Fetching release:', config.get('contentstack.host') + "/" + config.get('contentstack.version') + config.get('contentstack.urls.releases') + release.entry.uid);
    return request({
        url: config.get('contentstack.host') + "/" + config.get('contentstack.version') + config.get('contentstack.urls.releases') + release.entry.uid,
        method: 'GET',
        headers: headers,
        json: true
    }, function (error, response, body) {
        try {
            if (error)
                return callback(error);
            else if (response.statusCode === 200) {
                if (body.release && body.release.items && body.release.items.length) {
                    // console.log('@body', JSON.stringify(body));
                    var _items = body.release.items;
                    // Mark each item in release with the release's ID
                    _items.forEach(function (item) {
                        item._release_uid = release.entry.uid;
                        item._release_name = server;
                    });
                    // Add flags to the first and last elements
                    // Consider: single element
                    _items[0]._isFirst = true;
                    _items[_items.length - 1]._isLast = true;
                    // Return _items
                    return callback(null, _items);
                } else {
                    // If release is empty
                    return callback(new Error('Release: ' +  release.entry.title + ', with UID: ' + release.entry.uid + ' failed.'));
                }
                return callback(null, body);
            } else {
                return callback(body);
            }
        } catch (error) {
            return callback(error);
        }
    });
}

helper.groupReleaseItems = function (items) {
    var _release = {
        success: [],
        failure: []
    };
    var i = 0;
    while(i < items.length) {
        delete items[i]._release_uid;
        delete items[i]._release_name;
        delete items[i]._isFirst;
        delete items[i]._isLast;
        if (items[i].status === -1){
            _release.failure.push(items[i]);
        } else {
            _release.success.push(items[i]);
        }
        i++;
    }
    return _release;
}

helper.updateRelease = function (release) {
    try {
        var _msg = this.groupReleaseItems(release.items), _release = {};
        if (_msg.failure.length > 0) {
            _release = {
                status: 3,
                message: _msg,
                name: server
            };
        } else {
            _release = {
                status: 2,
                message: "Release has been deployed successfully!",
                name: server
            };
        }

        console.log('\n------ RELEASE ------');
        console.log(JSON.stringify(_release));
        console.log('----------------------\nURL:', config.get('contentstack.host') + "/" + config.get('contentstack.version') + config.get('contentstack.urls.publish_queue') + release.uid, ' \n');
        return request({
            url: config.get('contentstack.host') + "/" + config.get('contentstack.version') + config.get('contentstack.urls.publish_queue') + release.uid,
            method: 'PUT',
            headers: headers,
            json: {
                entry: _release
            }
        }, function (error, response, body) {
            if (error) {
                // TODO: If network error, go into a setTimeout loop (exponential increment)
                log.error('Release ' + release.uid + '(uid) failed to update status at Contentstack. Error reason::' + error);
                console.log('@body', JSON.stringify(body));
                console.log('@error', error);
            } else {
                console.log('@release update response', JSON.stringify(body));
                log.info('Release ' + release.uid + '(uid) updated successfully at Contentstack.');
            }
        });
    } catch (error) {
        log.error('Release ' + release.uid + '(uid) failed to update status at Contentstack. Error reason::' + error);
    }
}

// update references in entry object
helper.updateReferences = function (data) {
    if (data && data.schema && data.entry) {
        var parent = [];
        var update = function (parent, form_id, entry) {
            var _entry = entry,
            len = parent.length;
            for (var j = 0; j < len; j++) {
                if (_entry && parent[j]) {
                    if (j == (len - 1) && _entry[parent[j]]) {
                        if (form_id !== '_assets') {
                            _entry[parent[j]] = {values: _entry[parent[j]], _content_type_id: form_id};
                        } else {
                            if (_entry[parent[j]] instanceof Array) {
                                var assetIds = [];
                                for (var k = 0; k < _entry[parent[j]].length; k++) {
                                    assetIds.push(_entry[parent[j]][k]['uid'])
                                }
                                _entry[parent[j]] = {values: assetIds, _content_type_id: form_id};
                            } else {
                                _entry[parent[j]] = {values: _entry[parent[j]]['uid'], _content_type_id: form_id};
                            }
                        }
                    } else {
                        _entry = _entry[parent[j]];
                        var _keys = _.clone(parent).splice(eval(j + 1), len);
                        if (_entry instanceof Array) {
                            for (var i = 0, _i = _entry.length; i < _i; i++) {
                                update(_keys, form_id, _entry[i]);
                            }
                        } else if (!_entry instanceof Object) {
                            break;
                        }
                    }
                }
            }
        };
        var find = function (schema, entry) {
            for (var i = 0, _i = schema.length; i < _i; i++) {
                switch(schema[i].data_type) {
                    case "reference":
                        parent.push(schema[i].uid);
                        update(parent, schema[i].reference_to, entry);
                        parent.pop();
                        break;
                    case "file":
                        if (!assetDownloadFlag) {
                            parent.push(schema[i].uid);
                            update(parent, '_assets', entry);
                            parent.pop();
                        }
                        break;
                    case "group":
                        parent.push(schema[i].uid);
                        find(schema[i].schema, entry);
                        parent.pop();
                        break;
                    case "blocks":
                        for (var j = 0, _j = schema[i].blocks.length; j < _j; j++) {
                            parent.push(schema[i].uid);
                            parent.push(schema[i].blocks[j].uid);
                            find(schema[i].blocks[j].schema, entry);
                            parent.pop();
                            parent.pop();
                        }
                    break;
                }
            }
        };
        find(data.schema, data.entry);
    }
    return data;
};

// Generate the full assets url foro the given url
function getAssetUrl(assetUrl, lang) {
    var relativeUrlPrefix = assetsConf.relative_url_prefix
    assetUrl = relativeUrlPrefix + assetUrl;
    if (!(lang.relative_url_prefix == "/" || lang.host)) {
        assetUrl = lang.relative_url_prefix.slice(0, -1) + assetUrl;
    }
    return assetUrl;
}

// Used to generate asset path from keys using asset
function urlFromObject(_asset) {
    var values = [],
    _keys = assetsConf.keys;

    for (var a = 0, _a = _keys.length; a < _a; a++) {
        if (_keys[a] == "uid") {
            values.push((_asset._metadata && _asset._metadata.object_id) ? _asset._metadata.object_id : _asset.uid);
        } else if (_asset[_keys[a]]) {
            values.push(_asset[_keys[a]]);
        } else {
            throw new TypeError("'" + _keys[a] + "' key is undefined in asset object.");
        }
    }
    return values;
}

// replace assets url
helper.replaceAssetsUrl = function (_assets, content_type, entry, lang) {
    if (content_type && content_type.schema && entry) {
        var parent = [];
        var replace = function (parent, schema, entry) {
            var _entry = entry,
            len = parent.length,
            assetsConf = config.get('assets'),
            _path = lang.assetsPath;
            for (var j = 0; j < len; j++) {
                if (j == (len - 1) && _entry[parent[j]]) {
                    if (_entry[parent[j]] instanceof Array) {
                        for (var i = 0, _i = _entry[parent[j]].length; i < _i; i++) {
                            replace([i], schema, _entry[parent[j]]);
                        }
                    } else {
                        switch (schema.data_type) {
                            case 'file':
                                if(_.isPlainObject(_entry[parent[j]])) {
                                    if(_.has(_entry[parent[j]]), 'filename' && _.has(_entry[parent[j]], 'url')) {
                                        var paths = urlFromObject(_entry[parent[j]]),
                                        _url = getAssetUrl(paths.join('/'), lang);
                                        _entry[parent[j]]._internal_url = _url;
                                    }
                                }
                                break;
                            case "text":
                            var _matches, regex, __entry;
                                //for the v2 Stack
                                if (schema && schema.field_metadata && schema.field_metadata.markdown) {
                                    regex = new RegExp('https://(dev-new-|stag-new-|)(contentstack-|)api.(built|contentstack).io/(.*?)/download(.*?)uid=([a-z0-9]+[^&\?\s\n])((.*)[\n\s]?)', 'g');
                                } else {
                                    regex = new RegExp('https://(dev-new-|stag-new-|)(contentstack-|)api.(built|contentstack).io/(.*?)/download(.*?)uid=([a-z0-9]+[^\?&\'"])(.*?)', 'g');
                                }
                                __entry = _entry[parent[j]].slice(0);
                                while ((_matches = regex.exec(_entry[parent[j]])) !== null) {
                                    if (_matches && _matches.length) {
                                        var download_id = url.parse(_matches[0]).pathname.split('/').slice(1).join('/'),
                                        obj = _assets[download_id];
                                        if (obj && obj['url'] && obj['url'] == _matches[0]) __entry = (schema && schema.field_metadata && schema.field_metadata.markdown) ? __entry.replace(_matches[0], encodeURI(obj._internal_url) + "\n") : __entry.replace(_matches[0], obj._internal_url);
                                    }
                                }
                                _entry[parent[j]] = __entry;

                                //for the v3.x Stack
                                var _matches2, __entry2, regex2;
                                if (schema && schema.field_metadata && schema.field_metadata.markdown) {
                                    regex2 = new RegExp('(https://(dev-|stag-|)(assets|images).contentstack.io/v[\\d]/assets/(.*?)/(.*?)/(.*?)/(.*))', 'g');
                                } else {
                                    regex2 = new RegExp('[\"](https://(dev-|stag-|)(assets|images).contentstack.io/v[\\d]/assets/(.*?)/(.*?)/(.*?)/(.*?))[\"]', 'g');
                                }
                                __entry2 = _entry[parent[j]].slice(0);
                                while ((_matches2 = regex2.exec(_entry[parent[j]])) !== null) {
                                    if (_matches2 && _matches2.length) {
                                        var _url = _matches2[1];
                                        var download_id = url.parse(_url).pathname.split('/').slice(4).join('/'),
                                        _obj = _assets[download_id];
                                        if (_obj && _obj['url'] && _obj['url'] == _url) __entry2 = (schema && schema.field_metadata && schema.field_metadata.markdown) ? __entry2.replace(_url, encodeURI(_obj._internal_url) + "\n") : __entry2.replace(_url, _obj._internal_url);
                                    }
                                }
                                _entry[parent[j]] = __entry2;
                                break;
                            }
                        }
                    } else {
                        _entry = _entry[parent[j]];
                        var _keys = _.clone(parent).splice(eval(j + 1), len);
                        if (_entry instanceof Array) {
                            for (var i = 0, _i = _entry.length; i < _i; i++) {
                                replace(_keys, schema, _entry[i]);
                            }
                        } else if (typeof _entry != "object") {
                            break;
                        }
                    }
                }
            };
            var find = function (schema, entry) {
                for (var i = 0, _i = schema.length; i < _i; i++) {
                    if ((assetDownloadFlag && schema[i].data_type == "file") || (schema[i].data_type == "text")) {
                        parent.push(schema[i].uid);
                        replace(parent, schema[i], entry);
                        parent.pop();
                    }
                    if (schema[i].data_type == "group") {
                        parent.push(schema[i].uid);
                        find(schema[i].schema, entry);
                        parent.pop();
                    }
                    if (schema[i].data_type === 'blocks') {
                        for (var j = 0, _j = schema[i].blocks.length; j < _j; j++) {
                            parent.push(schema[i].uid);
                            parent.push(schema[i].blocks[j].uid);
                            find(schema[i].blocks[j].schema, entry);
                            parent.pop();
                            parent.pop();
                        }
                    }
                }
            };
            find(content_type.schema, entry);
            return entry;
        }
    };

// get assets object
helper.getAssetsIds = function (data, langCode) {
    if (data && data.content_type && data.content_type.schema && data.entry) {
        var parent = [],
        assetsIds = [];
        var _get = function (schema, _entry) {
            switch (schema.data_type) {
                case "file":
                if (_entry && _entry.uid) {
                    var _query = {
                        _uid: _entry.uid,
                        _content_type_uid: '_assets'
                    };
                    var asset = InMemory.get(langCode, '_assets', _query);
                    if(_.isPlainObject(asset[0]) && _.has(asset[0], 'uid')) {
                        assetsIds.push(_entry);
                    } else {
                        for(key in _entry) {
                            if(key !== 'uid' && key !== 'filename')
                                delete _entry[key];
                        }
                    }
                }
                break;
                case "text":
                    // for v2 stack
                    var _matches, regex;
                    if (schema && schema.field_metadata && schema.field_metadata.markdown) {
                        regex = new RegExp('https://(dev-new-|stag-new-|)(contentstack-|)api.(built|contentstack).io/(.*?)/download(.*?)uid=([a-z0-9]+[^\?&\s\n])((.*)[\n\s]?)', 'g');
                    } else {
                        regex = new RegExp('https://(dev-new-|stag-new-|)(contentstack-|)api.(built|contentstack).io/(.*?)/download(.*?)uid=([a-z0-9]+[^\?&\'"])(.*?)', 'g');
                    }
                    while ((_matches = regex.exec(_entry)) !== null) {
                        if (_matches && _matches.length) {
                            var assetObject = {};
                            if (_matches[6]) assetObject['uid'] = _matches[6];
                            if (_matches[0]) {
                                assetObject['url'] = _matches[0];
                                assetObject['download_id'] = url.parse(_matches[0]).pathname.split('/').slice(1).join('/')
                            }
                            assetsIds.push(assetObject);
                        }
                    }

                    // for v3.x stack
                    var _matches2, regex2;
                    if (schema && schema.field_metadata && schema.field_metadata.markdown) {
                        regex2 = new RegExp('(https://(dev-|stag-|)(assets|images).contentstack.io/v[\\d]/assets/(.*?)/(.*?)/(.*?)/(.*))', 'g');
                    } else {
                        regex2 = new RegExp('[\"](https://(dev-|stag-|)(assets|images).contentstack.io/v[\\d]/assets/(.*?)/(.*?)/(.*?)/(.*?))[\"]', 'g');
                    }
                    while ((_matches2 = regex2.exec(_entry)) !== null) {
                        if (_matches2 && _matches2.length) {
                            var _assetObject = {},
                            _url = _matches2[1];
                            if (_matches2[5]) _assetObject['uid'] = _matches2[5];
                            if (_matches2[1]) {
                                _assetObject['url'] = _url;
                                _assetObject['download_id'] = url.parse(_url).pathname.split('/').slice(4).join('/');
                            }
                            assetsIds.push(_assetObject);
                        }
                    }
                    break;
            }
        };
            
        var get = function (parent, schema, entry) {
            var _entry = entry,
            len = parent.length;
            for (var j = 0; j < len; j++) {
                _entry = _entry[parent[j]];
                if (j == (len - 1) && _entry) {
                    if (_entry instanceof Array) {
                        for (var i = 0, _i = _entry.length; i < _i; i++) {
                            _get(schema, _entry[i]);
                        }
                    } else {
                        _get(schema, _entry);
                    }

                } else {
                    var _keys = _.clone(parent).splice(eval(j + 1), len);
                    if (_entry instanceof Array) {
                        for (var i = 0, _i = _entry.length; i < _i; i++) {
                            get(_keys, schema, _entry[i]);
                        }
                    } else if (typeof _entry != "object") {
                        break;
                    }
                }
            }
        };
        var find = function (schema, entry) {
            for (var i = 0, _i = schema.length; i < _i; i++) {
                if ((assetDownloadFlag && schema[i].data_type == "file") || (schema[i].data_type == "text")) {
                    parent.push(schema[i].uid);
                    get(parent, schema[i], entry);
                    parent.pop();
                }
                if (schema[i].data_type == "group") {
                    parent.push(schema[i].uid);
                    find(schema[i].schema, entry);
                    parent.pop();
                }
                if (schema[i].data_type === 'blocks') {
                    for (var j = 0, _j = schema[i].blocks.length; j < _j; j++) {
                        parent.push(schema[i].uid);
                        parent.push(schema[i].blocks[j].uid);
                        find(schema[i].blocks[j].schema, entry);
                        parent.pop();
                        parent.pop();
                    }
                }
            }
        };
        find(data.content_type.schema, data.entry);
        return assetsIds;
    }
};

// download or remove assets
helper.getAssets = function () {
    var _assets = {};

    for (var i = 0, _i = languages.length; i < _i; i++) {
        var __path = languages[i].assetsPath;
        if (!fs.existsSync(path.join(__path, '_assets.json'))) fs.writeFileSync(path.join(__path, '_assets.json'), "[]");
        _assets[languages[i].code] = path.join(__path, '_assets.json');
    }
    return function (asset, lang, remove, cb) {
        try {
            var assets = _.pluck(JSON.parse(fs.readFileSync(_assets[lang.code], 'utf8')), '_data'),
            _path = lang.assetsPath,
            assetUid = (!remove) ? asset.uid : asset,
            relativeUrlPrefix = assetsConf.relative_url_prefix,
            _assetObject = {}, _rteAsset = {};

            if (assets && assets.length) {
                _assetObject = _.find(assets, function (_asset) {
                    if (_asset.uid === assetUid && _asset._version) return _asset;
                });
                // check whether asset is referred in RTE/markdown
                if (!_.isEmpty(_assetObject)) {
                    _rteAsset = _.find(assets, function (obj) {
                        if (obj.uid === _assetObject.uid && obj.download_id && obj.filename === _assetObject.filename) {
                            return obj;
                        }
                    });
                }
            }

            if (!asset.download_id) {
                if (!remove) {
                    var isForceLoad = asset.force_load || false;
                    delete asset.ACL;
                    delete asset.app_user_object_uid;
                    delete asset.force_load;
                    if (asset.publish_details) delete asset.publish_details;
                    var paths = urlFromObject(asset),
                    _url = getAssetUrl(paths.join('/'), lang);

                    paths.unshift(_path);

                    // current assets path
                    var _assetPath = path.join.apply(path, paths);

                    asset._internal_url = _url;
                    if (!_.isEmpty(_assetObject) && _.isEqual(_assetObject, asset) && !isForceLoad && fs.existsSync(_assetPath)) {
                        async.setImmediate(function () {
                            cb(null, asset);
                        });
                    } else {
                        //remove old asset if not referred in RTE;
                        if (asset && !_.isEmpty(_assetObject) && _.isEmpty(_rteAsset)) {
                            var oldAssetPath = urlFromObject(_assetObject);
                            oldAssetPath.unshift(_path);
                            if (fs.existsSync(path.join.apply(path, oldAssetPath))) {
                                fs.unlinkSync(path.join.apply(path, oldAssetPath));
                            }
                        }
                        asset._internal_url = _url;
                        helper.downloadAssets(_assetPath, asset, function (err, data) {
                            if (err) {
                                async.setImmediate(function () {
                                    cb(err, null);
                                });
                            } else {
                                db
                                .Assets(asset.uid)
                                .language(lang.code)
                                .update(asset)
                                .then(function () {
                                    async.setImmediate(function () {
                                        cb(null, asset);
                                    });
                                }, function (err) {
                                    async.setImmediate(function () {
                                        cb(err);
                                    });

                                });
                            }
                        });
                    }
                } else {
                    if (!_.isEmpty(_assetObject)) {
                        var _paths = urlFromObject(_assetObject);
                        _paths.unshift(_path);
                        var __assetPath = path.join.apply(path, _paths);
                        var isRemove = _.isEmpty(_rteAsset);
                        helper.unpublishAsset(asset, lang, __assetPath, isRemove, function (err, data) {
                            if (!err) {
                                async.setImmediate(function () {
                                    cb(null, null);
                                });
                            } else {
                                async.setImmediate(function () {
                                    cb(err);
                                });
                            }
                        });
                    } else {
                        async.setImmediate(function () {
                            cb(null, null);
                        });
                    }
                }
            } else {
                // RTE/markdown assets download
                var rteAssets = _.find(assets, {'download_id': asset.download_id, 'url': asset.url});
                if (rteAssets) {
                    async.setImmediate(function () {
                        cb(null, rteAssets);
                    });
                } else {
                    var paths = [asset.uid];
                    paths.unshift(_path);
                    var assetPath = path.join.apply(path, paths);
                    helper.downloadAssets(assetPath, asset, function (err, data) {
                        if (!err) {
                            var paths = urlFromObject(data),
                            _url = getAssetUrl(paths.join('/'), lang);
                            delete data._internal_url;
                            data._internal_url = _url;
                            db
                            .Assets(data.download_id)
                            .language(lang.code)
                            .update(data)
                            .then(function () {
                                async.setImmediate(function () {
                                    cb(null, data);
                                });
                            }, function (err) {
                                async.setImmediate(function () {
                                    cb(err);
                                });
                            });
                        } else {
                            async.setImmediate(function () {
                                cb(err, null);
                            });
                        }
                    });
                }
            }
        } catch (e) {
            async.setImmediate(function () {
                cb(e, null);
            });
        }
    };
}();

// download assets
helper.downloadAssets = function (assetsPath, asset, callback) {
    headers.authtoken = headers.access_token;
    var out = request({url: asset.url, headers: headers});
    out.on('response', function (resp) {
        if (resp.statusCode === 200) {
            if (asset.download_id) {
                var attachment = resp.headers['content-disposition'];
                asset['filename'] =  decodeURIComponent(attachment.split('=')[1]);
            }
            var _path = assetsPath.replace(asset.filename, '');
            if (!fs.existsSync(_path)) helper.mkdirAllSync(_path, 0755);
            var localStream = fs.createWriteStream(path.join(_path, asset.filename));
            out.pipe(localStream);
            localStream.on('close', function () {
                callback(null, asset);
            });
        } else {
            callback("No file found at given url: " + asset.url, null);
        }
    });
    out.on('error', function (e) {
        callback("Error in media request: " + e.message, null);
    });
    out.end();
};

// unpublish Assets
helper.unpublishAsset = function (assetUid, lang, assetPath, isRemove, callback) {
    if (isRemove && fs.existsSync(assetPath)) {
        fs.unlinkSync(assetPath);
    }
    db
    .Assets(assetUid)
    .language(lang.code)
    .remove()
    .then(function () {
        callback();
    }, function (err) {
        callback(err);
    });
};

//delete assets
helper.deleteAssets = function (assetUid, lang, callback) {
    try {
        var _path = lang.assetsPath,
        paths = [assetUid];
        paths.unshift(_path);
        var assetFolderPath = path.join.apply(_path, paths);
        helper.deleteAssetFolder(assetFolderPath, function (err, data) {
            if (err) throw err;
            db
            .Assets()
            .language(lang.code)
            .Query()
            .toJSON()
            .find()
            .spread(function (_assets) {
                if (_assets && _assets.length) {
                    var _entries = _.reject(_assets, {uid: assetUid});
                    db
                    .Assets()
                    .language(lang.code)
                    .Entry()
                    .Query()
                    .query({"_bulk_insert": true, "entries": _entries})
                    .update()
                    .then(function () {
                        return callback(null, null);
                    }, function (err) {
                        throw err;
                    });
                } else {
                    callback(null, null);
                }
            }, function (err) {
                throw err;
            });
        });
    } catch (e) {
        callback("Error: " + e);
    }
};

// delete asset folder based on uid
helper.deleteAssetFolder = function (assetPath, callback) {
    try {
        if (fs.existsSync(assetPath)) {
            fs.readdir(assetPath, function (err, files) {
                if (!err) {
                    for (var i = 0, _i = files.length; i < _i; i++) {
                        fs.unlinkSync(path.join(assetPath, files[i]));
                    }
                    fs.rmdirSync(assetPath);
                    callback(null, null);
                } else {
                    throw err;
                }
            });
        } else {
            callback(null, null)
        }
    } catch (e) {
        callback("Error: " + e);
    }
};

// load plugins
helper.loadPlugins = function (dir) {
    var files = fs.readdirSync(dir);
    for (var i = 0, total = files.length; i < total; i++) {
        var pluginFolder = path.join(dir, files[i]);
        if (fs.lstatSync(pluginFolder).isDirectory()) {
            var plugin = path.join(pluginFolder, "index.js");
            if (fs.existsSync(plugin)) {
                require(plugin);
            }
        }
    }
};

// check value in string or array
helper.pluginChecker = function (str, value) {
    var flag = true;
    if (value && !((typeof value == "object" && value.indexOf(str) != -1) || value == str || value == "*")) {
        flag = false;
    }
    return flag;
};

// execute plugins
helper.executePlugins = function () {
    var plugins = utils.plugin._syncUtility,
    _environment = config.get('environment'),
    _server = config.get('server');
    return function (data, callback) {
        try {
            // load plugins
            // type, entry, contentType, lang, action
            var _loadPlugins = [],
            _data = {"language": data.language};

            switch (data.type) {
                case _types.entry:
                _data.entry = data.entry;
                _data.content_type = data.content_type;
                break;
                case _types.asset:
                _data.asset = data.asset;
                break;
            }
            for (var i in plugins) {
                //if (helper.pluginChecker(contentType && contentType.uid, plugins[i].content_types) && helper.pluginChecker(lang.code, plugins[i].languages) && helper.pluginChecker(_environment, plugins[i].environments) && helper.pluginChecker(_server, plugins[i].servers) && plugins[i][action]) {
                    if (plugins[i][data.action]) {
                        _loadPlugins.push(function (i) {
                            return function (cb) {
                                plugins[i][data.action](_data, cb);
                            };
                        }(i));
                    }
                }
                async.series(_loadPlugins, function (err, res) {
                    if (err) {
                        callback(err, null);
                    } else {
                        switch (data.type) {
                            case _types.entry:
                            callback(null, {"entry": data.entry, "content_type": data.content_type});
                            break;
                            case _types.asset:
                            callback(null, {"asset": data.asset});
                            break;
                        }
                    }
                });
            } catch (e) {
                callback(e, null);
            }
        };
    }();

// get message
helper.message = function (err) {
    if (typeof err == "object") {
        if (err.message) {
            return JSON.stringify(err.message);
        } else if (err.error_message) {
            return JSON.stringify(err.error_message);
        }
        return JSON.stringify(err);
    }
    return err;
};