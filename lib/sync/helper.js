/**
 * Module dependencies.
 */
const path = require('path'),
    url = require('url'),
    _ = require('lodash'),
    mkdirp = require('mkdirp');

let config = require('./../config')(),
    _types = config.get('contentstack.types'),
    assetDownloadFlag = config.get('assets.download');

let helper = module.exports = {};

// remove extra and unwanted keys from entry object
helper.deleteKeys = (_entry) => {
    let keys = ["ACL", "publish_details"],
        entry = _entry.object || _entry,
        d = new Date();

    entry.uid = (entry._metadata && entry._metadata.uid) ? entry._metadata.uid : entry.uid;
    entry.published_at = d.toISOString();
    return _.omit(entry, keys);
};

// update references in entry object
helper.updateReferences = (data) => {
    if (data && data.schema && data.entry) {
        let parent = [];
        let update = (parent, form_id, entry) => {
            let _entry = entry,
                len = parent.length;
            for (let j = 0; j < len; j++) {
                if (_entry && parent[j]) {
                    if (j == (len - 1) && _entry[parent[j]]) {
                        if (form_id !== '_assets') {
                            _entry[parent[j]] = {values: _entry[parent[j]], _content_type_id: form_id};
                        } else {
                            if (_entry[parent[j]] instanceof Array) {
                                let assetIds = [];
                                for (let k = 0; k < _entry[parent[j]].length; k++) {
                                    assetIds.push(_entry[parent[j]][k]['uid'])
                                }
                                _entry[parent[j]] = {values: assetIds, _content_type_id: form_id};
                            } else {
                                _entry[parent[j]] = {values: _entry[parent[j]]['uid'], _content_type_id: form_id};
                            }
                        }
                    } else {
                        _entry = _entry[parent[j]];
                        let _keys = _.clone(parent).splice(eval(j + 1), len);
                        if (_entry instanceof Array) {
                            for (let i = 0, _i = _entry.length; i < _i; i++) {
                                update(_keys, form_id, _entry[i]);
                            }
                        } else if (!_entry instanceof Object) {
                            break;
                        }
                    }
                }
            }
        };
        let find = (schema, entry) => {
            for (let i = 0, _i = schema.length; i < _i; i++) {
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
helper.replaceAssetsUrl = (_assets, content_type, entry) => {
    if (content_type && content_type.schema && entry) {
        let parent = [];
        let replace = (parent, schema, entry) => {
            let _entry = entry,
                len = parent.length;
            for (let j = 0; j < len; j++) {
                if (j == (len - 1) && _entry[parent[j]]) {
                    if (_entry[parent[j]] instanceof Array) {
                        for (let i = 0, _i = _entry[parent[j]].length; i < _i; i++) {
                            replace([i], schema, _entry[parent[j]]);
                        }
                    } else {
                        switch (schema.data_type) {
                            case "file":
                                _entry[parent[j]] = _assets[_entry[parent[j]].uid];
                                break;
                            case "text":
                                let _matches, regex, __entry;
                                //for the old contentstack
                                if (schema && schema.field_metadata && schema.field_metadata.markdown) {
                                    regex = new RegExp('https://(dev-new-|stag-new-|)(contentstack-|)api.(built|contentstack).io/(.*?)/download(.*?)uid=([a-z0-9]+[^&\?\s\n])((.*)[\n\s]?)', 'g');
                                } else {
                                    regex = new RegExp('https://(dev-new-|stag-new-|)(contentstack-|)api.(built|contentstack).io/(.*?)/download(.*?)uid=([a-z0-9]+[^\?&\'"])(.*?)', 'g');
                                }
                                __entry = _entry[parent[j]].slice(0);
                                while ((_matches = regex.exec(_entry[parent[j]])) !== null) {
                                    if (_matches && _matches.length) {
                                        let download_id = url.parse(_matches[0]).pathname.split('/').slice(1).join('/'),
                                            obj = _assets[download_id];
                                        if (obj && obj['url'] && obj['url'] == _matches[0]) __entry = (schema && schema.field_metadata && schema.field_metadata.markdown) ? __entry.replace(_matches[0], encodeURI(obj._internal_url) + "\n") : __entry.replace(_matches[0], obj._internal_url);
                                    }
                                }
                                _entry[parent[j]] = __entry;

                                //for the new contentstack
                                let _matches2, regex2, __entry2;
                                if (schema && schema.field_metadata && schema.field_metadata.markdown) {
                                    regex2 = new RegExp('https://(dev-|stag-|)(assets|images).contentstack.io/v[\\d]/assets/(.*?)/(.*?)/(.*?)/download', 'g');
                                } else {
                                    regex2 = new RegExp('https://(dev-|stag-|)(assets|images).contentstack.io/v[\\d]/assets/(.*?)/(.*?)/(.*?)/download', 'g');
                                }
                                __entry2 = _entry[parent[j]].slice(0);
                                while ((_matches2 = regex2.exec(_entry[parent[j]])) !== null) {
                                    if (_matches2 && _matches2.length) {
                                        let download_id = url.parse(_matches2[0]).pathname.split('/').slice(4).join('/'),
                                            _obj = _assets[download_id];
                                        if (_obj && _obj['url'] && _obj['url'] == _matches2[0]) __entry2 = (schema && schema.field_metadata && schema.field_metadata.markdown) ? __entry2.replace(_matches2[0], encodeURI(_obj._internal_url) + "\n") : __entry2.replace(_matches2[0], _obj._internal_url);
                                    }
                                }
                                _entry[parent[j]] = __entry2;
                                break;
                        }
                    }
                } else {
                    _entry = _entry[parent[j]];
                    let _keys = _.clone(parent).splice(eval(j + 1), len);
                    if (_entry instanceof Array) {
                        for (let i = 0, _i = _entry.length; i < _i; i++) {
                            replace(_keys, schema, _entry[i]);
                        }
                    } else if (typeof _entry != "object") {
                        break;
                    }
                }
            }
        };
        let find = (schema, entry) => {
            for (let i = 0, _i = schema.length; i < _i; i++) {
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
helper.getAssetsIds = (data) => {
    if (data && data.content_type && data.content_type.schema && data.entry) {
        let parent = [],
            assetsIds = [];
        let _get = (schema, _entry) => {
            switch (schema.data_type) {
                
                case "text":
                    // for v2 stack
                    let _matches, regex;
                    if (schema && schema.field_metadata && schema.field_metadata.markdown) {
                        regex = new RegExp('https://(dev-new-|stag-new-|)(contentstack-|)api.(built|contentstack).io/(.*?)/download(.*?)uid=([a-z0-9]+[^\?&\s\n])((.*)[\n\s]?)', 'g');
                    } else {
                        regex = new RegExp('https://(dev-new-|stag-new-|)(contentstack-|)api.(built|contentstack).io/(.*?)/download(.*?)uid=([a-z0-9]+[^\?&\'"])(.*?)', 'g');
                    }
                    while ((_matches = regex.exec(_entry)) !== null) {
                        if (_matches && _matches.length) {
                            let assetObject = {};
                            if (_matches[6]) assetObject['uid'] = _matches[6];
                            if (_matches[0]) {
                                assetObject['url'] = _matches[0];
                                assetObject['download_id'] = url.parse(_matches[0]).pathname.split('/').slice(1).join('/')
                            }
                            assetsIds.push(assetObject);
                        }
                    }

                    // for v3.x stack
                    let _matches2, regex2;
                    if (schema && schema.field_metadata && schema.field_metadata.markdown) {
                        regex2 = new RegExp('(https://(dev-|stag-|)(assets|images).contentstack.io/v[\\d]/assets/(.*?)/(.*?)/(.*?)/(.*))', 'g');
                    } else {
                        regex2 = new RegExp('[\"](https://(dev-|stag-|)(assets|images).contentstack.io/v[\\d]/assets/(.*?)/(.*?)/(.*?)/(.*?))[\"]', 'g');
                    }
                    while ((_matches2 = regex2.exec(_entry)) !== null) {
                        if (_matches2 && _matches2.length) {
                            let _assetObject = {},
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
        let get = (parent, schema, entry) => {
            let _entry = entry,
                len = parent.length;
            for (let j = 0; j < len; j++) {
                _entry = _entry[parent[j]];
                if (j == (len - 1) && _entry) {
                    if (_entry instanceof Array) {
                        for (let i = 0, _i = _entry.length; i < _i; i++) {
                            _get(schema, _entry[i]);
                        }
                    } else {
                        _get(schema, _entry);
                    }

                } else {
                    let _keys = _.clone(parent).splice(eval(j + 1), len);
                    if (_entry instanceof Array) {
                        for (let i = 0, _i = _entry.length; i < _i; i++) {
                            get(_keys, schema, _entry[i]);
                        }
                    } else if (typeof _entry != "object") {
                        break;
                    }
                }
            }
        };
        let find = (schema, entry) => {
            for (let i = 0, _i = schema.length; i < _i; i++) {
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
        return assetsIds;
    }
};

// get message
helper.message = (err) => {
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
