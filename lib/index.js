const Observer = require('./observer');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');

module.exports = (config) => {
    const env = process.env.NODE_ENV || 'default';
    let _config = {};
    // Load Configurations
    if (_.isUndefined(config) || _.isEmpty(config)) {

        // if config.js file exists
        if (fs.existsSync(path.join(__dirname, '../', 'config.js'))) {
            _config = require('../config.js');
        } else {
            // check directory
            let _configPath = path.join(__dirname, '../', 'config'),
                envConfig, allConfig;
            if (fs.existsSync(_configPath)) {
                if (fs.existsSync(path.join(_configPath, 'default.js'))) {
                    allConfig = require(path.join(_configPath, 'default.js'))
                }
                if (env) {
                    if (fs.existsSync(path.join(_configPath, env.toLowerCase() + '.js'))) {
                        envConfig = require(path.join(_configPath, env.toLowerCase() + '.js'))

                    }
                }
                _config = _.merge(envConfig || {}, allConfig || {});
            }
        }
    } else {
        _config = config;
    }
    require('./config')(_config); // load config
    // sync process
    return new Observer();
}