/*!
 * contentstack-express
 * copyright (c) Contentstack
 * MIT Licensed
 */

'use strict';

/**
 * Module Dependencies.
 */
module.exports = {
  router: {
    content_type_uid: '_routes'
  },
  'template-manager': {
    defaults: {
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