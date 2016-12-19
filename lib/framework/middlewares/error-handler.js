/*!
 * contentstack-express
 * copyright (c) Built.io Contentstack
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */
var fs = require('graceful-fs'),
	path = require('path'),
	_ = require('lodash');

/**
 * Error handler
 */
module.exports = function (utils) {
	var config = utils.config,
		db = utils.db;
	var notFound = fs.readFileSync(path.join(__dirname, './../static/404.html'), 'utf8'),
		error = fs.readFileSync(path.join(__dirname, './../static/500.html'), 'utf8');

	var _path = path.join(config.get('path.templates'), 'pages'),
		ext = config.get('view.extension'),
		templates;

	return function errorHandler(err, req, res, next) {
		try {
			var statusCode = err.status || err.status_code || err.code || 500,
				template, data,
                status = statusCode.toString();

			var lang = req.contentstack.get('lang').code;

			if (lang && fs.existsSync(path.join(_path, status, lang, 'index.' + ext))) {
				// for language based templates
				template = path.join(_path, status, lang, 'index.' + ext);
				// for templates with form_id/index.html or form_id.html
			} else if (fs.existsSync(path.join(_path, status, 'index.' + ext))) {
				template = path.join(_path, status, 'index.' + ext);
			} else if (fs.existsSync(path.join(_path, status + '.' + ext))) {
				template = path.join(_path, status + '.' + ext);
			}

			if (template) {
				db
                    .ContentType(status)
                    .Query()
					.language(lang)
					.toJSON()
					.findOne()
					.then(function (data) {
						// consistent data for all the pages
						var result = {
							entry: data || {}
						};
						_.merge(result, req._contentstack);
                        // to merge the context data
						_.merge(result, req.entry);
						result.error = result.err;
						utils.context.set('entry', result.entry);
						res.status(statusCode).render(template, result);
					}, function (err) {
						throw err;
					});
			} else {
				switch (statusCode) {
					case 404:
						data = notFound;
						break;
					case 500:
						data = error;
						break;
					default :
						data = err.message;
				}
                utils.access.error("Error encountered: ", ((err) ? err.message : err));
				res.status(statusCode).send(data);
			}
		} catch (error) {
            utils.access.error("Error encountered: ", ((err) ? err.message : err));
			res.status(500).send(error);
		}
	};
};
