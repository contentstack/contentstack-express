'use strict';

/**
 * Module Dependencies.
 */

module.exports = exports = {
    router: {
        content_type_uid: "_routes"
    },
    "template-manager": {
        defaults: {
            swig: {
                autoescape: false
            },
            nunjucks: {
                autoescape: false,
                throwOnUndefined: false,
                trimBlocks: false,
                lstripBlocks: false,
                watch: true,
                noCache: true
            }
        }
    }
};
