/*!
 * contentstack-express
 * copyright (c) Built.io Contentstack
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */
var utils =  require('./../../../utils/index'),
	helper = require('./../../../sync/helper');

module.exports = function Router() {
	var db = utils.db,
        options = Router.options;

	Router.beforePublish = function (data, next) {
		try {
			if (data && data.entry && typeof data.entry.url === "string" && data.content_type && data.content_type.uid) {
				var body = {
					"content_type": {
						"uid": data.content_type.uid
					},
					"entry": {
						"url": data.entry.url,
						"uid": data.entry.uid
					}
				};
				if(!data.content_type.singleton) {
					body.entry.title = data.entry.title || data.entry.uid;
					body.entry.created_at = data.entry.created_at;
					// if the entry already has the url don't calculate in case of multiple
					body = helper.updateUrl(body, data.content_type);
				}
				db
					.ContentType(options.content_type_uid)
					.language(data.language.code)
					.Entry(data.entry.uid)
					.update(body)
					.then(function() {
						next();
					}, next);
			} else {
				next();
			}
		} catch(error) {
			next(error);
		}
	};

	Router.beforeUnpublish = function (data, next) {
		if (data && data.entry && data.entry.uid && data.content_type && data.content_type.uid) {
			db.ContentType(options.content_type_uid)
				.language(data.language.code)
				.Entry(data.entry.uid)
				.remove()
				.then(function(done) {
					next();
				}, next);
		} else {
			next();
		}
	};
};
