const EventEmitter = require('events').EventEmitter;
let observerInstance = null;

class Observer extends EventEmitter {
    constructor() {
            super();
            require('./sync');
            observerInstance = this;
        }
        // for error handle
    onError() {
        observerInstance.on('error', (error) => {
            if (error) {
                process.exit(0);
            }
        })
    }

    //publish entry/asset
    publish(data, callback) {
        observerInstance.emit('publish', data, (status) => {
            return callback(status);
        });
    }

    //unpublish entry/asset
    unpublish(data, callback) {
        observerInstance.emit('unpublish', data, (status) => {
            return callback(status);
        });
    }

    //remove entry/asset
    remove(data, callback) {
        observerInstance.emit('remove', data, (status) => {
            return callback(status);
        });
    }

    //delete entry/asset
    delete(data, callback) {
        observerInstance.emit('delete', data, (status) => {
            return callback(status);
        });
    }

    //download rte asset
    downloadAssets(data, callback) {
        observerInstance.emit('downloadAssets', data, (status) => {
            return callback(status);
        });
    }

    //use for find assets data
    findData(data, callback) {
        observerInstance.emit('find', data, (status) => {
            return callback(status);
        });
    }

    //backup 
    backup(data, callback) {
        observerInstance.emit('backup', data, (status) => {
            return callback(status);
        });
    }

}

module.exports = Observer;