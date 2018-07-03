/*!
 * contentstack-sync
 * copyright (c) Contentstack.com
 * MIT Licensed
 */

'use strict';

let context = {
    // initialize _context_data object in process.domain
    "context": () => {
        return (process.domain._context_data = process.domain._context_data || {});
    },
    // set key value pair context data
    "set": (key, value) => {
        return context.context()[key] = value;
    },
    // get value from context data
    "get": (key) => {
        return context.context()[key];
    }
};

module.exports = context;