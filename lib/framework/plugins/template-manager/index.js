/*!
 * contentstack-express
 * copyright (c) Built.io Contentstack
 * MIT Licensed
 */

"use strict";

/*!
 * Module dependencies
 */
var _ = require('lodash'),
    fs = require('graceful-fs'),
    path = require('path'),
    pagedown = require('./lib/pagedown/node-pagedown'),
    pagedownExtra = require('./lib/pagedown-extra').Extra,
    converter = new pagedown.Converter(),
    safeConverter = new pagedown.getSanitizingConverter(),
    utils =  require('./../../../utils/index'),
    dateFormatter = require('./lib/dateformatter');

// markdown support Just Same As UI
pagedownExtra.init(converter, {extensions: "all"});
pagedownExtra.init(safeConverter, {extensions: "all"});

module.exports = function TemplateManager() {
    var config = utils.config;

    TemplateManager.templateExtends = function(engine, app) {
        var module = config.get('view.module'),
            viewsPaths = config.get('path.templates'),
            options = TemplateManager.options.defaults[module] || {};

        // merging the options with the default of the system
        _.merge(options, config.get('view.options') || {});

      if(module == "nunjucks") {
            options.express = app;
            var env = engine.configure(viewsPaths, options);

            env.addFilter('toHtml', function(markdown) {
                return (markdown) ? converter.makeHtml(markdown) : markdown;
            });

            env.addFilter('toSafeHtml', function (markdown) {
                return (markdown) ? safeConverter.makeHtml(markdown) : markdown;
            });

            env.addFilter('json', function (object) {
                try {
                    return (object && typeof object === 'object') ? JSON.stringify(object) : object;
                } catch(err) {
                    console.error('Exception in json filter', err.message);
                }
            });

            /**
             * Format a date or Date-compatible string.
             *
             * @example
             * // now = new Date();
             * {{ now|date('Y-m-d') }}
             * // => 2013-08-14
             * @example
             * // now = new Date();
             * {{ now|date('jS \o\f F') }}
             * // => 4th of July
             *
             * @param  {?(string|date)}   input
             * @param  {string}           format  PHP-style date format compatible string. Escape characters with <code>\</code> for string literals.
             * @param  {number=}          offset  Timezone offset from GMT in minutes.
             * @param  {string=}          abbr    Timezone abbreviation. Used for output only.
             * @return {string}                   Formatted date string.
             */
            env.addFilter('date', function (input, format, offset, abbr) {
                var l = format.length,
                    date = new dateFormatter.DateZ(input),
                    cur,
                    i = 0,
                    out = '';

                if (offset) {
                    date.setTimezoneOffset(offset, abbr);
                }

                for (i; i < l; i += 1) {
                    cur = format.charAt(i);
                    if (cur === '\\') {
                        i += 1;
                        out += (i < l) ? format.charAt(i) : cur;
                    } else if (dateFormatter.hasOwnProperty(cur)) {
                        out += dateFormatter[cur](date, offset, abbr);
                    } else {
                        out += cur;
                    }
                }
                return out;
            });

            engine.getEnvironment = function getEnvironment() {
                return env;
            };
        }
    };

    TemplateManager.beforePublish = function (data, next) {
        try {
            var scaffold = config.get('view.scaffold');
            scaffold = (typeof scaffold === "boolean") ? scaffold : true;
            if (data && data.entry && (data.entry.url || (data.content_type.options && data.content_type.options.is_page)) && data.content_type && data.content_type.uid && data.content_type.schema && data.content_type.schema.length && scaffold) {
                // check if templates folder inside view directory exists or not
                var _templatePath = path.join(config.get('path.templates')[0], "pages"),
                    viewConfig = config.get('view'),
                    isSingle = (data.content_type.options && data.content_type.options.singleton === false && data.content_type.options.url_pattern) ? false : true;

                if (fs.existsSync(_templatePath)) {
                    var HTML = "",
                        module = viewConfig.module,
                        ext = viewConfig.extension,
                        _fileName = (isSingle) ? "index" : "index",
                        _folder_path = path.join(_templatePath, data.content_type.uid),
                        _top_html_path = path.join(_templatePath, data.content_type.uid + "." + ext),
                        _index_html_path = path.join(_templatePath, data.content_type.uid, _fileName + "." + ext),
                        _list_html_path,
                        flag;

                    if(!fs.existsSync(_folder_path)) fs.mkdirSync(_folder_path, "0755");

                    if (!isSingle) _list_html_path = path.join(_templatePath, data.content_type.uid, "list." + ext);
                    switch (module) {
                        case "nunjucks":
                            HTML = fs.readFileSync(path.join(__dirname, module + ".html"), 'utf8');
                            flag = (!(fs.existsSync(_index_html_path)));
                            break;
                        default:
                            fs.readFileSync(path.join(__dirname, "default.html"), 'utf8');
                    }
                    // checking the condition based on the template engine
                    if (flag) {
                        var content = "";
                        switch (module) {
                            case "nunjucks":
                                var generator = function (tabs, prefix, schema, blocks) {
                                    for (var i = 0, _i = schema.length; i < _i; i++) {
                                        var field = schema[i],
                                            type = field.data_type,
                                            _tmp_field;

                                        if (blocks && typeof blocks === 'string')
                                            _tmp_field = blocks + "." + field.uid;
                                        else
                                            _tmp_field = field.uid;

                                        var markdown = (field.field_metadata && field.field_metadata.markdown);
                                        if (schema[i].multiple) {
                                            content += tabs + "<div class='field'>";
                                            var _temp = (prefix + "_" + _tmp_field).replace(/\./g, '_');
                                            content += tabs + "<div class='key'>" + field.display_name + "</div>";
                                            content += tabs + "\t{% set " + _temp + " = " + prefix + "." + _tmp_field + " %}";
                                            content += tabs + "\t{% for _" + _temp + " in " + _temp + " -%}";
                                            content += tabs + " <div class='group-field'> ";

                                            switch (type) {
                                                case "text":
                                                case "number":
                                                case "boolean":
                                                case "isodate":
                                                    content += tabs + "\t\t<div class='value'>{{ _" + _temp + ((markdown) ? " | toHtml" : "") + " }}</div>";
                                                    break;
                                                case "file":
                                                    if (field.field_metadata && field.field_metadata.image) {
                                                        content += tabs + "\t\t\t<img src='{{getAssetUrl(_" + _temp + ")}}'>";
                                                    } else {
                                                        content += tabs + "\t\t\t<div class='file'><a href='{{getAssetUrl(_" + _temp + ")}}'>{{_" + _temp + ".filename}}</a></div>";
                                                    }
                                                    break;
                                                case "link":
                                                    content += tabs + "\t\t<div class='link'><a href='{{ _" + _temp + ".href }}'>{{ _" + _temp + ".title }}</a></div>";
                                                    break;
                                                case "group":
                                                    if (blocks && typeof blocks === 'string')
                                                        generator(tabs + "\t\t\t", "_" + _temp, field.schema);
                                                    else
                                                        generator(tabs + "\t\t\t", "_" + _temp, field.schema);
                                                    break;
                                                case "blocks":
                                                    for (var j = 0; j < field.blocks.length; j++) {
                                                        content += tabs + "{% if _" + _temp + "." + field.blocks[j].uid + " %}";
                                                        content += tabs + "\t\t<div class='field'><div class='key'>" + field.blocks[j].title + "</div>";
                                                        generator(tabs + "\t\t\t", "_" + _temp, field.blocks[j].schema, field.blocks[j].uid);
                                                        content += tabs + "\t\t</div>";
                                                        content += tabs + "{% endif %}";
                                                    }
                                                    break;
                                                default:
                                                    break;
                                            }
                                            content += tabs + " </div>";
                                            content += tabs + "\t{%- endfor %}";
                                            content += tabs + "</div>";
                                        } else {
                                            switch (type) {
                                                case "text":
                                                case "number":
                                                case "boolean":
                                                case "isodate":
                                                    content += tabs + "<div class='field'><div class='key'>" + field.display_name + "</div><div class='value'>{{" + prefix + "." + _tmp_field + ((markdown) ? " | toHtml" : "") + "}}</div></div>";
                                                    break;
                                                case "file":
                                                    content += tabs + "<div class='field'>";
                                                    if (field.field_metadata && field.field_metadata.image) {
                                                        content += tabs + "<div class='key'>" + field.display_name + "(url) </div> <img src='{{getAssetUrl(" + prefix + "." + _tmp_field + ")}}'>";
                                                    } else {
                                                        content += tabs + "\t<div class='key'>" + field.display_name + "(url) </div> <div class='file'><a href='{{getAssetUrl(" + prefix + "." + _tmp_field + ")}}'>{{" + prefix + "." + _tmp_field + ".filename}}</a></div>";
                                                    }
                                                    content += tabs + "</div>";
                                                    break;
                                                case "link":
                                                    content += tabs + "<div class='field'>";
                                                    content += tabs + "<div class='key'>" + field.display_name + "</div><div class='link'> <a href='{{" + prefix + "." + _tmp_field + ".href}}'>{{" + prefix + "." + _tmp_field + ".title}}</a></div>";
                                                    content += tabs + "</div>";
                                                    break;
                                                case "reference":
                                                    var _ref = (prefix + "_" + _tmp_field).replace(/\./g, '_');
                                                    content += tabs + "<div class='field'>";
                                                    content += tabs + "<div class='key'>" + field.display_name + "</div>";
                                                    content += tabs + "\t{% set " + _ref + " = " + prefix + "." + _tmp_field + " %}";
                                                    content += tabs + "\t{% for _" + _ref + " in " + _ref + " -%}";
                                                    content += tabs + "\t\t<div class='value'>{{ _" + _ref + ".title }}</div>";
                                                    content += tabs + "\t{%- endfor %}";
                                                    content += tabs + "</div>";
                                                    break;
                                                case "group":
                                                    content += tabs + "<div class='field'>";
                                                    content += tabs + "<div class='key'>" + field.display_name + "</div>";
                                                    content += tabs + "<div class='group-field'>";
                                                    if (blocks && typeof blocks === 'string')
                                                        generator(tabs + "\t", prefix + "." + _tmp_field, field.schema);
                                                    else
                                                        generator(tabs + "\t", prefix + "." + _tmp_field, field.schema);
                                                    content += tabs + "</div>";
                                                    content += tabs + "</div>";
                                                    break;
                                                default:
                                                    console.error(`@\nDefault. i.e. unable to render type.\n`);
                                            }
                                        }
                                    }
                                };
                                generator("\n\t\t\t", "entry", data.content_type.schema);
                                HTML = HTML.replace("_content_", content);
                                break;
                        }
                        if (module == "nunjucks")
                            fs.writeFileSync(_index_html_path, HTML.replace("_path_", _index_html_path));
                        else
                            fs.writeFileSync(_index_html_path, HTML.replace("_path_", _index_html_path));
                    }
                } else {
                    throw new Error("'templates' folder does not exists.");
                }
            }
            next();
        } catch (e) {
            next(e);
        }
    };
};
