/*!
 * contentstack-express
 * copyright (c) Built.io Contentstack
 * MIT Licensed
 */

'use strict';

var context = {
	// initialize _context_data object in process.domain
	"context": function () {
		return (process.domain._context_data = process.domain._context_data || {});
	},
	// set key value pair context data
	"set": function (key, value) {
		return context.context()[key] = value;
	},
	// get value from context data
	"get": function (key) {
		return context.context()[key];
	}
};

module.exports = context;