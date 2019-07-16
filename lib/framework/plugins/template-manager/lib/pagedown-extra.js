/*!
 * contentstack-express
 * Copyright (c) Contentstack
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */

global.Markdown = {};
require('./Markdown.Extra.js');
// eslint-disable-next-line no-undef
exports.Extra = Markdown.Extra;
