var _ = require('lodash');

module.exports.updateReferences = function (content_type, entry) {
    if (content_type && content_type.schema && entry) {
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
        find(content_type.schema, entry);
    }
    return entry;
};