const _ = require('lodash');
const path = require('path');

const defaultConfig = require('./default');
let configInstance = null;

module.exports = (config) => {
    if (_.isPlainObject(config)) {
        class Config {
            constructor(_config) {
                try {
                    if (!configInstance) {
                        let __config = _.merge(defaultConfig, _config);
                        let env = __config['environment'];
                        __config['environment'] = process.env.NODE_ENV || env || "development";

                        let server = __config['server'];
                        __config['server'] = process.env.SERVER || process.env.server || server || 'default';
                        __config['path'] = (__config['path']) ? __config['path'] : {};
                        let logs = __config['path']['logs'];


                        if (logs) {
                            let log_path = path.resolve(logs)
                            __config['path']['logs'] = log_path || process.env.SITE_PATH || process.cwd();
                        } else {
                            __config['path']['logs'] = process.env.SITE_PATH || process.cwd();
                        }

                        this._config = __config;
                        configInstance = this;
                    }
                    return configInstance;
                } catch (err) {
                    console.log('Something went wrong while getting config', (err.message || err.stack));
                }
            }

            get(key) {
                return key.split('.').reduce((o, x) => {
                    if (o && typeof o[x] !== 'undefined') return o[x];
                    return undefined;
                }, this._config);
            }

            set(key, value) {
                let __config = this._config;
                let list = key.split('.'),
                    sub_key = {},
                    parent_key = {},
                    flag = true;

                if (key == list[0]) {
                    __config[key] = value
                } else {
                    list.map((val) => {
                        if (_.has(__config, val) && flag) {
                            sub_key = __config[val];
                            parent_key = __config[val];
                            flag = false;
                        } else {
                            if (_.isEmpty(parent_key)) {
                                __config[key] = value
                            } else {
                                if (val == list[list.length - 1]) {
                                    sub_key[val] = value;
                                } else {
                                    if (sub_key[val] === undefined) {
                                        sub_key[val] = {};
                                        sub_key = sub_key[val]
                                    } else {
                                        sub_key = sub_key[val]
                                    }
                                }
                            }
                        }
                    });
                }
            }
        }

        return new Config(config);
    } else {
        return configInstance;
    }

}