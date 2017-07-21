/**
 * Module dependencies.
 */
var path = require('path'),
    fs = require('fs'),
    _ = require('lodash'),
    pathToRegexp = require('path-to-regexp'),
    mkdirp = require('mkdirp'),
    request = require('request'),
    async = require('async'),
    utils = require('./../utils/index');

var config = utils.config,
    languages = config.get('languages'),
    _types = config.get('contentstack.types'),
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
    var keys = ["ACL", "_metadata.publish_details", "app_user_object_uid", "published"],
        entry = entry.object || entry,
        d = new Date();

    for (var i = 0, _i = keys.length; i < _i; i++) {
        var _keys = keys[i].split('.'),
            len = _keys.length;

        var _entry = entry;
        for (var j = 0; j < len; j++) {
            if (j == (len - 1))
                delete _entry[_keys[j]];
            else
                _entry = _entry[_keys[j]];
        }
    }
    entry.uid = (entry._metadata && entry._metadata.uid) ? entry._metadata.uid : entry.uid;
    entry.published_at = d.toISOString();
    return entry;
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
                        _entry[parent[j]] = {values: _entry[parent[j]], _content_type_id: form_id};
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
                                if(schema && schema.field_metadata && schema.field_metadata.markdown) {
                                    regex = new RegExp('https://(dev-|stag-|)(contentstack-|)api.(built|contentstack).io/(.*?)/download(.*?)uid=([a-z0-9]+[^&\?\s\n])((.*)[\n\s]?)', 'g');
                                } else {
                                    regex = new RegExp('[\'"]https://(dev-|stag-|)(contentstack-|)api.(built|contentstack).io/(.*?)/download(.*?)uid=([a-z0-9]+[^\?&\'"])(.*?)[\'"]', 'g');
                                }
                                __entry = _entry[parent[j]].slice(0);
                                while ((_matches = regex.exec(_entry[parent[j]])) !== null) {
                                    if (_matches && _matches.length && _matches[6] && _assets[_matches[6]]) {
                                        __entry = (schema && schema.field_metadata && schema.field_metadata.markdown) ? __entry.replace(_matches[0], encodeURI(_assets[_matches[6]]._internal_url) + "\n") : __entry.replace(_matches[0], "'" + _assets[_matches[6]]._internal_url + "'");
                                    }
                                }
                                _entry[parent[j]] = __entry;

                                var _matches2, regex2, __entry2;
                                if(schema && schema.field_metadata && schema.field_metadata.markdown) {
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
                if (schema[i].data_type == "file" || (schema[i].data_type == "text")) {
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

// get assets IDs
helper.getAssetsIds = function (data) {
    if (data && data.content_type && data.content_type.schema && data.entry) {
        var parent = [],
            assetsIds = [];
        var _get = function (schema, _entry) {
            switch (schema.data_type) {
                case "file":
                    if (_entry && _entry.uid) {
                        assetsIds.push(_entry.uid);
                    }
                    break;
                case "text":
                    var _matches,regex;
                    if(schema && schema.field_metadata && schema.field_metadata.markdown) {
                        regex = new RegExp('https://(dev-|stag-|)(contentstack-|)api.(built|contentstack).io/(.*?)/download(.*?)uid=([a-z0-9]+[^\?&\s\n])((.*)[\n\s]?)', 'g');
                    } else {
                        regex = new RegExp('[\'"]https://(dev-|stag-|)(contentstack-|)api.(built|contentstack).io/(.*?)/download(.*?)uid=([a-z0-9]+[^\?&\'"])(.*?)[\'"]', 'g');
                    }
                    while ((_matches = regex.exec(_entry)) !== null) {
                        if (_matches && _matches.length && _matches[6]) {
                            assetsIds.push(_matches[6]);
                        }
                    }

                    var _matches2, regex2;
                    if(schema && schema.field_metadata && schema.field_metadata.markdown) {
                        regex2 = new RegExp('https://(dev-|stag-|)(assets|images).contentstack.io/v[\\d]/assets/(.*?)/(.*?)/(.*?)/download', 'g');
                    } else {
                        regex2 = new RegExp('[\'"]https://(dev-|stag-|)(assets|images).contentstack.io/v[\\d]/assets/(.*?)/(.*?)/(.*?)/download[\'"]', 'g');
                    }

                    while ((_matches2 = regex2.exec(_entry)) !== null) {
                        if (_matches2 && _matches2.length && _matches2[4]) {
                            assetsIds.push(_matches2[4]);
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
                if (schema[i].data_type == "file" || (schema[i].data_type == "text")) {
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

    for(var i = 0, _i = languages.length; i < _i; i++) {
        var __path = languages[i].assetsPath;
        if (!fs.existsSync(path.join(__path, '_assets.json'))) fs.writeFileSync(path.join(__path, '_assets.json'), "{}");
        _assets[languages[i].code] = path.join(__path, '_assets.json');
    }
    return function (asset, lang, remove, cb) {
        try {
            var assets = JSON.parse(fs.readFileSync(_assets[lang.code], 'utf8')),
                _path = lang.assetsPath,
                relativeUrlPrefix = assetsConf.relative_url_prefix;

            // Generate the full assets url foro the given url
            function getAssetUrl(assetUrl) {
                assetUrl = relativeUrlPrefix + assetUrl;
                if(!(lang.relative_url_prefix == "/" || lang.host)) {
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

            if (!remove) {
                var isForceLoad = asset.force_load || false;

                delete asset.ACL;
                delete asset.app_user_object_uid;
                delete asset.force_load;
                if(asset._metadata) delete asset._metadata.publish_details;

                var paths = urlFromObject(asset),
                    _url = getAssetUrl(paths.join('/'));

                paths.unshift(_path);

                // current assets path
                var _assetPath = path.join.apply(path, paths);

                if (_.isEqual(assets[asset.uid], asset) && !isForceLoad && fs.existsSync(_assetPath)) {
                    asset._internal_url = _url;
                    async.setImmediate(function () {
                        cb(null, asset);
                    });
                } else {
                    asset._internal_url = _url;
                    // delete the asset if it is modified
                    if(assets && assets[asset.uid]) {
                        var oldAssetPath = urlFromObject(assets[asset.uid]);
                        oldAssetPath.unshift(_path);
                        helper.deleteAssets(path.join.apply(path, oldAssetPath));
                    }

                    helper.downloadAssets(_assetPath, asset, function (err, data) {
                        if (err) {
                            async.setImmediate(function () {
                                cb(err, null);
                            });
                        } else {
                            delete data._internal_url;
                            assets[data.uid] = _.clone(data, true);
                            fs.writeFileSync(_assets[lang.code], JSON.stringify(assets));
                            data._internal_url = _url;
                            async.setImmediate(function () {
                                cb(null, data);
                            });
                        }
                    });
                }
            } else {
                var _asset = assets[asset];
                if (_asset) {
                    var paths = urlFromObject(_asset);
                    paths.unshift(_path);
                    var _assetPath = path.join.apply(path, paths);
                    helper.deleteAssets(_assetPath);
                    delete assets[asset];
                    fs.writeFileSync(_assets[lang.code], JSON.stringify(assets));
                }
                async.setImmediate(function () {
                    cb(null, null);
                });

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

// delete assets
helper.deleteAssets = function (fileLink) {
    if (fs.existsSync(fileLink)) {
        fs.unlinkSync(fileLink);
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

// updateUrl in entries for the singleton:false
helper.updateUrl = (function() {
    var patterns = {
            year_short: {
                field: 'created_at'
            },
            year: {
                field: 'created_at'
            },
            monthname_short: {
                field: 'created_at'
            },
            monthname: {
                field: 'created_at'
            },
            month: {
                field: 'created_at'
            },
            day: {
                field: 'created_at'
            },
            unique_id: {
                field: '_metadata.uid'
            },
            title: {
                field: 'title'
            }
        },
        customFieldPrefix = 'custom_',
        patternsRegExp = new RegExp(":("+Object.keys(patterns).join('|')+")", "gi"),
        monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"],
        shortMonthNames = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"],
        slugRegExp = new RegExp("[^a-z0-9_-]+", "g"),
        slashesRegExp = new RegExp("\/{2,}","g");
    return function(entries, contentType, isEntries) {
        try {
            if (entries && contentType && !contentType.singleton && contentType.options && contentType.options.is_page === true && !_.isUndefined(contentType.options.url_pattern)) {
                var _entries = _.clone(entries, true),
                    urlPattern = contentType.options.url_pattern,
                    prefixUrl = contentType.options.url_prefix || "/",
                    getDateFieldValue = function (pattern, value) {
                        var _value;
                        switch(pattern) {
                            case 'year': _value = value.getFullYear(); break;
                            case 'year_short': _value = parseInt(value.getFullYear().toString().slice(-2)); break;
                            case 'monthname_short': _value = shortMonthNames[value.getMonth()]; break;
                            case 'monthname': _value = monthNames[value.getMonth()]; break;
                            case 'month': _value = (value.getMonth() < 9) ? '0' + (value.getMonth() + 1) : (value.getMonth() + 1); break;
                            case 'day': _value = (value.getDate() < 10) ? '0' + value.getDate() : value.getDate(); break;
                        }
                        return _value;
                    },
                    getPatternValue = function(pattern, entry) {
                        var patternField = patterns[pattern];
                        if(patternField && patternField.field) {
                            var _value;
                            if(pattern !== 'title' && pattern !== 'unique_id' && pattern.indexOf(customFieldPrefix) === -1) {
                                _value = (entry[patternField.field]) ? getDateFieldValue(pattern, new Date(entry[patternField.field])) : undefined;
                            } else if(pattern === 'unique_id') {
                                _value = (isEntries) ? entry['_metadata']['uid'] : entry['uid'];
                            } else {
                                _value = (entry[patternField.field]) ? entry[patternField.field].toLowerCase().replace(slugRegExp, '-') : undefined;
                            }
                            return _value;
                        }
                        return ;
                    },
                    _generateUrl = function (entry) {
                        var url = urlPattern.replace(patternsRegExp, function (_pattern, match) {
                            var replaceVal = getPatternValue(match, entry);
                            return (replaceVal) ? replaceVal : _pattern;
                        });
                        url = (url)? url.replace(slashesRegExp, '/') : url;
                        if(url && url.indexOf('/') === 0) url = url.slice(1);
                        return (url) ? prefixUrl + url : url;
                    };

                if(urlPattern) {
                    if (_entries instanceof Array) {
                        for (var i = 0, _i = _entries.length; i < _i; i++) {
                            if(!isEntries && _entries[i] && _entries[i]['entry'] && !_entries[i]['entry']['url_override'] && _entries[i]['content_type'] && _entries[i]['content_type']['uid'] === contentType.uid) {
                                _entries[i]['entry'] = _entries[i]['entry'] || {};
                                _entries[i]['entry']['url'] = _generateUrl(_entries[i]['entry']);
                            } else if(_entries[i] && isEntries && _entries[i]['_metadata'] && !_entries[i]['_metadata']['url_override']) {
                                _entries[i]['url'] = _generateUrl(_entries[i]);
                            }
                        }
                    } else if (_entries && typeof _entries === 'object') {
                        var actualUrl = (isEntries) ? _entries.url : _entries.entry.url,
                            _generatedUrl = (isEntries) ? _generateUrl(_entries) : _generateUrl(_entries['entry']);
                        if (_generatedUrl !== actualUrl) {
                            if(isEntries) {
                                _entries['_metadata'] = _entries['_metadata'] || {};
                                _entries['_metadata']['url_override'] = true;
                            } else if(!isEntries && _entries.entry) {
                                _entries['entry'] = _entries['entry'] || {};
                                _entries['entry']['url_override'] = true;
                            }
                        }
                    }
                } else {
                    if (_entries && typeof _entries === 'object') {
                        if(isEntries) {
                            _entries['_metadata'] = _entries['_metadata'] || {};
                            _entries['_metadata']['url_override'] = true;
                        } else if(!isEntries && _entries.entry) {
                            _entries['entry'] = _entries['entry'] || {};
                            _entries['entry']['url_override'] = true;
                        }
                    }
                }
                return _entries;
            }
            return entries;
        } catch (err) {
            utils.sync.error("URL Pattern"+err.message);
        }
    }
}());

// execute plugins
helper.executePlugins = function () {
    var plugins = utils.plugin._syncUtility,
        _environment = config.get('environment'),
        _server = config.get('server');

    return function(data, callback) {
        try {
            // load plugins
            // type, entry, contentType, lang, action
            var _loadPlugins = [],
                _data = {"language": data.language};

            switch(data.type) {
                case _types.entry:
                    _data.entry = data.entry;
                    _data.content_type = data.content_type;
                    break;
                case _types.asset:
                    _data.asset = data.asset;
                    break;
            };

            for (var i in plugins) {
                //if (helper.pluginChecker(contentType && contentType.uid, plugins[i].content_types) && helper.pluginChecker(lang.code, plugins[i].languages) && helper.pluginChecker(_environment, plugins[i].environments) && helper.pluginChecker(_server, plugins[i].servers) && plugins[i][action]) {
                if (plugins[i][data.action]) {
                    _loadPlugins.push(function(i){
                        return function(cb) {
                            plugins[i][data.action](_data, cb);
                        };
                    }(i));
                }
            }
            async.series(_loadPlugins, function (err, res) {
                if (err) {
                    callback(err, null);
                } else {
                    switch(data.type) {
                        case _types.entry:
                            callback(null, {"entry": data.entry, "content_type": data.content_type});
                            break;
                        case _types.asset:
                            callback(null, {"asset": data.asset});
                            break;
                    };
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
