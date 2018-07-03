/*!
 * contentstack-sync
 * copyright (c) Contentstack.com
 * MIT Licensed
 */

'use strict';

/*!
 * Module dependencies
 */

const config = require('./../config')(),
    socket = require('./../../listener'),
    Sync = require('./sync');
module.exports = (() => {
    try {
        if (typeof config === 'object') {
            if (!(config.get('contentstack.api_key') && config.get('contentstack.access_token'))) {
                throw new Error("Contentstack details are missing.");
            }
            // initialize queue array
            let q = [],
                isProgress = false;

            // proceed next queue if present
            let next = function() {
                if (q.length > 0) {
                    this.start(q.shift());
                } else {
                    isProgress = false;
                }
            };

            // start sync-utility
            const sync = new Sync(next);

            next.bind(sync);

            // synchronize all requests through queue
            let proceed = ((sync) => {
                return function(message, locale) {
                    q.push({ "message": message, "lang": locale });
                    if (!isProgress) {
                        sync.start(q.shift());
                        isProgress = true;
                    }
                };
            }).call(null, sync);
            socket(proceed);
        }
    } catch (e) {
        console.error("Could not start the script. Error: " + e.message, e.stack);
        process.exit(0);
    }
})();