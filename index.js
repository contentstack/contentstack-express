const Sync = require('./lib');
const Connector = require('./connector')
const syncInstance = Sync();

const Conn = new Connector(syncInstance)