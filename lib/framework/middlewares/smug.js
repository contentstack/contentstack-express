/*!
 * contentstack-express
 * copyright (c) Built.io Contentstack
 * MIT Licensed
 */

'use strict';

/**
 * search for the requested route in the system.
 */
module.exports = function (utils) {
	var db = utils.db;
	return function smug(req, res, next) {
		var lang = req.contentstack.get('lang'),
			Query1 = db.ContentType('_routes').Query().where('entry.url', lang.url),
			Query2 = db.ContentType('_routes').Query().where('entry.url', req._contentstack.parsedUrl);

		db
			.ContentType('_routes')
			.language(lang.code)
			.Query()
			.or(Query1, Query2)
			.toJSON()
			.findOne()
			.then(function (data) {
				if (data && typeof data === "object") {
					db
						.ContentType(data.content_type.uid)
						.language(lang.code)
						.Entry(data.entry.uid)
						.toJSON()
						.fetch()
						.then(function (entry) {
							req.contentstack.set('content_type', data.content_type.uid, true);
							req.contentstack.set('entry', entry);
							next();
						}, function (err) {
							next(err);
						});
				} else {
					next();
				}
			}, function (err) {
				next();
			});
	};
};