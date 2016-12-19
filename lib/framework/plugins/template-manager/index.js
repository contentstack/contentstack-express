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
    pagedown = require("pagedown"),
    pagedownExtra = require("./lib/pagedown-extra").Extra,
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
            viewsPath = config.get('path.templates'),
            options = TemplateManager.options.defaults[module] || {};

        // merging the options with the default of the system
        _.merge(options, config.get('view.options') || {});

        if(module == "swig") {
            options.loader = engine.loaders.fs(viewsPath);
            engine.setDefaults(options);

            // Custom filters for HTML( MD to HTML )
            engine.setFilter('toHtml', function (markdown) {
                return (markdown) ? converter.makeHtml(markdown) : markdown;
            });

            engine.setFilter('toSafeHtml', function (markdown) {
                return (markdown) ? safeConverter.makeHtml(markdown) : markdown;
            });

            // set the templates to cache false
            if(config.get('environment') == "development") engine.setDefaults({cache: false});
            // set the templates to default look up directory
            app.set('views', path.join(viewsPath, 'pages'));
        } else if(module == "nunjucks") {
            options.express = app;
            var env = engine.configure(viewsPath, options);

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
                var _templatePath = path.join(config.get('path.templates'), "pages"),
                    viewConfig = config.get('view'),
                    isSingle = (data.content_type.singleton === false && data.content_type.options && data.content_type.options.url_pattern) ? false : true;

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
                        case "swig":
                            HTML = fs.readFileSync(path.join(__dirname, module + ".html"), 'utf8');
                            flag = (!(fs.existsSync(_top_html_path) || (fs.existsSync(_folder_path) && fs.existsSync(_index_html_path))));
                            break;
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
                            case "swig":
                            case "nunjucks":
                                var generator = function (tabs, prefix, schema) {
                                    content += tabs + "<ul>";
                                    for (var i = 0, _i = schema.length; i < _i; i++) {
                                        var field = schema[i],
                                            type = field.data_type;
                                        var markdown = (field.field_metadata && field.field_metadata.markdown);
                                        if (schema[i].multiple) {
                                            var _temp = (prefix + "_" + field.uid).replace(/\./g, '_');
                                            content += tabs + "<li><b>" + field.display_name + ":</b>";
                                            content += tabs + "\t{% set " + _temp + " = " + prefix + "." + field.uid + " %}";
                                            content += tabs + "\t<ul>";
                                            content += tabs + "\t{% for _" + _temp + " in " + _temp + " -%}";
                                            switch (type) {
                                                case "text":
                                                case "number":
                                                case "boolean":
                                                case "isodate":
                                                    content += tabs + "\t\t<li>{{ _" + _temp + ((markdown) ? " | toHtml" : "") + " }}</li>";
                                                    break;
                                                case "file":
                                                    if (field.field_metadata && field.field_metadata.image) {
                                                        content += tabs + "\t\t\t<li><img src='{{getAssetUrl(_" + _temp + ")}}'></li>";
                                                    } else {
                                                        content += tabs + "\t\t\t<li><a href='{{getAssetUrl(_" + _temp + ")}}'>{{_" + _temp + ".filename}}</a></li>";
                                                    }
                                                    break;
                                                case "link":
                                                    content += tabs + "\t\t<li><a href='{{ _" + _temp + ".href }}'>{{ _" + _temp + ".title }}</a></li>";
                                                    break;
                                                case "group":
                                                    content += tabs + "\t\t<li><b>{{loop.index}}</b>:<br>";
                                                    generator(tabs + "\t\t\t", "_" + _temp, field.schema);
                                                    content += tabs + "\t\t</li>";
                                                    break;
                                            }
                                            content += tabs + "\t{%- endfor %}";
                                            content += tabs + "\t</ul>";
                                            content += tabs + "</li>";
                                        } else {
                                            switch (type) {
                                                case "text":
                                                case "number":
                                                case "boolean":
                                                case "isodate":
                                                    content += tabs + "<li><b>" + field.display_name + ":</b> {{" + prefix + "." + field.uid + ((markdown) ? " | toHtml" : "") + "}}</li>";
                                                    break;
                                                case "file":
                                                    content += tabs + "<li>";
                                                    if (field.field_metadata && field.field_metadata.image) {
                                                        content += tabs + "\t<b>" + field.display_name + "(url):</b> <img src='{{getAssetUrl(" + prefix + "." + field.uid + ")}}'>";
                                                    } else {
                                                        content += tabs + "\t<b>" + field.display_name + "(url):</b> <a href='{{getAssetUrl(" + prefix + "." + field.uid + ")}}'>{{" + prefix + "." + field.uid + ".filename}}</a>";
                                                    }
                                                    content += tabs + "</li>";
                                                    break;
                                                case "link":
                                                    content += tabs + "<li><b>" + field.display_name + ":</b> <a href='{{" + prefix + "." + field.uid + ".href}}'>{{" + prefix + "." + field.uid + ".title}}</a></li>";
                                                    break;
                                                case "reference":
                                                    var _ref = (prefix + "_" + field.uid).replace(/\./g, '_');
                                                    content += tabs + "<li><b>" + field.display_name + ":</b>";
                                                    content += tabs + "\t{% set " + _ref + " = " + prefix + "." + field.uid + " %}";
                                                    content += tabs + "\t<ul>";
                                                    content += tabs + "\t{% for _" + _ref + " in " + _ref + " -%}";
                                                    content += tabs + "\t\t<li>{{ _" + _ref + ".title }}</li>";
                                                    content += tabs + "\t{%- endfor %}";
                                                    content += tabs + "\t</ul>";
                                                    content += tabs + "</li>";
                                                    break;
                                                case "group":
                                                    content += tabs + "<li><b>" + field.display_name + "</b>:<br>";
                                                    generator(tabs + "\t", prefix + "." + field.uid, field.schema);
                                                    content += tabs + "</li>";
                                                    break;
                                            }
                                        }
                                    }
                                    content += tabs + "</ul>";
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
