# Contentstack provider

The following readme is divided into the following sections:
  - Requiring the provider module
  - Configuration
  - Enhancements over contentstack-express
  - Bugs

# Requiring the provider module
1. Using the provider only for fetching content
``` js
const Provider = require('contentstack-provider');
const provider = new Provider();
```
2. Using the provider and interacting with its listeners
``` js
const Provider = requrie('contentstack-provider');
// sync is an instance, who's class inherits EventEmitter
const provider = new Provider(sync);
```
>> Note: By default, the *'provider'* instance exports *'db'* and *'query_builder'* instances. events, db methods and querybuilder are described below.

You can also:
  - Set and get configurations separately
 ``` js
// Pass configuration such as storage, language overrides here
// This overrides the configuration during runtime, thus use it carefully!
provider.setConfig(config);
// ** left blank **
// For fetching provider configurations, you can use provider.getConfig(key)
provider.getConfig(key);
 ```
  - Exporting listener << Implementation put on hold >>

## Configuration: Basic
Please check above on passing config into the provider module.
``` js
{   
    // language configuration
    languages: [
        {
            code: 'en-us',
            relative_url_prefix: '/',
        },
        {
            code: 'ja-jp',
            relative_url_prefix: '/jp'
        }
    ],
    // storage configuration
    storage: {
        provider: 'filesystem',
        base_dir: '../my-custom-dir'
    },
    // logger configuration
    logs: {
        console: true,
        path: './_log_dir'
    }    
    ...
}
```
### Configuration: Extended
``` js
{
    storage: {
        assets: {
            keys_delete: [], // keys that you want deleted when asset is saved
            pattern: '/assets/:uid/:filename', // Asset storage pattern. {{Testing pending}}
        },
        content: {
            keys_delete: []
        }
    },
    logs: {
        error: {
            name: '',
            level: 'info',
            console: true,
            timestamp: true,
            path: './_logs/errors/'
        },
        // Other keys include: provider, listener and debugger
        ...
    },
    ...
            
```
