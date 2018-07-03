## contentstack-sync

### The contentstack-sync module is used to synchronize all the previous and current publish content from Contentstack.

Run the following command in a Terminal or Command Prompt.

## Install and use it

```bash
npm install --save contentstack-sync
```

## Synchronize all the publish content locally. You must provide your config details.

```javascript
const sync = require('contentstack-sync');
sync.start(config);
```

## Synchronize all the previous published content locally. You must provide your config details.

```javascript
const sync = require('contentstack-sync');
sync.init(config);
```

Parameters:

 * `config`, an Object


## License
Copyright © 2017-2018 [Contentstack.com](https://www.contentstack.com/). All Rights Reserved.
  