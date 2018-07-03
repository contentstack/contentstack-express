/**
 * Refer this block for find & fetch
 * return key for fetch is: asset, entry, content_type {object}
 * return key for find is: assets, entries, content_types {collection}
 */
let EventEmitter = require('events').EventEmitter;
let observer_instance = null;
class observable extends EventEmitter {
    constructor(sync) {
            super();
            //starts the sync process
            if (sync === 'initial') {
                let Sync = require('../sync');
                new Sync();
            } else if (sync === 'sync') {
                require('./index');
            }
            observer_instance = this;
        }
        // for error handle
    onError() {
        observer_instance.on('error', (error) => {
            if (error) {
                process.exit(0);
            }
        })
    }

    //publish entry/asset
    publish(data, callback) {
        observer_instance.emit('publish', data, (status) => {
            return callback(status);
        });
    }

    //unpublish entry/asset
    unpublish(data, callback) {
        observer_instance.emit('unpublish', data, (status) => {
            return callback(status);
        });
    }

    //remove entry/asset
    remove(data, callback) {
        observer_instance.emit('remove', data, (status) => {
            return callback(status);
        });
    }

    //delete entry/asset
    delete(data, callback) {
        observer_instance.emit('delete', data, (status) => {
            return callback(status);
        });
    }

    //download rte asset
    downloadAssets(data, callback) {
        observer_instance.emit('downloadAssets', data, (status) => {
            return callback(status);
        });
    }

    //use for find assets data
    findData(data, callback) {
        observer_instance.emit('find', data, (status) => {
            return callback(status);
        });
    }

    //backup 
    backup(data, callback) {
        observer_instance.emit('backup', data, (status) => {
            return callback(status);
        });
    }

}

module.exports = observable;