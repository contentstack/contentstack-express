/**
 * Module dependencies.
 */
var path = require('path'),
    fs = require('graceful-fs'),
    _ = require('lodash'),
    pathToRegexp = require('path-to-regexp'),
    mkdirp = require('mkdirp'),
    request = require('request'),
    async = require('async'),
    utils = require('./../utils/index'),
    db = utils.db;

var config = utils.config,
    languages = config.get('languages'),
    _types = config.get('contentstack.types'),
    assetDownloadFlag = config.get('assets.download'),
    headers = {
        api_key: config.get('contentstack.api_key'),
        access_token: config.get('contentstack.access_token')
    };

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
                if (schema[i].data_type == "reference") {
                    parent.push(schema[i].uid);
                    update(parent, schema[i].reference_to, entry);
                    parent.pop();
                }
                if (!assetDownloadFlag && schema[i].data_type == "file") {
                    parent.push(schema[i].uid);
                    update(parent, '_assets', entry);
                    parent.pop();
                }
                if (schema[i].data_type == "group") {
                    parent.push(schema[i].uid);
                    find(schema[i].schema, entry);
                    parent.pop();
                }
            }
        };
        find(data.schema, data.entry);
    }
    return data;
};

// replace assets url
helper.replaceAssetsUrl = function (_assets, content_type, entry) {
    if (content_type && content_type.schema && entry) {
        var parent = [];
        var replace = function (parent, schema, entry) {
            var _entry = entry,
                len = parent.length;
            for (var j = 0; j < len; j++) {
                if (j == (len - 1) && _entry[parent[j]]) {
                    if (_entry[parent[j]] instanceof Array) {
                        for (var i = 0, _i = _entry[parent[j]].length; i < _i; i++) {
                            replace([i], schema, _entry[parent[j]]);
                        }
                    } else {
                        switch (schema.data_type) {
                            case "file":
                                _entry[parent[j]] = _assets[_entry[parent[j]].uid];
                                break;
                            case "text":
                                var _matches, regex, __entry;
                                //for the old contentstack
                                if (schema && schema.field_metadata && schema.field_metadata.markdown) {
                                    regex = new RegExp('https://(dev-|new-|stag-|)(contentstack-|)api.(built|contentstack).io/(.*?)/download(.*?)uid=([a-z0-9]+[^&\?\s\n])((.*)[\n\s]?)', 'g');
                                } else {
                                    regex = new RegExp('[\'"]https://(dev-|new-|stag-|)(contentstack-|)api.(built|contentstack).io/(.*?)/download(.*?)uid=([a-z0-9]+[^\?&\'"])(.*?)[\'"]', 'g');
                                }
                                __entry = _entry[parent[j]].slice(0);
                                while ((_matches = regex.exec(_entry[parent[j]])) !== null) {
                                    if (_matches && _matches.length && _matches[6] && _assets[_matches[6]]) {
                                        __entry = (schema && schema.field_metadata && schema.field_metadata.markdown) ? __entry.replace(_matches[0], encodeURI(_assets[_matches[6]]._internal_url) + "\n") : __entry.replace(_matches[0], "'" + _assets[_matches[6]]._internal_url + "'");
                                    }
                                }
                                _entry[parent[j]] = __entry;

                                //for the new contentstack
                                var _matches2, regex2, __entry2;
                                if (schema && schema.field_metadata && schema.field_metadata.markdown) {
                                    regex2 = new RegExp('https://(dev-|stag-|)(assets|images).contentstack.io/v[\\d]/assets/(.*?)/(.*?)/(.*?)/download', 'g');
                                } else {
                                    regex2 = new RegExp('[\'"]https://(dev-|stag-|)(assets|images).contentstack.io/v[\\d]/assets/(.*?)/(.*?)/(.*?)/download[\'"]', 'g');
                                }
                                __entry2 = _entry[parent[j]].slice(0);
                                while ((_matches2 = regex2.exec(_entry[parent[j]])) !== null) {
                                    if (_matches2 && _matches2.length && _matches2[4] && _assets[_matches2[4]]) {
                                        __entry2 = (schema && schema.field_metadata && schema.field_metadata.markdown) ? __entry2.replace(_matches2[0], encodeURI(_assets[_matches2[4]]._internal_url) + "\n") : __entry2.replace(_matches2[0], "'" + _assets[_matches2[4]]._internal_url + "'");
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
            }
        };
        find(content_type.schema, entry);
        return entry;
    }
};

// get assets object
helper.getAssetsObject = function (data) {
    if (data && data.content_type && data.content_type.schema && data.entry) {
        var parent = [],
            assetsIds = [];
        var _get = function (schema, _entry) {
            switch (schema.data_type) {
                case "file":
                    if (_entry && _entry.uid) {
                        assetsIds.push(_entry);
                    }
                    break;
                case "text":
                    var _matches, regex;
                    if (schema && schema.field_metadata && schema.field_metadata.markdown) {
                        regex = new RegExp('https://(dev-|stag-|)(contentstack-|)api.(built|contentstack).io/(.*?)/download(.*?)uid=([a-z0-9]+[^\?&\s\n])((.*)[\n\s]?)', 'g');
                    } else {
                        regex = new RegExp('https://(dev-|stag-|)(contentstack-|)api.(built|contentstack).io/(.*?)/download(.*?)uid=([a-z0-9]+[^\?&\'"])(.*?)', 'g');
                    }
                    while ((_matches = regex.exec(_entry)) !== null) {
                        if (_matches && _matches.length) {
                            var assetObject = {};
                            if (_matches[6]) assetObject['uid'] = _matches[6];
                            if (_matches[0]) assetObject['url'] = _matches[0];
                            if (_matches[4]) {
                                var downloadToken = _matches[4].split('/')
                                if (downloadToken && downloadToken.length && downloadToken[2]) assetObject['download_id'] = downloadToken[2];
                            }
                            assetsIds.push(assetObject);
                        }
                    }
                    var _matches2, regex2;
                    if (schema && schema.field_metadata && schema.field_metadata.markdown) {
                        regex2 = new RegExp('https://(dev-|stag-|)(assets|images).contentstack.io/v[\\d]/assets/(.*?)/(.*?)/(.*?)/download', 'g');
                    } else {
                        regex2 = new RegExp('https://(dev-|stag-|)(assets|images).contentstack.io/v[\\d]/assets/(.*?)/(.*?)/(.*?)/download', 'g');
                    }

                    while ((_matches2 = regex2.exec(_entry)) !== null) {
                        if (_matches2 && _matches2.length) {
                            var _assetObject = {};
                            if (_matches2[4]) _assetObject['uid'] = _matches2[4];
                            if (_matches2[0]) _assetObject['url'] = _matches2[0];
                            if (_matches2[5]) _assetObject['download_id'] = _matches2[5];
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
            }
        };
        find(data.content_type.schema, data.entry);
        return _.uniq(assetsIds);
    }
};

// download or remove assets
helper.getAssets = function () {
    var assetsConf = config.get('assets'),
        _assets = {};

    for (var i = 0, _i = languages.length; i < _i; i++) {
        var __path = languages[i].assetsPath;
        if (!fs.existsSync(path.join(__path, '_assets.json'))) fs.writeFileSync(path.join(__path, '_assets.json'), "[]");
        _assets[languages[i].code] = path.join(__path, '_assets.json');
    }
    return function (asset, lang, remove, cb) {
        try {
            var assets = _.pluck(JSON.parse(fs.readFileSync(_assets[lang.code], 'utf8')), '_data'),
                _path = lang.assetsPath,
                relativeUrlPrefix = assetsConf.relative_url_prefix;

            // Generate the full assets url foro the given url
            function getAssetUrl(assetUrl) {
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

            if (!asset.download_id) {
                var _assetObject = _.find(assets, {'uid': (!remove) ? asset.uid : asset});
                if (!remove) {
                    var isForceLoad = asset.force_load || false;
                    delete asset.ACL;
                    delete asset.app_user_object_uid;
                    delete asset.force_load;
                    if (asset.publish_details) delete asset.publish_details;

                    var paths = urlFromObject(asset),
                        _url = getAssetUrl(paths.join('/'));

                    paths.unshift(_path);

                    // current assets path
                    var _assetPath = path.join.apply(path, paths);

                    asset._internal_url = _url;
                    if (_.isEqual(_assetObject, asset) && !isForceLoad && fs.existsSync(_assetPath)) {
                        async.setImmediate(function () {
                            cb(null, asset);
                        });
                    } else {
                        asset._internal_url = _url;
                        // delete the asset if it is modified
                        if (assets && _assetObject) {
                            var oldAssetPath = urlFromObject(_assetObject);
                            oldAssetPath.unshift(_path);
                            helper.deleteOldAsset(path.join.apply(path, oldAssetPath));
                        }
                        helper.downloadAssets(_assetPath, asset, function (err, data) {
                            if (err) {
                                async.setImmediate(function () {
                                    cb(err, null);
                                });
                            } else {
                                delete data._internal_url;
                                assets[data.uid] = _.clone(data, true);
                                data._internal_url = _url;
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
                    if (_assetObject) {
                        var paths = urlFromObject(_assetObject);
                        paths.unshift(_path);
                        var _assetPath = path.join.apply(path, paths),
                            assetFolderPath = path.join(_path, paths[1]);
                        helper.deleteAssets(_assetPath, assetFolderPath);
                        db
                            .Assets(asset)
                            .language(lang.code)
                            .remove()
                            .then(function () {
                                async.setImmediate(function () {
                                    cb(null, null);
                                });
                            }, function (err) {
                                async.setImmediate(function () {
                                    cb(null, null);
                                });
                            });
                    } else {
                        async.setImmediate(function () {
                            cb(null, null);
                        });
                    }
                }
            } else {
                var __assets = _.find(assets, {'uid': asset.uid, 'download_id': asset.download_id});
                if (__assets && _.isEqual(__assets, asset)) {
                    async.setImmediate(function () {
                        cb(null, asset);
                    });
                } else {
                    asset['filename'] = asset.uid;
                    var paths = urlFromObject(asset);
                    paths.unshift(_path);
                    var assetPath = path.join.apply(path, paths);
                    delete asset.filename;
                    helper.downloadEmbedAssets(assetPath, asset, function (err, data) {
                        if (!err) {
                            var paths = urlFromObject(data),
                                _url = getAssetUrl(paths.join('/'));
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
            var _path = assetsPath.replace(asset.filename, '');
            helper.mkdirAllSync(_path, 0755);
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

// download Embed Assets
helper.downloadEmbedAssets = function (assetPath, asset, callback) {
    headers.authtoken = headers.access_token;
    var out = request({url: asset.url, headers: headers});
    out.on('response', function (resp) {
        if (resp.statusCode === 200) {
            var _path = assetPath.replace(asset.filename, '');
            var attachment = resp.headers['content-disposition'],
                contentType = resp.headers['content-type'],
                filename = attachment.split('=')[1];
            helper.mkdirAllSync(_path, 0755);
            var localStream = fs.createWriteStream(path.join(_path, filename));
            out.pipe(localStream);
            localStream.on('close', function () {
                asset['filename'] = filename;
                asset['content_type'] = contentType;
                callback(null, asset);
            });
        }
    });
    out.on('error', function (e) {
        callback("Error in media request: " + e.message, null);
    });
    out.end();
};

// delete assets
helper.deleteOldAsset = function (fileLink, folderLink) {
    if (fs.existsSync(fileLink)) {
        fs.unlinkSync(fileLink);
        if (typeof folderLink != 'undefined' && fs.existsSync(folderLink)) fs.rmdirSync(folderLink);
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
            ;

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
                    ;
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